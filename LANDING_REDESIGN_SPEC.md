# LANDING_REDESIGN_SPEC.md
## Paik Architecture — 랜딩페이지 전면 재설계
**작성일:** 2026.06.10  
**실행 방법:** `LANDING_REDESIGN_SPEC.md 파일을 읽고 명세대로 구현해줘`

---

## 0. 개요 및 방향

현재 랜딩페이지(캐러셀 히어로 + Work 섹션 분리)를 **단일 SPA 공간**으로 전면 재설계한다.  
모든 프로젝트가 한 화면 안에서 존재하며, 페이지 이동 없이 프로젝트 탐색과 상세 열람이 이루어진다.  
URL은 변경되지만(history.pushState) 화면 전환은 없다.

**제거 대상:**
- 기존 캐러셀 히어로 컴포넌트 전체
- Work 섹션 (20:80 카드 레이아웃)

**유지 대상:**
- 워드마크 "Architect Changhyun Paik" (기존 스펙 그대로)
- 색상 시스템: `#080706` / `#FFFFFF`
- Cloudinary 이미지 인프라
- `src/data/projects.ts` 프로젝트 데이터

---

## 1. 전체 레이아웃 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                         HEADER (고정)                            │  60px
├───────────────────────┬─────────────────────────────────────────┤
│                       │                                         │
│    PROJECT WALL       │         CONTENT AREA                    │
│      (1/3)            │           (2/3)                         │
│   수직 스크롤          │    [Idle: 랜덤 셔플]                     │
│   overflow-y: auto    │    [Active: 수평 슬라이드]               │
│   overflow-x: hidden  │                                         │
│                       │                                         │
└───────────────────────┴─────────────────────────────────────────┘
```

- 전체 높이: `100vh`
- 헤더 제외 가용 높이: `calc(100vh - 60px)`
- Project Wall 폭: `33.333vw` (1/3)
- Content Area 폭: `66.667vw` (2/3)
- 구분선: `1px solid #080706` 수직선 (또는 border-right)

---

## 2. PROJECT WALL 상세 스펙

### 2-A. 카드 구조

각 카드는 수평 분할: **좌측 텍스트 + 우측 썸네일 이미지**

```
┌──────────────────────────────────────────────────┐
│                                                  │  height: 155px
│  프로젝트명 (14px, regular)   │  [  이미지  ]    │
│  위치 (10px, uppercase, 0.4)  │  [        ]    │
│                               │  [        ]    │
└──────────────────────────────────────────────────┘
```

- 카드 전체 높이: `155px`
- 카드 간격 (gap): `16px`
- 텍스트 열 폭: `180px` (고정)
- 이미지 열 폭: 나머지 전체 (flex-grow: 1)
- 이미지 비율: `object-fit: cover`, 이미지 열 전체 충진
- 텍스트 수직 정렬: `justify-content: center` (상하 중앙)
- 텍스트 수평 정렬: 좌정렬, padding-left: 20px

### 2-B. 타이포그래피

- 프로젝트명: 14px, font-weight: 300, color: #080706
- 위치: 10px, font-weight: 300, letter-spacing: 0.08em, text-transform: uppercase, opacity: 0.5

### 2-C. 카드 인터랙션 상태

**기본 (Idle 중 비활성):**
- 이미지: opacity 0.45
- 텍스트: opacity 0.45
- transition: opacity 0.3s ease

**Idle 중 활성 (셔플에 의해 하이라이트된 카드):**
- 이미지: opacity 1.0
- 텍스트: opacity 1.0
- 좌측 테두리: `2px solid #080706`

**Hover (마우스 진입):**
- 이미지: opacity 1.0
- 텍스트: opacity 1.0
- cursor: pointer
- 셔플 일시정지 (아래 Idle 로직 참조)

**Active (클릭 선택):**
- 이미지: opacity 1.0
- 텍스트: opacity 1.0
- 좌측 테두리: `2px solid #080706` 유지
- 나머지 모든 카드: opacity 0.3

### 2-D. 스크롤 동작

