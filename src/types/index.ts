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

// ── 로케일 오브젝트 ──
// en 필수, ko 선택. ko가 없으면 영문만 렌더링한다.

/** 단일 행 병기 문자열 — 타이틀·서브타이틀·캡션·라벨·인용문 */
export interface LocaleString { en: string; ko?: string }
/** 여러 줄 병기 텍스트 (서식 없음) — 다이어그램 설명 */
export interface LocaleText { en: string; ko?: string }
/** 다문단 병기 서식 텍스트 (strong·em만) — 본문 서술 */
export interface LocalePortableText { en: PortableTextBlock[]; ko?: PortableTextBlock[] }

/** 수상 내역 항목 — 영문 전용(병기 아님). title은 최종 표기 그대로, 렌더러 미가공 */
export interface Award {
  title: string
  visible?: boolean
}

export interface Project {
  id: string              // URL slug — 변경 불가 (SEO)
  careerNo: number        // Career_260707.xlsx '프로젝트 연번' 기준
  title: LocaleString
  subtitle?: LocaleString // 한 줄 설명
  year: number            // 설계 시작 연도
  type: ProjectType       // = Typology_Main. 카드·메타에 노출되는 유일한 라벨
  subTypes?: ProjectType[] // = Typology_Sub 1·2. 필터 매칭 전용 — 어디에도 표기하지 않는다
  status: ProjectStatus
  awards?: Award[]        // 수상 내역. visible!==false만 노출. 상이 없으면 비움
  featured: boolean       // true = 2배 너비 카드
  coverImage?: string     // Cloudinary or /public 경로 — 비워두면 coverColor 사용
  coverColor?: string     // placeholder 색상 — 미입력 시 렌더러가 #1E1C18로 폴백
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
  caption?: LocaleString
  /** true면 다이어그램으로 취급 — 트랙에서 DIAGRAM_H_PCT(48%) 높이 적용 */
  diagram?: boolean
  /** 이미지 w/h — Sanity metadata 공급 */
  ratio?: number
}

export interface DiagramItem {
  src: string
  /** 예: "Site Conditions" */
  label: LocaleString
  /** 한 문장 설명 */
  description: LocaleText
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
  body: LocalePortableText
}

export interface QuoteSlide {
  kind: 'quote'
  text: LocaleString
  /** 예: "BJARKE INGELS - FOUNDER & CREATIVE DIRECTOR, BIG" */
  attribution?: string
}

export interface VideoSlide {
  kind: 'video'
  /** YouTube 영상 ID (URL 아님). 예: dQw4w9WgXcQ */
  youtubeId: string
  /** BIG 형식 캡션: "LABEL — description". 없으면 미표시 */
  caption?: LocaleString
}

export type ProjectSlide = ImageSlide | DiagramSetSlide | CreditsSlide | TextSlide | QuoteSlide | VideoSlide

// ── ABOUT 페이지 ──

/** CV 공통 — 명칭 + 부제 + 기간. Education·Employment 헤더 행 */
export interface CvSimpleEntry {
  title: string
  detail?: string
  period?: string
}

/** CV — 명칭 + 결과 + 연도. Employment 하위 프로젝트, Awards */
export interface CvRankedEntry {
  title: string
  result?: string
  year?: string
}

/** CV — 명칭 + 장소 + 연도. Exhibitions and Publications */
export interface CvVenueEntry {
  title: string
  venue?: string
  year?: string
}

/** CV — 재직 이력. 하위에 프로젝트 목록을 갖는다 */
export interface CvEmployment extends CvSimpleEntry {
  projects?: CvRankedEntry[]
}

/** PREOCCUPATIONS 항목 — 제목·본문 모두 병기 */
export interface Preoccupation {
  heading: LocaleString
  body: LocaleText
}

export interface AboutContact {
  location?: string
  email?: string
  phone?: string
}

export interface About {
  position?: LocalePortableText
  preoccupations?: Preoccupation[]
  education?: CvSimpleEntry[]
  employment?: CvEmployment[]
  awards?: CvRankedEntry[]
  exhibitions?: CvVenueEntry[]
  contact?: AboutContact
}
