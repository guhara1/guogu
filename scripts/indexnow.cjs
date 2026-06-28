// IndexNow 즉시 색인 스크립트
// 빌드된 사이트맵(sitemap-0.xml)에서 URL을 읽어 Bing/Yandex/Naver IndexNow API로 전송
// 구글은 IndexNow를 공식 지원하지 않지만, 색인 큐 가속 효과는 있음
//
// 사용법: npm run build 후 node scripts/indexnow.cjs
// (사이트가 실제 배포된 상태에서 실행해야 함)
const fs = require('fs');
const path = require('path');

// === 설정 ===
const SITE = 'https://guogu-5hy.pages.dev';
const KEY = 'e7fd507d79da7784af698cd1cc2ed9b6';
// IndexNow 엔드포인트 (Bing 운영 — Naver/Yandex 등 다수 엔진 동시 전파)
const ENDPOINT = 'https://api.indexnow.org/IndexNow';
// 한 번에 전송할 URL 수 (IndexNow 권장 10,000 이하, 여기선 안전하게 1,000)
const BATCH = 1000;

function readSitemapUrls() {
  // dist/sitemap-0.xml (Astro @astrojs/sitemap 출력) 파싱
  const candidates = [
    path.join(__dirname, '..', 'dist', 'sitemap-0.xml'),
    path.join(__dirname, '..', 'dist', 'sitemap.xml'),
  ];
  let xml = null;
  let used = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      xml = fs.readFileSync(c, 'utf8');
      used = c;
      break;
    }
  }
  if (!xml) {
    throw new Error('사이트맵 파일을 찾을 수 없습니다. 먼저 npm run build를 실행하세요.');
  }
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log(`사이트맵: ${used}`);
  console.log(`추출된 URL: ${urls.length}개\n`);
  return urls;
}

async function sendBatch(urls) {
  const body = {
    host: 'guogu-5hy.pages.dev',
    key: KEY,
    keyLocation: `${SITE}/${KEY}.txt`,
    urlList: urls,
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

  return { status: res.status, ok: res.ok };
}

(async () => {
  console.log('========================================');
  console.log('  IndexNow 즉시 색인 요청');
  console.log('  사이트:', SITE);
  console.log('========================================\n');

  // 1) 키 파일이 실제 배포되어 있는지 확인 권장
  console.log('⚠️  주의: 이 스크립트는 사이트가 실제 배포된 후 실행해야 합니다.');
  console.log(`   키 파일 확인: ${SITE}/${KEY}.txt\n`);

  const urls = readSitemapUrls();
  if (urls.length === 0) {
    console.log('URL이 없습니다. 종료.');
    return;
  }

  // 2) 배치 전송
  const batches = [];
  for (let i = 0; i < urls.length; i += BATCH) {
    batches.push(urls.slice(i, i + BATCH));
  }

  console.log(`전송 배치: ${batches.length}개 (배치당 최대 ${BATCH} URL)\n`);

  let success = 0;
  let fail = 0;
  for (let i = 0; i < batches.length; i++) {
    process.stdout.write(`[${i + 1}/${batches.length}] ${batches[i].length}개 URL 전송 중... `);
    try {
      const { status, ok } = await sendBatch(batches[i]);
      if (ok || status === 200 || status === 202) {
        console.log(`✅ ${status} (수락됨)`);
        success += batches[i].length;
      } else {
        console.log(`⚠️  HTTP ${status}`);
        fail += batches[i].length;
      }
    } catch (e) {
      console.log(`❌ 오류: ${e.message}`);
      fail += batches[i].length;
    }
  }

  console.log('\n========================================');
  console.log(`  완료: 성공 ${success} / 실패 ${fail}`);
  console.log('========================================');
  console.log('\n📌 안내:');
  console.log(' - IndexNow는 Bing/Yandex/Naver 등에 전파됩니다 (수 분~수 시간 내 반영).');
  console.log(' - 구글은 Search Console에서 수동 색인 요청을 병행하세요.');
  console.log(' - 네이버는 서치어드바이저 → RSS/sitemap 제출 → URL 수집 요청.');
  console.log(` - 키 파일 위치: ${SITE}/${KEY}.txt (온라인 접근 가능해야 함)`);
})();
