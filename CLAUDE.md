# CLAUDE.md — Paik Architecture Portfolio Site
> Claude Code의 시스템 컨텍스트. 레포 루트에 위치. 매 세션 자동 로드.
> 최종 업데이트: 2026.06.08

---

## 프로젝트 개요

**목적:** 건축가 백창현(Chang Hyun Paik)의 포트폴리오 웹사이트  
**이중 목표:** 실무 수주(Practice Track) + 해외 대학원 지원(Academic Track: AA School, Harvard GSD, Columbia GSAPP)  
**도메인:** paikarchitects.com (현재 Webflow DNS → Vercel 전환 예정)  
**현재 배포 URL:** https://paikarchitects.vercel.app  
**배포 방식:** GitHub push → Vercel 자동 빌드 (~1분 소요)

---

## 기술 스택 및 계정

| 항목 | 값 |
|---|---|
| 프레임워크 | Next.js (App Router) |
| 배포 | Vercel |
| 레포 | https://github.com/PaikArchitects/paikarchitects (Public) |
| 이미지 CDN | Cloudinary (Cloud Name: drsybwqg0) |
| 로컬 편집 방식 | Notepad → GitHub Desktop (commit/push) |

---

## 파일 구조 (핵심)

```
src/
├── app/
│   ├── page.tsx              ← 랜딩페이지 (hero carousel, Ken Burns)
│   ├── globals.css           ← 디자인 토큰 전체
│   ├── layout.tsx            ← 전역 레이아웃
│   ├── work/
│   │   ├── page.tsx          ← Work 그리드 (4-column, Perrault 방식)
│   │   └── [slug]/           ← 프로젝트 상세 (현재 stub, 구현 필요)
│   └── about/
│       └── page.tsx          ← About (디자인 시스템 통합 미완)
├── components/
│   └── SiteHeader.tsx        ← 공유 헤더 (variant: 'dark' | 'light', activePage prop)
├── data/
│   └── projects.ts           ← 23개 프로젝트 데이터 (careerNo, slug, title, coverImage 등)
└── types/
    └── index.ts              ← Project 타입 정의
```

---

## 디자인 토큰 (확정, 변경 금지)

| 항목 | 값 |
|---|---|
| 폰트 | Pretendard Variable (단일, 기존 Cormorant Garamond 대체 완료) |
| 랜딩 배경 | `#080706` (near-black) |
| Work·About 배경 | `#F8F6F2` (warm off-white) |
| 랜딩 헤더 | glassmorphism `rgba(7,6,5,0.36)` + `blur(22px)` |
| Work 헤더 | frosted light `rgba(248,246,242,0.88)` + `blur(16px)` |
| 카드 gap | `4px` |
| Ken Burns | 22초 주기, scale `1.07 ↔ 1.00` |

### Work 카드 Hover (확정)
- 이미지: scale `1.0 → 1.06`
- 텍스트 스트립: 솔리드 라이트 배경 → `rgba(0,0,0,0.68)` 오버레이 + 화이트 텍스트
- **주의:** Perrault 방식 = frosted glass 아님, solid-to-dark overlay

---

## 코드 수정 원칙 (필수)

1. **파일 수정 전 반드시 현재 상태 Read** — 이전 context의 코드 상태를 신뢰하지 말 것
2. **이미 수정된 파일은 partial edit 금지** → **complete file replacement** 방식 사용
3. **디자인 토큰 임의 변경 금지** — 위 확정값에서 이탈하는 코드는 생성하지 말 것
4. git push 후 Vercel 자동 배포 (~1분), 배포 확인 후 다음 작업 착수

---

## Cloudinary 업로드 완료 (7개)

```typescript
// Cloudinary URL 패턴:
// https://res.cloudinary.com/drsybwqg0/image/upload/[public_id].[ext]

const coverImages = {
  independence_memorial: "01_THRESHOLD_amtokp.png",
  cheongju_culture:      "Elevation_01-2_resize_qzmdrj.jpg",
  kfcc_bank:             "서측_투시도_resize_yzrpuw.jpg",
  seoul_animation:       "CG_Aerial_View_resize_xlqazy.jpg",
  simmons_factorium:     "Completed_외곽_rev_resize_ensojy.jpg",
  hyundai_india:         "Aerial_001_HDR_resize_jpd5hu.jpg",
  cloud_tectonic:        "Cloud_Tectonic_gzditm.jpg",
};
// 나머지 16개 프로젝트: 이미지 미업로드, projects.ts에서 coverImage 필드 미연결
```

---

## 현재 작업 우선순위

### 즉시 (이번 세션)
- [ ] `/work/[slug]` 프로젝트 상세 페이지 구현
  - **방향:** scroll-driven 시퀀싱 + 재료·개념 callout (Villa Selva 참조)
  - **선도 프로젝트:** 독립운동기념관 (이미지 자산 + 개념 깊이 모두 최고 수준)

### 단기
- [ ] 나머지 16개 프로젝트 이미지 Cloudinary 업로드 → projects.ts 연결
- [ ] About 페이지 디자인 시스템 통합 (현재 다른 디자인 시스템 사용 중)
- [ ] OpenGraph og:image 메타데이터 추가 (현재 소셜 공유 시 이미지 없음)

### 중기
- [ ] paikarchitects.com DNS 전환 (Webflow Starter → Vercel)
- [ ] Design Thesis 기반 프로젝트 배열 재구성
- [ ] 영어 텍스트 교열

---

## 알려진 미완성 항목

| 항목 | 위치 | 상태 |
|---|---|---|
| Lorem ipsum 더미 텍스트 | projects.ts 일부 | 실제 텍스트로 교체 필요 |
| 서울 "Animatoin" 오타 | projects.ts + PDF | 수정 예정 |
| About 페이지 디자인 불일치 | about/page.tsx | 랜딩·Work와 다른 시스템 사용 중 |
| SiteHeader 중복 블록 | 일부 페이지 | 구버전 인라인 헤더 정리 미완 |

---

## 레퍼런스 사이트 (확정된 방향)

| 사이트 | 참조 포인트 |
|---|---|
| A24 Films | 랜딩 editorial hero 구조 |
| Perrault Architecture | Work 그리드 + hover 방식 |
| BIG (big.dk) | 동일 Next.js 스택, 기술 방향 |
| More Less Architects | 상세 페이지 텍스트 깊이 기준 (CMS 필요 임계점) |
| IROJE (iroje.com) | Academic Track 장기 구조 참조 |
