export type ProjectType =
  | 'Workplace'
  | 'Sports'
  | 'Culture and Exhibition'
  | 'Education'
  | 'Commerce'
  | 'Hospitality'
  | 'Religion'
  | 'Housing and Urbanism'
  | 'Infrastructure'
  | 'Healthcare'
  | 'Remodeling'
  | 'Interior'
  | 'Landscape'
  | 'Space'

/** 필터 칩 정렬 정본 순서 — Career_260707.xlsx 'Typology' 시트 */
export const TYPOLOGY_ORDER: ProjectType[] = [
  'Workplace', 'Sports', 'Culture and Exhibition', 'Education',
  'Commerce', 'Hospitality', 'Religion', 'Housing and Urbanism',
  'Infrastructure', 'Healthcare', 'Remodeling', 'Interior',
  'Landscape', 'Space',
]

/** Career_260707.xlsx 'Status' 열 표기 정본. 연도는 year 필드가 별도 보유 */
export type ProjectStatus =
  | 'Idea'                 // 낙선·미실현 (Excel 최다 값)
  | 'In progress'
  | 'Under construction'
  | 'Completed'
  | 'Published'

export interface Project {
  id: string              // URL slug — 변경 불가 (SEO)
  careerNo: number        // Career_260707.xlsx '프로젝트 연번' 기준
  title: string
  titleKr: string
  year: number            // 설계 시작 연도
  type: ProjectType       // = Typology_Main. 카드·메타에 노출되는 유일한 라벨
  subTypes?: ProjectType[] // = Typology_Sub 1·2. 필터 매칭 전용 — 어디에도 표기하지 않는다
  status: ProjectStatus
  result: string          // 'Winner', '2nd Prize', etc.
  featured: boolean       // true = 2배 너비 카드
  displayOrder: number    // 홈페이지 배치 순서 (수동 제어)
  coverImage?: string     // Cloudinary or /public 경로 — 비워두면 coverColor 사용
  coverColor: string      // placeholder 색상
  location?: string
  slides?: ProjectSlide[]  // Sanity에서 문서와 함께 로드
  client?: string          // 발주처 (4단계에서 표시)
  size?: string            // 규모 — 단위 포함 자유 표기. "22,333.78 ㎡" / "5 min." / "A2"
  role?: string           // Career 엑셀 Role 원문. "직위 (업무1, 업무2)" 형식
  coverHotspot?: { x: number; y: number }   // 커버 크롭 초점 (Studio hotspot)
}

// ── 프로젝트 상세 슬라이드 ──

export interface ImageSlide {
  kind: 'image'
  src: string
  /** BIG 형식 캡션: "LABEL — description". 없으면 캡션 미표시 */
  caption?: string
  /** true면 다이어그램으로 취급 — 트랙에서 DIAGRAM_H_PCT(48%) 높이 적용 */
  diagram?: boolean
  /** 이미지 w/h — Sanity metadata 공급 */
  ratio?: number
}

export interface DiagramItem {
  src: string
  /** 대문자 라벨, 예: "MASS 01" */
  label: string
  /** 한 문장 설명 */
  description: string
  /** 이미지 w/h — Sanity metadata 공급 */
  ratio?: number
}

export interface DiagramSetSlide {
  kind: 'diagramSet'
  items: DiagramItem[]
  /** 자동 진행 간격(ms). 기본 3000 */
  autoAdvanceMs?: number
}

export interface CreditsSlide {
  kind: 'credits'
  rows: { label: string; value: string }[]
}

/** Sanity Portable Text 블록 (textSlide 본문) */
export interface PortableTextBlock {
  _type: 'block'
  _key?: string
  style?: string
  children: { _type: 'span'; _key?: string; text: string; marks?: string[] }[]
  markDefs?: unknown[]
}

export interface TextSlide {
  kind: 'text'
  body: PortableTextBlock[]
}

export interface QuoteSlide {
  kind: 'quote'
  text: string
  /** 예: "BJARKE INGELS - FOUNDER & CREATIVE DIRECTOR, BIG" */
  attribution?: string
}

export type ProjectSlide = ImageSlide | DiagramSetSlide | CreditsSlide | TextSlide | QuoteSlide
