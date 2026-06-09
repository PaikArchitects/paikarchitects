# CLAUDE.md — Paik Architecture Portfolio Site
> Claude Code의 시스템 컨텍스트. 레포 루트에 위치. 매 세션 자동 로드.
> 최종 업데이트: 2026.06.09

---

## 프로젝트 개요

**목적:** 건축가 백창현(Chang Hyun Paik)의 포트폴리오 웹사이트
**현재 배포 URL:** https://paikarchitects.vercel.app
**배포 방식:** GitHub push → Vercel 자동 빌드 (~1분)

---

## 기술 스택

| 항목 | 값 |
|---|---|
| 프레임워크 | Next.js (App Router) |
| 배포 | Vercel |
| 레포 | https://github.com/PaikArchitects/paikarchitects (Public) |
| 이미지 CDN | Cloudinary (Cloud Name: drsybwqg0) |
| 폰트 | Pretendard Variable (CDN via globals.css @import 단독 사용) |

---

## 파일 구조 (핵심)

```
src/
├── app/
│   ├── page.tsx          ← 랜딩페이지 (hero carousel, entry sequence, work section)
│   ├── globals.css       ← Pretendard import + entry-spinner + wordmark CSS만 포함
│   ├── layout.tsx        ← 전역 레이아웃 (DM Sans/Cormorant link 태그 잔존 — 정리 필요)
│   ├── work/
│   │   ├── page.tsx      ← Work 그리드
│   │   └── [slug]/page.tsx ← 프로젝트 상세 (현재 stub)
│   ├── about/page.tsx
│   ├── essays/page.tsx
│   └── contact/page.tsx
├── components/
│   └── SiteHeader.tsx    ← 공유 헤더 (variant: 'dark'|'light', activePage prop)
├── data/
│   └── projects.ts       ← 23개 프로젝트 데이터
└── types/index.ts
```

---

## 확정된 디자인 토큰 (변경 금지)

| 항목 | 값 |
|---|---|
| 배경 (기본) | `#080706` |
| 배경 (유일한 대안) | `#FFFFFF` |
| **사용 금지 색상** | `#F8F6F2` (워머 오프화이트) — 완전 폐기 |
| 텍스트 (어두운 배경 위) | `#FFFFFF` |
| 텍스트 (밝은 배경 위) | `#0a0908` |
| 폰트 패밀리 | `'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif` |
| 폰트 상수 (모든 파일) | `const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"` |

### 랜딩 워드마크

| 항목 | 값 |
|---|---|
| 텍스트 | "Architect Changhyun Paik" |
| 웨이트 | Architect=900 / Changhyun=400 / Paik=300 |
| 크기 | 56px (데스크톱), 28px (모바일, CSS) |
| 위치 | 비확장: position absolute, top 33%, left 20px |
| 위치 | 확장(collapsed): position fixed, top 16px, left 20px |
| collapse 방향 | 우→좌 (rest + word-space max-width 0) |
| 모노그램 | "ACP" (collapse 완료 후 상태) |

### 랜딩 캐러셀

| 항목 | 값 |
|---|---|
| 전환 방식 | 암전(검정) fade — cross-dissolve 아님 |
| 체류 시간 | ~3.4s (setInterval 4000ms, blackout 600ms) |
| 진입 시퀀스 | loading(5s) → nav 출현 → shimmer(1.2s) → 이미지 fade-in |

### 랜딩 Work 섹션

| 항목 | 값 |
|---|---|
| 데스크톱 레이아웃 | 20:80 (텍스트:이미지), alignItems: flex-start |
| 이미지 비율 (데스크톱) | aspectRatio: '3/4' (portrait) |
| 이미지 비율 (모바일) | aspectRatio: '9/16' (portrait) |
| 모바일 텍스트 카드 | aspectRatio: '1/1' (정방형) |
| 텍스트 패널 | position sticky, top 0, height 100vh, justifyContent flex-end |
| 텍스트 수직 위치 | 하단 (paddingBottom 48, paddingTop 96) |
| 프로젝트명 | 18px w700 |
| 배경 교번 | 짝수: #FFFFFF / 홀수: #080706 |
| light-panel | 짝수(흰 배경) 텍스트 패널에 className 적용 |

### 내비게이션 (플로팅 우하단)

| 항목 | 값 |
|---|---|
| 항목 | ABOUT / WORKS / ESSAYS / CONTACTS |
| 폰트 | 18px weight 300 line-height 1.8 |
| 위치 | fixed, bottom 24px, right 24px |
| 색상 전환 | `.light-panel` 감지 기반 — mix-blend-mode 사용 안 함 |

---

## 코드 수정 원칙 (필수)

1. **파일 수정 전 현재 상태 반드시 Read** — 이전 context의 코드를 신뢰하지 말 것
2. **이미 수정된 파일은 partial edit 금지** → complete file replacement 방식
3. **위 디자인 토큰 임의 변경 금지**
4. **`npm run dev` 실행 금지** — dev 서버 시작은 승인 루프를 유발함
5. **`npm run build` 실행 금지** — Vercel이 처리함
6. **모든 파일 수정 완료 후 `npx tsc` 1회 실행** — TypeScript 에러 확인용. 에러 없으면 구현 완료. 에러 있으면 수정 후 재확인.
7. `npx tsc` 통과 후 "구현 완료, GitHub Desktop에서 commit/push 가능합니다" 메시지 출력

---

## Cloudinary 이미지 (업로드 완료 7개)

```typescript
// URL 패턴: https://res.cloudinary.com/drsybwqg0/image/upload/[public_id].[ext]
독립운동기념관    → 01_THRESHOLD_amtokp.png
청주문화제조창    → Elevation_01-2_resize_qzmdrj.jpg
KFCC Bank        → 서측_투시도_resize_yzrpuw.jpg
서울애니메이션    → CG_Aerial_View_resize_xlqazy.jpg
시몬스 팩토리움  → Completed_외곽_rev_resize_ensojy.jpg
현대차 인도 R&D  → Aerial_001_HDR_resize_jpd5hu.jpg
Cloud Tectonic   → Cloud_Tectonic_gzditm.jpg
// 나머지 16개: coverImage 미연결
```

---

## 현재 작업 우선순위

### 단기 (다음 Claude Code 세션들)
- [ ] 나머지 16개 프로젝트 Cloudinary 업로드 → projects.ts 연결
- [ ] `/work/[slug]` 프로젝트 상세 페이지 구현
- [ ] layout.tsx에서 미사용 Google Fonts (Cormorant Garamond, DM Sans) link 태그 제거

### 중기
- [ ] paikarchitects.com DNS: Webflow → Vercel 전환
- [ ] Design Thesis 기반 프로젝트 배열 재구성

---

## 알려진 미완성 항목

| 항목 | 위치 | 비고 |
|---|---|---|
| 미사용 Google Fonts 로딩 | layout.tsx | Cormorant Garamond, DM Sans link 태그 — 제거 필요 |
| Lorem ipsum 더미 텍스트 | projects.ts 일부 | 실제 텍스트 교체 필요 |
| 서울 "Animatoin" 오타 | projects.ts | 수정 필요 |
| [slug] 상세 페이지 | work/[slug]/page.tsx | 현재 stub |
