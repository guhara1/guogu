// OG image → WebP conversion (target ≤50KB for search thumbnails)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = 'C:/Users/간디/Downloads/ChatGPT Image 2026년 6월 25일 오후 03_54_43.png';
const OUT_DIR = path.join(__dirname, '..', 'public');
const OUT_WEBP = path.join(OUT_DIR, 'og-image.webp');
const OUT_PNG = path.join(OUT_DIR, 'og-image.png');

const MAX_BYTES = 50 * 1024; // 50KB hard cap
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
  console.log(`원본: ${(srcStat.size / 1024).toFixed(1)} KB`);

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
    // 임시 저장(가장 작은 것 보관)
    if (!bestBuf || buf.length < bestBuf.length) {
      bestBuf = buf;
      bestQ = q;
    }
  }

  // 여전히 50KB 초과 시 effort=0(빠른 인코딩) + 더 낮은 품질 재시도
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

  // PNG 호환용 og-image.png 도 생성(일부 크롤러 호환성) — 작게
  const pngBuf = await sharp(OUT_WEBP)
    .png({ quality: 60, compressionLevel: 9, palette: true, colors: 64 })
    .toBuffer();
  fs.writeFileSync(OUT_PNG, pngBuf);
  console.log(`✅ PNG(백업): ${OUT_PNG} (${(pngBuf.length / 1024).toFixed(1)} KB)`);
})();
