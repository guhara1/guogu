// OG image 생성 — SVG 소스 → PNG/WebP 변환 (바다/야자수 서머 테마, 간다GO)
// 타겟: 1200×630, WebP ≤50KB (검색 썸네일 최적화)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'og-source.svg');
const OUT_DIR = path.join(__dirname, '..', 'public');
const OUT_WEBP = path.join(OUT_DIR, 'og-image.webp');
const OUT_PNG = path.join(OUT_DIR, 'og-image.png');

const MAX_BYTES = 50 * 1024; // 50KB 하드캡
const OG_W = 1200;
const OG_H = 630;

async function tryConvert(quality, effort = 6) {
  const buf = await sharp(SRC)
    .resize(OG_W, OG_H, { fit: 'cover', position: 'centre' })
    .webp({ quality, effort, smartSubsample: true })
    .toBuffer();
  return buf;
}

(async () => {
  const srcStat = fs.statSync(SRC);
  console.log(`원본 SVG: ${(srcStat.size / 1024).toFixed(1)} KB`);

  // 1차: 품질 70부터 시작해서 50KB 이하가 될 때까지 하향
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

  // 여전히 50KB 초과 시 effort=0 + 극저품질 재시도
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
  console.log(`\n✅ WebP 저장: ${OUT_WEBP}`);
  console.log(`   품질=${bestQ}, 크기=${finalKb} KB, ${bestBuf.length <= MAX_BYTES ? '목표 달성 ✅' : '목표 초과 ⚠️'}`);

  // PNG 호환용 (일부 크롤러 호환성)
  const pngBuf = await sharp(OUT_WEBP)
    .png({ quality: 60, compressionLevel: 9, palette: true, colors: 128 })
    .toBuffer();
  fs.writeFileSync(OUT_PNG, pngBuf);
  console.log(`✅ PNG(백업): ${OUT_PNG} (${(pngBuf.length / 1024).toFixed(1)} KB)`);
})();