- Project Wall 컨테이너: `overflow-y: auto`, `overflow-x: hidden`
- 스크롤바: 숨김 (`scrollbar-width: none`)
- Active 카드 진입 시: `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- Idle 싱크 스크롤: `scrollTo({ top: targetOffset, behavior: 'smooth' })`

---

## 3. CONTENT AREA 상세 스펙

### 3-A. Idle 상태 (프로젝트 미선택)

**현재 캐러셀 로직 기반으로 재구성.**  
전체 프로젝트 이미지를 랜덤 셔플하여 순환 표시.

- 이미지: `width: 100%`, `height: calc(100vh - 60px)`, `object-fit: cover`
- 전환 방식: 블랙 페이드 (현재 캐러셀과 동일: opacity 0 → black → opacity 1)
- 전환 간격: 4000ms 유지
- 순환 방식: 전체 프로젝트 배열을 셔플 후 순서대로 순환. 마지막 도달 시 새로운 셔플 생성 후 재순환.
- 각 이미지 표시 중: 해당 프로젝트 카드를 Project Wall에서 하이라이트 + 스크롤 싱크

**셔플-싱크 로직:**
```
현재 표시 중인 이미지의 projectSlug 추적
→ Project Wall에서 해당 slug의 카드 DOM 위치 계산
→ scrollIntoView 실행 (이미지 전환과 동시)
→ 해당 카드 하이라이트 상태 적용
→ 이전 카드 하이라이트 제거
```

### 3-B. Hover 상태 (Project Wall 카드에 마우스 올림)

- 셔플 타이머 일시정지 (clearInterval)
- 해당 프로젝트 대표 이미지로 즉시 교체 (fade 없이 즉시 또는 0.2s fade)
- 마우스가 Project Wall을 벗어나면 셔플 재개

### 3-C. Active 상태 (카드 클릭 후)

**셔플 완전 종료.**  
선택된 프로젝트의 슬라이드 시퀀스 표시.

**슬라이드 내비게이션:**
- 우측 드래그 (touch + mouse)
- 좌/우 화살표 버튼: Content Area 좌우 엣지에 고정 위치, hover 시에만 노출
  - 위치: `position: absolute`, `top: 50%`, `left: 24px` / `right: 24px`
  - 크기: 40px × 40px 원형 버튼, 배경 `rgba(0,0,0,0.3)`, 화살표 흰색
- 자동 진행 없음
- 슬라이드 전환: 수평 슬라이드 (transform: translateX), duration 400ms, ease-in-out

**슬라이드 인디케이터:**
- Content Area 하단 중앙: 현재 / 전체 (예: `03 / 08`)
- 12px, opacity: 0.6, 흰색 또는 검정 (이미지 밝기에 따라)

**URL 처리:**
```javascript
// 카드 클릭 시
window.history.pushState({}, '', `/work/${project.slug}`)
// Project Wall 복귀 시
window.history.pushState({}, '', '/')
```

### 3-D. Active → Idle 복귀

- 다른 카드 클릭: 즉시 해당 프로젝트로 전환 (셔플 재개 없이)
- 복귀 버튼 또는 ESC 키: 셔플 재개

---

## 4. 헤더 스펙

현재 헤더 구조 유지. 단 아래 항목 수정:

- 헤더 높이: 60px
- 배경: `#FFFFFF`
- 워드마크: 현재 스펙 그대로 (scroll-based color switching 유지)
- 내비게이션: 기존 항목 유지

---

## 5. 진입 시퀀스

현재 진입 시퀀스 (로딩 스피너 → nav → shimmer → 이미지 fade-in) 기반 유지.  
단 shimmer 대상이 캐러셀 → Content Area 전체로 변경.

로딩 완료 후:
1. 헤더 출현
2. Project Wall 카드 순차 fade-in (stagger: 50ms per card)
3. Content Area 첫 이미지 fade-in
4. 셔플 시작

---

## 6. 모바일 처리

현재 단계에서는 **기존 모바일 레이아웃 유지**.  
Project Wall은 데스크톱 전용 (min-width: 768px 이상에서만 활성화).  
768px 미만: Content Area만 전체 화면으로 표시, 셔플 유지.  
(Project Wall 모바일 구현은 추후 별도 스펙으로)

---

## 7. 구현 파일 타겟

- `src/app/page.tsx` — 전면 재작성
- `src/components/ProjectWall.tsx` — 신규 생성
- `src/components/ContentArea.tsx` — 신규 생성 (기존 캐러셀 로직 흡수)
- `src/data/projects.ts` — 변경 없음

---

## 8. 완료 검증 기준

- [ ] 1/3 : 2/3 레이아웃이 1280px 이상 뷰포트에서 정확히 분할됨
- [ ] 23개 프로젝트 카드가 Project Wall에 모두 표시됨
- [ ] 5개 카드가 뷰포트 내에 동시에 보임
- [ ] 셔플 전환 시 Project Wall 하이라이트 싱크 작동
- [ ] 카드 hover 시 셔플 일시정지 및 이미지 교체 작동
- [ ] 카드 클릭 시 URL 변경 + 슬라이드 모드 진입
- [ ] 슬라이드 화살표 및 드래그 작동
- [ ] 768px 미만에서 Project Wall 미표시
- [ ] `npx tsc` 에러 없음

