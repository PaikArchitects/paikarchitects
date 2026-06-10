# LANDING_POLISH_SPEC.md
## Paik Architecture — 랜딩 UI 개선 2차 스펙 (수정본)
**작성일:** 2026.06.10  
**적용 대상:** `src/app/page.tsx`, `src/app/globals.css`, `src/components/ProjectWall.tsx`, `src/components/ContentArea.tsx`

---

## 변경 항목 요약

| # | 대상 | 변경 내용 |
|---|---|---|
| 1 | 오프닝 시퀀스 | 5초 로딩 제거 → 중앙 워드마크 → ACP collapse → 좌상단 이동 (크기 변화 없음) |
| 2 | 내비게이션 | 우하단 수직 → 우상단 수평, 텍스트 크기 13px |
| 3 | Project Wall 프로젝트명 | 우측 정렬, 이미지 밀착, 폰트 크기 증가 |
| 4 | ProjectWall / ContentArea 구분 | 두 영역 사이 여백 추가 |
| 5 | Active 상태 이미지 | ContentArea 내 패딩 처리 (여백 있는 이미지) |

---

## 변경 1: 오프닝 시퀀스 전면 교체

### 1-A. 현재 제거 대상
- 5초 강제 로딩 딜레이 로직 전체 제거
- `isLoading`, `showContent` 등 로딩 관련 state 및 타이머 전부 제거

### 1-B. 신규 오프닝 시퀀스 (총 약 3.1s)

```
Phase 1 (0ms ~ 300ms)
  - 배경: #080706 전체 화면
  - 화면 정중앙에 워드마크 fade-in (opacity 0→1, 300ms ease-out)
  - 텍스트: "Architect Changhyun Paik"
  - 스타일: A=w900 / C=w400 / P=w300
  - font-size: 32px  ← BIG 로고 기준 높이
  - color: #FFFFFF
  - position: fixed, top: 50%, left: 50%, transform: translate(-50%, -50%)
  - ProjectWall / ContentArea / Navigation: opacity 0 (숨김)

Phase 2 (2300ms ~ 2700ms) — Collapse 애니메이션
  - "rchitect", " ", "hanghyun", " ", "ai" 부분이 max-width: 0 / opacity: 0으로 수렴
  - 남은 "A", "C", "P" 가 밀착 → "ACP" 형태 완성
  - 지속시간: 400ms
  - transition: max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)
  - font-size: 32px 유지 (크기 변화 없음)
  - position: fixed, top: 50%, left: 50%, transform: translate(-50%, -50%) 유지

Phase 3 (2700ms ~ 3100ms) — 위치 이동
  - ACP 모노그램이 화면 중앙 → 좌상단으로 translate 이동
  - 종료 위치: fixed, top: 20px, left: 24px
  - transform: translate(0, 0) 으로 전환 (translate(-50%, -50%) 해제)
  - font-size: 32px 유지 (크기 변화 없음)
  - transition: top 0.4s ease-out, left 0.4s ease-out, transform 0.4s ease-out
  - 주의: position은 fixed 유지, transform만 변경

Phase 4 (3100ms ~) — 레이아웃 진입
  - ProjectWall fade-in (opacity 0→1, 400ms ease-out)
  - ContentArea fade-in (opacity 0→1, 400ms ease-out)
  - Navigation fade-in (opacity 0→1, 400ms ease-out)
  - ACP 모노그램 좌상단 고정 완료
```

### 1-C. 구현 방식

`page.tsx`에 `introPhase` state 추가:

```typescript
type IntroPhase = 'wordmark' | 'collapse' | 'move' | 'done'
const [introPhase, setIntroPhase] = useState<IntroPhase>('wordmark')
```

useEffect 타이머 체인:
```typescript
useEffect(() => {
  const t1 = setTimeout(() => setIntroPhase('collapse'), 2300)
  const t2 = setTimeout(() => setIntroPhase('move'), 2700)
  const t3 = setTimeout(() => setIntroPhase('done'), 3100)
  return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
}, [])
```

### 1-D. 워드마크 컴포넌트 HTML 구조 (기존 구조 준용)

```html
<div class="wordmark-intro">
  <span style="font-weight: 900">
    <span class="initial">A</span>
    <span class="rest">rchitect</span>
  </span>
  <span class="spacer"> </span>
  <span style="font-weight: 400">
    <span class="initial">C</span>
    <span class="rest">hanghyun</span>
  </span>
  <span class="spacer"> </span>
  <span style="font-weight: 300">
    <span class="initial">P</span>
    <span class="rest">aik</span>
  </span>
</div>
```

collapse 시 `.rest`, `.spacer`에:
```css
max-width: 0;
opacity: 0;
overflow: hidden;
transition: max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1),
            opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
```

