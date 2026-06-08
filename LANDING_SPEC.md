# Landing Page Rebuild Spec
## 파일: src/app/page.tsx 전면 교체

---

## 사전 작업

다음 파일들을 먼저 읽어라:
- src/app/page.tsx
- src/app/globals.css
- src/data/projects.ts
- src/types/index.ts

---

## 전체 구조

### [1] HERO SECTION — 풀스크린 100vh

**캐러셀:**
- projects.ts 전체 23개 프로젝트를 랜덤 shuffle 후 자동 순환
- 전환효과: cross-dissolve opacity transition 1s ease
- 각 이미지 체류시간: 8000ms
- Ken Burns 없음 (이미지 정적, transform 없음)
- 오버레이 없음

**이미지 렌더링:**
- coverImage(Cloudinary URL)가 있는 프로젝트: `<img>` 또는 next/image로 표시
- coverImage가 없는 프로젝트: 단일 색상 `<div>`로 대체
  ```
  const PALETTE = [
    '#1C2B3A', '#2D1B1B', '#1A2A1A', '#2B2515',
    '#1F1F2E', '#2A1F2D', '#1A2520', '#2C1A1A',
    '#15202B', '#1E2A1E', '#2B2020', '#1A1A2B'
  ]
  // 해당 프로젝트 인덱스 기준으로 순환 배정
  // color div 위에 프로젝트명을 중앙 정렬, 흰색 14px italic으로 표시
  ```

---

### [2] WORDMARK

**초기 상태 (hero 내):**
- position: absolute
- left: 20px, top: 35%
- 텍스트: "Architect Changhyun Paik"
- 폰트: Pretendard Variable
- 폰트 웨이트: "Architect"=300, "Changhyun"=500, "Paik"=700
- 각 단어를 별도 `<span>`으로 분리
- 초성(A, C, P)과 나머지도 별도 `<span>`으로 분리:
  ```jsx
  <span class="word">
    <span class="initial">A</span><span class="rest">rchitect</span>
  </span>
  {' '}
  <span class="word">
    <span class="initial">C</span><span class="rest">hanghyun</span>
  </span>
  {' '}
  <span class="word">
    <span class="initial">P</span><span class="rest">aik</span>
  </span>
  ```
- 폰트 크기: 데스크톱 42px, 모바일 22px
- 색상: 흰색 (#ffffff)
- letter-spacing: 0.02em

**진입 애니메이션 (shimmer, 페이지 로드 시 1회):**
- 구현: CSS mask-image + linear-gradient animation
- 좌→우 방향으로 마스크가 걷히며 텍스트 출현
- globals.css에 @keyframes shimmerReveal 추가:
  ```css
  @keyframes shimmerReveal {
    0% { -webkit-mask-position: -200% center; mask-position: -200% center; }
    100% { -webkit-mask-position: 200% center; mask-position: 200% center; }
  }
  ```
- mask-image: `linear-gradient(90deg, transparent 0%, black 40%, black 60%, transparent 100%)`
- mask-size: 200% 100%
- animation: shimmerReveal 1.2s ease-out forwards
- 히어로 이미지는 shimmer 완료(1.2s) 후 opacity 0→1 transition 0.8s 로 fade-in

**스크롤 collapse 애니메이션:**

JavaScript scroll 이벤트로 scrollY를 감지.
임계값: `scrollY > window.innerHeight - 100`

임계값 초과 시:
1. wordmark를 `position: fixed, top: 16px, left: 20px` 으로 전환
2. `.rest` span들에 CSS transition 적용:
   - `opacity: 0`
   - `max-width: 0`
   - `overflow: hidden`
   - `transition: opacity 0.4s ease, max-width 0.4s ease`
3. 단어 사이 공백도 `max-width: 0` 처리
4. 최종 상태: "ACP" (A light, C medium, P bold 그대로 유지)
5. 폰트 크기: 데스크톱 28px, 모바일 18px (transition 동시 적용)

임계값 미만으로 스크롤 업 시 역방향으로 복원.

---

### [3] 내비게이션 — 우하단 플로팅

```
position: fixed
bottom: 24px
right: 24px
```

항목 (수직 스택, 우정렬, 위에서 아래):
- Work → href="/work"
- About → href="/about"
- Contact → href="mailto:contact@paikarchitects.com"

스타일:
- 폰트: Pretendard 300
- 크기: 데스크톱 15px, 모바일 13px
- 색상: 흰색 (hero 구간)
- 줄간격: 1.8
- hover: text-decoration: underline
- 배경 없음 (완전 투명)

---

### [4] 캡션 — 좌하단 고정

```
position: fixed
bottom: 20px
left: 20px
```

내용: 현재 활성 이미지의 프로젝트명 + ", " + 연도
예시: "Independence Memorial Hall, 2019"

스타일:
- font-style: italic
- font-size: 11px
- color: rgba(255,255,255,0.7)
- font-weight: 300

---

### [5] 스크롤 인디케이터 — 하단 중앙

```
position: fixed
bottom: 20px
left: 50%
transform: translateX(-50%)
```

내용: ↓ 문자
스타일: 흰색, 16px, opacity 0.6
동작: scrollY > 50 이면 opacity 0으로 fade-out (transition 0.3s)

---

### [6] WORK 섹션 (히어로 하단, 스크롤 후 진입)

**데이터 소스:**
projects.ts 전체 프로젝트 중 coverImage가 있는 것들을 최신순으로 최대 8개.
없으면 상위 6개 사용.

**데스크톱 레이아웃 (min-width: 768px):**

각 항목:
```
display: flex
height: 100vh (각 항목)
```

홀수 인덱스 (0, 2, 4...): 텍스트 LEFT + 이미지 RIGHT
짝수 인덱스 (1, 3, 5...): 이미지 LEFT + 텍스트 RIGHT

텍스트 패널:
```
width: 50%
position: sticky
top: 0
height: 100vh
display: flex
align-items: center
padding-left: 48px
```
배경/텍스트 색:
- 홀수: background #F8F6F2, color #0a0908
- 짝수: background #080706, color #F8F6F2

텍스트 패널 내용 (수직 중앙):
```
연도: font-size 11px, font-weight 300, color gray, margin-bottom 8px
프로젝트명: font-size 26px, font-weight 600, margin-bottom 8px
타입/상태: font-size 12px, font-weight 300, color gray
```

이미지 패널:
```
width: 50%
min-height: 100vh
```
이미지: width 100%, height 100%, object-fit cover

**모바일 레이아웃:**
단일 컬럼. 이미지 전체 너비 → 텍스트 블록 순서.
텍스트 블록: padding 24px, 배경 동일 규칙.

---

## 기타 조건

- 파일 상단 `'use client'` 필수
- SiteHeader 컴포넌트 import 하지 않음 (이 페이지는 자체 내비게이션)
- TypeScript 타입 오류 없이 처리
- useState, useEffect, useRef 사용
- window 접근은 useEffect 내부에서만
- 완료 후 `npm run build` 실행하여 빌드 에러 확인 및 수정
- globals.css에 shimmerReveal keyframe 추가 (기존 keyframe 삭제하지 말 것)
