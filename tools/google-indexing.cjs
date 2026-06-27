/**
 * Google Indexing API 자동화 스크립트 (Node.js, googleapis 사용)
 *
 * 구글은 IndexNow에 참여하지 않으므로 Indexing API를 사용해야 즉시 색인 통보 가능.
 * Indexing API는 원래 '채용/생중계' 페이지용이지만, URL 업데이트 통보 목적으로도 사용 가능
 * (색인 우선순위 신호로 작용).
 *
 * === 최초 1회 설정 (필수) ===
 * 1. https://console.cloud.google.com → 프로젝트 생성 (또는 기존 프로젝트)
 * 2. API 및 서비스 → 'Google Indexing API' 사용 설정
 * 3. 사용자 인증 정보 → 서비스 계정 만들기 → JSON 키 다운로드
 * 4. 다운로드한 JSON을 tools/google-service-account.json 으로 저장
 * 5. 서비스 계정 이메일(client_email)을 Google Search Console 속성에 '소유자'로 추가
 *    (Search Console → 설정 → 사용자 및 권한 → 사용자 추가 → 소유자)
 *
 * === 사용 ===
 *   npm install googleapis          # 최초 1회
 *   node tools/google-indexing.js  # sitemap 전체 URL 통보
 *   node tools/google-indexing.js URL1 URL2  # 특정 URL만
 *
 * 서비스 계정 JSON이 없으면 자동으로 sitemap ping 대체 모드로 동작.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const SITE = 'https://zxking-massage.pages.dev';
const SA_PATH = path.join(__dirname, 'google-service-account.json');

function getUrlsFromSitemap() {
  const sitemapPath = path.join(__dirname, '..', 'dist', 'sitemap-0.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.error('❌ dist/sitemap-0.xml 없음. npm run build 먼저 실행.');
    process.exit(1);
  }
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const matches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
  return matches.map((m) => m.replace(/<\/?loc>/g, '')).filter((u) => !u.includes('sitemap'));
}

// 서비스 계정 없을 때의 안전 모드: 구글은 ping API를 폐지했으므로
// 안내만 출력하고 종료 (오류로 크롤링 방해하지 않음)
async function fallbackMode(urls) {
  console.log('═══════════════════════════════════════════');
  console.log(' Google Indexing API — 설정 대기 모드');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('서비스 계정(tools/google-service-account.json)이 없어 자동 통보를 건너뜁니다.');
  console.log('');
  console.log('대안 1 — 수동 (가장 빠름, 지금 당장):');
  console.log('  1. https://search.google.com/search-console');
  console.log('  2. URL 검사 → 사이트 URL 붙여넣기 → "색인 생성 요청"');
  console.log(`  3. 메인: ${SITE}/`);
  console.log(`  4. sitemap 제출: ${SITE}/sitemap-index.xml`);
  console.log('');
  console.log('대안 2 — Indexing API 자동화 (최초 1회 설정 후 영구 사용):');
  console.log('  스크립트 상단 주석의 5단계 설정 가이드 참조');
  console.log('  설정 후: npm install googleapis && node tools/google-indexing.js');
  console.log('');
  console.log(`대상 URL 수: ${urls.length}개 (서비스 계정 설정 시 자동 통보됨)`);
}

async function withServiceAccount(urls) {
  let google;
  try {
    google = require('googleapis').google;
  } catch (e) {
    console.log('⚠️ googleapis 패키지 없음. 설치 필요: npm install googleapis');
    console.log('안전 모드로 전환합니다.');
    await fallbackMode(urls);
    return;
  }

  const sa = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));
  const jwtClient = new google.auth.JWT(
    sa.client_email,
    null,
    sa.private_key,
    ['https://www.googleapis.com/auth/indexing'],
    null
  );

  await jwtClient.authorize();
  const indexing = google.indexing({ version: 'v3', auth: jwtClient });

  console.log('═══════════════════════════════════════════');
  console.log(' Google Indexing API 통보');
  console.log('═══════════════════════════════════════════');
  console.log(`통보 URL 수: ${urls.length}개`);
  console.log(`서비스 계정: ${sa.client_email}`);
  console.log('');

  let ok = 0;
  let fail = 0;
  // Indexing API는 초당 할당량. 100개씩 처리하며 지연 삽입
  for (let i = 0; i < urls.length; i++) {
    try {
      const res = await indexing.urlNotifications.publish({
        requestBody: {
          url: urls[i],
          type: 'URL_UPDATED',
        },
      });
      ok++;
      if ((i + 1) % 50 === 0) console.log(`  진행: ${i + 1}/${urls.length} (성공 ${ok})`);
      // 할당량 보호: 100ms 지연
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      fail++;
      if (fail <= 5) console.log(`  실패 ${i + 1}: ${urls[i]} - ${err.message}`);
    }
  }

  console.log('');
  console.log(`완료: 성공 ${ok}, 실패 ${fail}`);
  console.log('색인 상태 확인: https://search.google.com/search-console');
}

async function main() {
  const argUrls = process.argv.slice(2);
  const urls = argUrls.length > 0 ? argUrls : getUrlsFromSitemap();

  if (fs.existsSync(SA_PATH)) {
    await withServiceAccount(urls);
  } else {
    await fallbackMode(urls);
  }
}

main().catch((err) => {
  console.error('오류:', err);
  process.exit(1);
});
