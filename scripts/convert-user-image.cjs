// 사용자 제공 이미지 → WebP 변환 (가로형 1200×630 + 정사각형 1200×1200)
// 타겟: 각각 50KB 이하 (검색 썸네일 최적화)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'user-image-original.png');
const OUT_DIR = path.join(__dirname, '..', 'public');

const MAX_BYTES = 50 * 1024; // 50KB 하드캡

/**
 * 주어진 설정으로 WebP 버퍼 생성, 50KB 이하가 될 때까지 품질 하향
 */
async function convertToWebP(width, height, outWebp, outPng, label) {
  async function tryConvert(quality, effort = 6) {
    return await sharp(SRC)
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .webp({ quality, effort, smartSubsample: true })
      .toBuffer();
  }

  let bestBuf = null;
  let bestQ = null;
  for (const q of [78, 72, 66, 60, 55, 50, 45, 40, 35, 30, 25, 20]) {
    const buf = await tryConvert(q, 6);
    const kb = buf.length / 1024;
    console.log(`  [${label}] q=${q} → ${kb.toFixed(1)} KB`);
    if (buf.length <= MAX_BYTES) {
      bestBuf = buf;
      bestQ = q;
      break;
    }
    if (!bestBuf || buf.length < bestBuf.length) {
      bestBuf = buf;
      bestQ = q;
    }
  }

  // 초과 시 effort=0 + 극저품질 재시도
  if (bestBuf.length > MAX_BYTES) {
    console.log(`  [${label}] 50KB 초과 — effort=0 재시도`);
    for (const q of [25, 20, 15, 12, 10]) {
      const buf = await tryConvert(q, 0);
      const kb = buf.length / 1024;
      console.log(`  [${label}] q=${q}(effort0) → ${kb.toFixed(1)} KB`);
      if (buf.length <= MAX_BYTES) {
        bestBuf = buf;
        bestQ = `${q}/effort0`;
        break;
      }
      if (buf.length < bestBuf.length) {
        bestBuf = buf;
        bestQ = `${q}/effort0`;
      }
    }
  }

  const outWebpPath = path.join(OUT_DIR, outWebp);
  fs.writeFileSync(outWebpPath, bestBuf);
  const finalKb = (bestBuf.length / 1024).toFixed(1);
  console.log(`\n✅ [${label}] WebP: ${outWebpPath}`);
  console.log(`   품질=${bestQ}, 크기=${finalKb} KB, ${bestBuf.length <= MAX_BYTES ? '목표 달성 ✅' : '목표 초과 ⚠️'}\n`);

  // PNG 백업 (크롤러 호환성)
  const pngBuf = await sharp(bestBuf)
    .png({ quality: 60, compressionLevel: 9, palette: true, colors: 128 })
    .toBuffer();
  const outPngPath = path.join(OUT_DIR, outPng);
  fs.writeFileSync(outPngPath, pngBuf);
  console.log(`✅ [${label}] PNG(백업): ${outPngPath} (${(pngBuf.length / 1024).toFixed(1)} KB)\n`);
}

(async () => {
  const srcStat = fs.statSync(SRC);
  console.log(`원본: ${(srcStat.size / 1024).toFixed(1)} KB\n`);

  // 1) 가로형 1200×630 (카톡/트위터/페이스북 공유)
  console.log('=== 가로형 1200×630 ===');
  await convertToWebP(1200, 630, 'og-image.webp', 'og-image.png', '가로형');

  // 2) 정사각형 1200×1200 (구글/네이버 검색 카드)
  console.log('=== 정사각형 1200×1200 ===');
  await convertToWebP(1200, 1200, 'og-image-square.webp', 'og-image-square.png', '정사각형');

  console.log('🎉 모든 변환 완료');
})();
