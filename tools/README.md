# 색인 자동화 도구 (Indexing Automation)

네이버·빙(IndexNow) + 구글(Indexing API) 즉시 색인 통보 시스템.

## 빠른 사용

### 네이버·빙 즉시 색인 통보 (권장, 의존성 없음)

```bash
npm run build                              # 1. 사이트 빌드
node tools/indexnow.cjs                    # 2. 전체 URL 일괄 통보 (sitemap 기준)
node tools/indexnow.cjs URL1 URL2          #    특정 URL만 통보
```

→ 네이버, 빙(Bing), Yandex에 즉시 통보됨. 보통 수분~수시간 내 크롤링 시작.

### 구글 Indexing API (최초 1회 설정 필요)

```bash
node tools/google-indexing.cjs             # 설정 대기 모드로 동작 (안내 출력)
```

서비스 계정 설정 후:

```bash
npm install googleapis                     # 최초 1회
node tools/google-indexing.cjs             # 전체 URL 통보
```

## 최초 설정 (이미 완료됨)

### IndexNow (완료 ✅)
- 키: `.indexnow-key` 파일 + `public/{키}.txt` (네이버/빙이 소유권 검증용)
- robots.txt, RSS 피드(`/rss.xml`) 연동

### 구글 Indexing API (사용자 설정 필요)

1. https://console.cloud.google.com → 프로젝트 생성
2. **API 및 서비스** → 'Google Indexing API' 사용 설정
3. **사용자 인증 정보** → 서비스 계정 만들기 → JSON 키 다운로드
4. 다운로드한 JSON을 `tools/google-service-account.json` 으로 저장
5. 서비스 계정 이메일(`client_email`)을 Google Search Console 속성에 **소유자**로 추가
   - Search Console → 설정 → 사용자 및 권한 → 사용자 추가 → 소유자

## 색인 현황 확인

| 검색엔진 | 확인 URL |
|----------|----------|
| 네이버 | https://searchadvisor.naver.com |
| 빙 | https://www.bing.com/webmasters |
| 구글 | https://search.google.com/search-console |

## 동작 원리

- **IndexNow**: 네이버·빙·Yandex 참여. URL 변경 시 즉시 통보 → 크롤링 대기 없이 빠른 색인.
- **구글 Indexing API**: 구글은 IndexNow 미참여. Indexing API로 URL 업데이트 통보.
- **RSS**: 네이버 웹마스터 도구에서 RSS 수집 설정 시 자동 감지.
- **sitemap**: `robots.txt`에 선언되어 크롤러가 자동 발견.

## 글 작성 워크플로우

새 콘텐츠 추가/수정 후:

```bash
npm run build
node tools/indexnow.cjs                    # 네이버/빍 즉시 통보
node tools/google-indexing.cjs             # 구글 통보 (서비스 계정 설정 시)
```
