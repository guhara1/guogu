import type { APIRoute } from 'astro';

// RSS 2.0 피드 - 네이버/구글 색인용
// 주요 페이지(메인/행정구 허브/생활권)를 아이템으로 노출
export const GET: APIRoute = async () => {
  const baseUrl = 'https://zxking-massage.pages.dev';
  const buildDate = new Date().toUTCString();

  // 주요 페이지 목록 (전체 1140 URL 중 핵심만 — RSS는 대표 페이지 위주가 효율적)
  const items = [
    { loc: '/', priority: '1.0', title: 'X 킹마사지 - 수도권 출장마사지 방문 가능 지역 안내', desc: '서울·경기·인천 출장마사지 방문 가능 지역, 행정동, 역세권, 예약 전 확인사항 안내' },
    { loc: '/seoul/', priority: '0.9', title: '서울 출장마사지 - 행정구별 방문 가능 지역', desc: '서울 25개 행정구 방문 가능 지역과 예약 전 확인사항' },
    { loc: '/gyeonggi/', priority: '0.9', title: '경기 출장마사지 - 시·군별 방문 가능 지역', desc: '경기 31개 시·군 방문 가능 지역과 예약 전 확인사항' },
    { loc: '/incheon/', priority: '0.9', title: '인천 출장마사지 - 행정구별 방문 가능 지역', desc: '인천 10개 행정구 방문 가능 지역과 예약 전 확인사항' },
    { loc: '/use/', priority: '0.8', title: '이용 장소별 안내 - 자택·호텔·오피스텔', desc: '이용 장소별(자택·호텔·오피스텔·외곽·야간) 확인사항 안내' },
    { loc: '/check/', priority: '0.8', title: '예약 전 확인사항', desc: '출장마사지 예약 전 반드시 확인할 내용 체크리스트' },
  ];

  const itemXml = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${baseUrl}${item.loc}</link>
      <guid>${baseUrl}${item.loc}</guid>
      <description>${escapeXml(item.desc)}</description>
      <priority>${item.priority}</priority>
    </item>`
    )
    .join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>X 킹마사지 - 수도권 출장마사지 정보</title>
    <link>${baseUrl}</link>
    <description>서울·경기·인천 수도권 출장마사지 방문 가능 지역과 예약 전 확인사항을 안내합니다.</description>
    <language>ko</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
${itemXml}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