### 1-E. ACP 최종 고정 스타일 (Phase done 이후)
```css
position: fixed;
top: 20px;
left: 24px;
font-size: 32px;   /* 오프닝과 동일 크기 유지 */
transform: none;
```

---

## 변경 2: 내비게이션 위치 및 스타일

### 2-A. 위치 및 배열 변경
| 항목 | 현재 | 변경 후 |
|---|---|---|
| 위치 | fixed, bottom: 24px, right: 24px | fixed, top: 24px, right: 24px |
| flex-direction | column | row |
| gap | (수직 간격) | 32px |
| align-items | — | center |

### 2-B. 텍스트 스타일
| 항목 | 현재 | 변경 후 |
|---|---|---|
| font-size | 18px | 13px |
| font-weight | 300 | 300 유지 |
| letter-spacing | 현재값 | 0.08em |
| text-transform | 현재값 | uppercase 유지 |

### 2-C. CSS 수정
```css
.nav-container {
  position: fixed;
  top: 24px;
  right: 24px;
  display: flex;
  flex-direction: row;
  gap: 32px;
  align-items: center;
  z-index: 100;
}

.nav-item {
  font-size: 13px;
  font-weight: 300;
  letter-spacing: 0.08em;
  color: #FFFFFF;
  text-decoration: none;
  text-transform: uppercase;
}

.nav-item:hover {
  text-decoration: underline;
}
```

---

## 변경 3: Project Wall 프로젝트명 레이아웃

### 3-A. 프로젝트명 정렬 변경
`src/components/ProjectWall.tsx` 내 텍스트 블록:

| 항목 | 현재 | 변경 후 |
|---|---|---|
| text-align | left | right |
| padding-right | 기존값 | 8px (이미지와의 최소 여백) |
| font-size | 14px | 16px |
| font-weight | 300 | 400 |

위치명(location) 텍스트:
| 항목 | 현재 | 변경 후 |
|---|---|---|
| font-size | 10px | 11px |
| text-align | left | right |
| opacity | 0.5 | 0.6 |
| padding-right | 기존값 | 8px |

텍스트 블록 내 정렬:
```css
.card-text-block {
  text-align: right;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;
  padding-right: 8px;
}
```

---

## 변경 4: ProjectWall / ContentArea 구분 여백

### 4-A. 두 영역 사이 처리
현재 ProjectWall(1/3)과 ContentArea(2/3)가 경계 없이 맞닿아 있음.

변경 방법:
- ProjectWall 우측에 `border-right: 1px solid rgba(255, 255, 255, 0.12)` 추가
- 또는 레이아웃 컨테이너에 `column-gap: 24px` 추가 (ProjectWall 배경이 다르다면 gap 방식)
- 두 방법 중 현재 구현 구조에 맞는 것 선택하여 적용

권장: border-right 방식 (gap은 비율 1/3:2/3이 틀어질 수 있음)

```css
.project-wall {
  border-right: 1px solid rgba(255, 255, 255, 0.12);
}
```

---

## 변경 5: Active 상태 이미지 패딩 처리

### 5-A. 현재 문제
카드 클릭(Active) 시 이미지가 ContentArea 전체를 풀블리드로 채움.

### 5-B. 변경 방향
ContentArea 내에서 이미지가 상하좌우 여백을 두고 표시.
크기 기준: BIG 상세 페이지 히어로 이미지 수준
(ContentArea 내 padding: 48px 적용)

### 5-C. ContentArea Active 상태 이미지 CSS
```css
/* Idle 상태: 풀블리드 유지 */
.content-area-image.idle {
  width: 100%;
  height: 100%;
  object-fit: cover;
  padding: 0;
}

/* Active 상태: 여백 있는 이미지 */
.content-area-image.active {
  width: calc(100% - 96px);   /* 좌우 48px씩 */
  height: calc(100% - 96px);  /* 상하 48px씩 */
  margin: 48px;
  object-fit: contain;
  background-color: #080706;
}
```

또는 ContentArea Active 래퍼에 padding 적용:
```css
.content-area-slide-wrapper.active {
  padding: 48px;
  box-sizing: border-box;
}

.content-area-slide-wrapper.active img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
```

### 5-D. 전환 효과
Idle → Active 전환 시 padding이 0 → 48px로 변화하면서 이미지가 자연스럽게 수축:
```css
.content-area-slide-wrapper {
  transition: padding 0.4s ease-out;
}
```

---

## 검증

모든 수정 완료 후:
```
npx tsc --noEmit
```
에러 없을 때만 완료 처리.

---

*LANDING_POLISH_SPEC.md — 2026.06.10 수정본*
