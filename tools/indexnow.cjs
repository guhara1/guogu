/**
 * IndexNow 즉시 색인 통보 스크립트 (Node.js, 의존성 없음)
 *
 * 사용:
 *   node tools/indexnow.js            # 전체 URL 일괄 통보 (sitemap 기준)
 *   node tools/indexnow.js URL1 URL2  # 특정 URL만 통보
 *
 * 통보 대상: Bing, Naver (IndexNow 프로토콜 참여)
 *   - api.indexnow.org (IndexNow 중앙, 한 번 호출로 Bing/Naver/Yandex 동시 전파)
 *   - www.bing.com/indexnow (Bing 직접)
 *   - searchadvisor.naver.com/indexnow (Naver 직접)
 *
 * 주의: 구글은 IndexNow 미참여. 구글은 Search Console 수동 제출 또는 Indexing API 사용.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const KEY = fs.readFileSync(path.join(__dirname, '..', '.indexnow-key'), 'utf8').trim();
const KEY_LOCATION = `https://zxking-massage.pages.dev/${KEY}.txt`;
const HOST = 'zxking-massage.pages.dev';

// sitemap에서 URL 목록 추출
function getUrlsFromSitemap() {
  const sitemapPath = path.join(__dirname, '..', 'dist', 'sitemap-0.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.error('❌ dist/sitemap-0.xml 없음. 먼저 npm run build 실행.');
    process.exit(1);
  }
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const matches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
  return matches.map((m) => m.replace(/<\/?loc>/g, '')).filter((u) => !u.includes('sitemap'));
}

// IndexNow POST 요청 (URL 리스트 전송)
function postIndexNow(endpoint, urls) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList: urls,
    });

    const url = new URL(endpoint);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 30000,
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.write(payload);
    req.end();
  });
}

async function main() {
  const argUrls = process.argv.slice(2);
  const urls = argUrls.length > 0 ? argUrls : getUrlsFromSitemap();

  console.log('═══════════════════════════════════════════');
  console.log(' IndexNow 즉시 색인 통보');
  console.log('═══════════════════════════════════════════');
  console.log(`통보 URL 수: ${urls.length}개`);
  console.log(`IndexNow 키: ${KEY}`);
  console.log(`키 위치: ${KEY_LOCATION}`);
  console.log('');

  // IndexNow는 한 번에 최대 10,000 URL. 배치 처리 (안전하게 500개씩)
  const BATCH = 500;
  const endpoints = [
    { name: 'IndexNow 중앙 (Bing+Naver+Yandex 동시)', url: 'https://api.indexnow.org/indexnow' },
    { name: 'Naver 직접', url: 'https://searchadvisor.naver.com/indexnow' },
  ];

  for (const ep of endpoints) {
    console.log(`▶ ${ep.name} 통보 중...`);
    for (let i = 0; i < urls.length; i += BATCH) {
      const batch = urls.slice(i, i + BATCH);
      const batchNum = Math.floor(i / BATCH) + 1;
      const totalBatches = Math.ceil(urls.length / BATCH);
      try {
        const res = await postIndexNow(ep.url, batch);
        const statusIcon =
          res.status === 200 ? '✅' : res.status === 202 ? '✅ (수락됨, 처리 대기)' : '⚠️';
        console.log(
          `  배치 ${batchNum}/${totalBatches} (${batch.length}개): HTTP ${res.status} ${statusIcon}`
        );
        if (res.status >= 400) {
          console.log(`    응답: ${res.body.slice(0, 200)}`);
        }
      } catch (err) {
        console.log(`  배치 ${batchNum}/${totalBatches} 오류: ${err.message}`);
      }
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log(' 통보 완료');
  console.log('═══════════════════════════════════════════');
  console.log('Bing 색인 상태 확인: https://www.bing.com/webmasters');
  console.log('Naver 색인 상태 확인: https://searchadvisor.naver.com');
  console.log('');
  console.log('참고: 구글은 IndexNow 미참여.');
  console.log('  - Google Search Console → URL 검사 → 색인 생성 요청');
  console.log('  - 또는 tools/google-indexing.js (Indexing API, 서비스 계정 필요)');
}

main().catch((err) => {
  console.error('오류:', err);
  process.exit(1);
});
