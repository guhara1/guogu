/**
 * 데이터 로드 및 단계적 색인 제어 라이브러리
 *
 * 스펙 13절의 contentStatus / indexPriority / noindex 필드를 기준으로
 * 어떤 항목을 페이지로 생성할지(1차-A)를 결정한다.
 *
 * 1차-A(indexPriority === 1 && contentStatus === 'ready') 항목만 getStaticPaths 대상이 된다.
 * draft / noindex 항목은 페이지를 만들되 robots noindex 메타를 삽입한다.
 */
import type { LifeArea, DistrictData, UseCaseData, ChecklistItem, Province } from './types';
import seoulLifeAreas from '../data/seoul/life-areas.json';
import gyeonggiLifeAreas from '../data/gyeonggi/life-areas.json';
import incheonLifeAreas from '../data/incheon/life-areas.json';
import seoulDistricts from '../data/seoul/districts.json';
import gyeonggiDistricts from '../data/gyeonggi/districts.json';
import incheonDistricts from '../data/incheon/districts.json';
import useCasesData from '../data/common/use-cases.json';
import checklistData from '../data/common/checklists.json';

type LifeAreaMap = Record<Province, LifeArea[]>;

const lifeAreasByProvince: LifeAreaMap = {
  seoul: seoulLifeAreas as LifeArea[],
  gyeonggi: gyeonggiLifeAreas as LifeArea[],
  incheon: incheonLifeAreas as LifeArea[],
};

/** 모든 생활권 데이터 (3개 광역단체 통합) */
export function getAllLifeAreas(): LifeArea[] {
  return [
    ...lifeAreasByProvince.seoul,
    ...lifeAreasByProvince.gyeonggi,
    ...lifeAreasByProvince.incheon,
  ];
}

/** 특정 광역단체의 생활권 데이터 */
export function getLifeAreasByProvince(province: Province): LifeArea[] {
  return lifeAreasByProvince[province];
}

/**
 * 1차 색인 대상 생활권 (indexPriority === 1 && contentStatus === 'ready')
 * → 이 항목들만 페이지 생성 + 색인 허용
 */
export function getReadyLifeAreas(province?: Province): LifeArea[] {
  const source = province ? lifeAreasByProvince[province] : getAllLifeAreas();
  return source.filter(
    (area) => area.indexPriority === 1 && area.contentStatus === 'ready'
  );
}

/** slug로 단일 생활권 조회 (province + slug로 정확히 매칭) */
export function getLifeArea(province: Province, slug: string): LifeArea | undefined {
  return lifeAreasByProvince[province].find((area) => area.slug === slug);
}

/** 슬러그로 생활권 조회 (전체 검색, 관련 링크용) */
export function findLifeAreaBySlug(slug: string): LifeArea | undefined {
  return getAllLifeAreas().find((area) => area.slug === slug);
}

/** 모든 이용 장소 데이터 */
export function getAllUseCases(): UseCaseData[] {
  return useCasesData as UseCaseData[];
}

/** slug로 이용 장소 조회 */
export function getUseCase(slug: string): UseCaseData | undefined {
  return (useCasesData as UseCaseData[]).find((item) => item.slug === slug);
}

/** 예약 전 체크리스트 전체 */
export function getChecklist(): ChecklistItem[] {
  return checklistData as ChecklistItem[];
}

/** 광역단체 한글명 매핑 */
export const PROVINCE_LABEL: Record<Province, string> = {
  seoul: '서울',
  gyeonggi: '경기',
  incheon: '인천',
};

/** 광역단체별 핵심 생활권 개수 (메인 페이지 통계용) */
export function getLifeAreaCount(province: Province): number {
  return getReadyLifeAreas(province).length;
}

/* ==========================================================================
   행정구·시군 (District) 데이터
   ========================================================================== */

/** 수도권 행정구·시군 전체 (서울 25 + 경기 31 + 인천 10) */
const districtsByProvince: Record<Province, DistrictData[]> = {
  seoul: seoulDistricts as DistrictData[],
  gyeonggi: gyeonggiDistricts as DistrictData[],
  incheon: incheonDistricts as DistrictData[],
};

/** 특정 광역단체의 행정구 목록 */
export function getDistricts(province: Province): DistrictData[] {
  return districtsByProvince[province].filter(
    (d) => d.contentStatus === 'ready'
  );
}

/** slug로 행정구 조회 */
export function getDistrict(province: Province, slug: string): DistrictData | undefined {
  return districtsByProvince[province].find((d) => d.slug === slug);
}

/** 특정 행정구의 행정동 목록 반환 (dongs 필드) */
export function getDongsByDistrict(province: Province, districtSlug: string): string[] {
  const district = getDistrict(province, districtSlug);
  return district?.dongs ?? [];
}

/** 행정동 슬러그를 표시명으로 변환 (예: yeoksam-dong → 역삼동) */
export function dongSlugToName(slug: string): string {
  // 슬러그에서 -dong, -eup, -myeon 제거 후 한국어 동명 매핑
  return slug.replace(/-/g, ' ');
}

