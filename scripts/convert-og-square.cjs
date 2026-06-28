// 정사각형 OG 썸네일 생성 — SVG → PNG/WebP (구글/네이버 검색결과 우측 1:1)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'og-square-source.svg');
const OUT_DIR = path.join(__dirname, '..', 'public');
const OUT_WEBP = path.join(OUT_DIR, 'og-image-square.webp');
const OUT_PNG = path.join(OUT_DIR, 'og-image-square.png');

const MAX_BYTES = 50 * 1024; // 50KB 하드캡
const SIZE = 1200;

async function tryConvert(quality, effort = 6) {
  const buf = await sharp(SRC)
    .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
    .webp({ quality, effort, smartSubsample: true })
    .toBuffer();
  return buf;
}

(async () => {
  const srcStat = fs.statSync(SRC);
  console.log(`원본 SVG: ${(srcStat.size / 1024).toFixed(1)} KB`);

  let bestBuf = null;
  let bestQ = null;
  for (const q of [70, 60, 50, 45, 40, 35, 30, 25, 20]) {
    const buf = await tryConvert(q, 6);
    const kb = buf.length / 1024;
    console.log(`  q=${q} → ${kb.toFixed(1)} KB`);
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

  if (bestBuf.length > MAX_BYTES) {
    console.log('50KB 초과 — effort=0 + 극저품질 재시도');
    for (const q of [25, 20, 15, 12, 10]) {
      const buf = await tryConvert(q, 0);
      const kb = buf.length / 1024;
      console.log(`  q=${q}(effort0) → ${kb.toFixed(1)} KB`);
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

  fs.writeFileSync(OUT_WEBP, bestBuf);
  const finalKb = (bestBuf.length / 1024).toFixed(1);
  console.log(`\n✅ WebP(정사각형) 저장: ${OUT_WEBP}`);
  console.log(`   품질=${bestQ}, 크기=${finalKb} KB, ${bestBuf.length <= MAX_BYTES ? '목표 달성 ✅' : '목표 초과 ⚠️'}`);

  const pngBuf = await sharp(OUT_WEBP)
    .png({ quality: 60, compressionLevel: 9, palette: true, colors: 128 })
    .toBuffer();
  fs.writeFileSync(OUT_PNG, pngBuf);
  console.log(`✅ PNG(백업): ${OUT_PNG} (${(pngBuf.length / 1024).toFixed(1)} KB)`);
})();
