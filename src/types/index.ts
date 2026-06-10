export type ProjectType =
  | 'Culture'
  | 'Infrastructure'
  | 'Work'
  | 'Residential'
  | 'Sports'
  | 'Healthcare'
  | 'Hospitality'
  | 'Film'
  | 'Remodeling'
  | 'Mixed-use'

export type ProjectStatus =
  | 'Completed'
  | 'In Progress'
  | 'Competition'
  | 'Published'
  | 'Under Construction'

export interface Project {
  id: string              // URL slug — 변경 불가 (SEO)
  careerNo: number        // Career 전체 통번호 (Career_260519.xlsx 기준, 표시용)
  title: string
  titleKr: string
  year: number            // 설계 시작 연도
  type: ProjectType
  status: ProjectStatus
  result: string          // 'Winner', '2nd Prize', etc.
  featured: boolean       // true = 2배 너비 카드
  displayOrder: number    // 홈페이지 배치 순서 (수동 제어)
  coverImage?: string     // Cloudinary or /public 경로 — 비워두면 coverColor 사용
  coverColor: string      // placeholder 색상
  location?: string
}

// ── 프로젝트 상세 슬라이드 ──

export interface ImageSlide {
  kind: 'image'
  src: string
  /** BIG 형식 캡션: "LABEL — description". 없으면 캡션 미표시 */
  caption?: string
}

export interface DiagramItem {
  src: string
  /** 대문자 라벨, 예: "MASS 01" */
  label: string
  /** 한 문장 설명 */
  description: string
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

export type ProjectSlide = ImageSlide | DiagramSetSlide | CreditsSlide
