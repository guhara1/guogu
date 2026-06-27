// 행정동 데이터 정리 스크립트
// 1) 중복 제거 (동일 동명이 여러 번 나오는 경우)
// 2) 번호동 통합 (xxx제1동, xxx1동, xxx 제1동 → xxx동 단일화)
// 3) 정렬 (가나다순)
const fs = require('fs');
const path = require('path');

// 번호동을 대표동으로 정규화
// 예: "신당제5동" → "신당동", "고덕제1동" → "고덕동", "천호제2동" → "천호동"
//     "xxx 1동" → "xxx동", "xxx1동" → "xxx동" (단, 십/백 단위 동명은 제외)
function normalizeDong(dong) {
  let d = dong.trim();
  // "제N동" 패턴 제거: "신당제5동" → "신당동"
  d = d.replace(/제\s*\d+\s*동$/, '동');
  // " N동" 패턴 제거 (앞에 한글이 있는 경우): "천호1동" → "천호동", "상계 1동" → "상계동"
  // 단, 면/리 단위는 건드리지 않음
  d = d.replace(/(\S)\s*\d+\s*동$/, '$1동');
  // 끝의 "동" 앞 공백 제거
  d = d.replace(/\s+동$/, '동');
  return d;
}

const stats = { totalBefore: 0, totalAfter: 0, changed: [] };

for (const prov of ['seoul', 'gyeonggi', 'incheon']) {
  const filePath = path.join(__dirname, '..', 'src', 'data', prov, 'districts.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  for (const gu of data) {
    if (!gu.dongs || !Array.isArray(gu.dongs)) continue;
    const before = [...gu.dongs];

    // 1) 정규화 + 중복 제거 (순서 유지)
    const seen = new Set();
    const cleaned = [];
    for (const d of before) {
      const norm = normalizeDong(d);
      if (!seen.has(norm)) {
        seen.add(norm);
        cleaned.push(norm);
      }
    }
    // 2) 가나다순 정렬
    cleaned.sort((a, b) => a.localeCompare(b, 'ko'));

    const removed = before.length - cleaned.length;
    if (removed > 0 || JSON.stringify(before) !== JSON.stringify(cleaned)) {
      stats.changed.push({
        prov: prov + '/' + gu.slug,
        name: gu.name,
        before: before.length,
        after: cleaned.length,
        beforeSample: before.slice(0, 8),
        afterSample: cleaned.slice(0, 8),
      });
    }

    stats.totalBefore += before.length;
    stats.totalAfter += cleaned.length;
    gu.dongs = cleaned;
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

console.log('=== 정리 결과 ===');
console.log(`전체 동 수: ${stats.totalBefore} → ${stats.totalAfter} (감소 ${stats.totalBefore - stats.totalAfter})`);
console.log(`변경된 구/시 수: ${stats.changed.length}`);
console.log('\n=== 변경 상세 (최대 15개) ===');
for (const c of stats.changed.slice(0, 15)) {
  console.log(`\n[${c.prov}] ${c.name}: ${c.before} → ${c.after}`);
  console.log(`  전: ${c.beforeSample.join(', ')}`);
  console.log(`  후: ${c.afterSample.join(', ')}`);
}
if (stats.changed.length > 15) {
  console.log(`\n... 외 ${stats.changed.length - 15}개 구/시 추가 변경`);
}
