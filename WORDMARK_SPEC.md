# WORDMARK_SPEC.md
## Paik Architecture — 워드마크·모노그램 완전 재구현
**버전:** v1 | **기준일:** 2026.06.08
**이 파일은 향후 워드마크 변경 시 덮어씌워 재사용한다.**

---

## 사전 작업

아래 파일의 현재 코드를 GitHub raw URL로 fetch한 뒤 시작한다.

```
https://raw.githubusercontent.com/PaikArchitects/paikarchitects/main/src/app/page.tsx
https://raw.githubusercontent.com/PaikArchitects/paikarchitects/main/src/app/globals.css
```

---

## 변경 목표 요약

| 항목 | 현재 | 수정 후 |
|---|---|---|
| 웨이트 위계 | Architect=300, Changhyun=500, Paik=700 | **Architect=900, Changhyun=400, Paik=300** |
| 폰트 크기 | ~42px | **56px** (확장·수축 상태 동일) |
| 수직 정렬 | 상단정렬 (top-aligned) | **베이스라인 정렬 (baseline)** |
| position 구조 | 항상 fixed | **hero 내 absolute → scroll 임계점에서 fixed 전환** |
| ACP 관계 | 워드마크와 별개 요소 | **동일 요소, .rest·.space 수축으로 구현** |

---

## 1. HTML 구조 재설계

워드마크와 ACP는 **하나의 동일한 요소**다.
각 단어를 이니셜 span(.initial)과 나머지 span(.rest)으로 분리한다.
단어 사이 공백도 별도 span(.space)으로 처리한다.

```tsx
<div className="wordmark-container" ref={wordmarkRef}>
  {/* Architect */}
  <span className="word" style={{ fontWeight: 900 }}>
    <span className="initial">A</span>
    <span className="rest">rchitect</span>
  </span>

  {/* 공백 */}
  <span className="space"> </span>

  {/* Changhyun */}
  <span className="word" style={{ fontWeight: 400 }}>
    <span className="initial">C</span>
    <span className="rest">hanghyun</span>
  </span>

  {/* 공백 */}
  <span className="space"> </span>

  {/* Paik */}
  <span className="word" style={{ fontWeight: 300 }}>
    <span className="initial">P</span>
    <span className="rest">aik</span>
  </span>
</div>
```

---

## 2. CSS 스타일

### wordmark-container (globals.css에 추가)

```css
.wordmark-container {
  display: flex;
  align-items: baseline;        /* 핵심: 베이스라인 정렬 */
  font-size: 56px;
  font-family: 'Pretendard Variable', sans-serif;
  color: #FFFFFF;
  line-height: 1;
  white-space: nowrap;
  mix-blend-mode: difference;   /* DESIGN_SYSTEM_SPEC에서 적용된 값 유지 */
  position: absolute;           /* 초기값. JS로 fixed 전환 */
  left: 20px;
  top: 33%;
  transform: translateY(-50%);  /* 수직 중앙 기준 */
  cursor: default;
  user-select: none;
}

/* .rest 와 .space — collapse 애니메이션 대상 */
.wordmark-container .rest,
.wordmark-container .space {
  display: inline-block;
  max-width: 200px;             /* 충분히 큰 값 */
  overflow: hidden;
  opacity: 1;
  vertical-align: baseline;
  transition:
    max-width 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* collapsed 상태 */
.wordmark-container.collapsed .rest,
.wordmark-container.collapsed .space {
  max-width: 0;
  opacity: 0;
}

/* fixed 상태 (JS로 클래스 추가) */
.wordmark-container.fixed {
  position: fixed;
  top: 16px;
  transform: none;              /* fixed 전환 후 transform 제거 */
}
```

---

## 3. JavaScript — scroll 감지 및 상태 전환

```tsx
const wordmarkRef = useRef<HTMLDivElement>(null);
const heroRef = useRef<HTMLDivElement>(null);   // hero 컨테이너에 ref 추가

useEffect(() => {
  const handleScroll = () => {
    const scrollY = window.scrollY;

    // 임계점 계산:
    // 워드마크 초기 위치 = hero 상단(0) + 33vh - 절반 높이(약 28px) ≈ 0.33 * 100vh
    // fixed 목표 top = 16px
    // threshold = 0.33 * 100vh - 16px
    const threshold = window.innerHeight * 0.33 - 16;

    const el = wordmarkRef.current;
    if (!el) return;

    if (scrollY >= threshold) {
      el.classList.add('collapsed');
      el.classList.add('fixed');
    } else {
      el.classList.remove('collapsed');
      el.classList.remove('fixed');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

---

## 4. Hero 컨테이너 설정

워드마크가 `position: absolute`로 동작하려면 hero 컨테이너에 `position: relative`가 필요하다.

```tsx
// hero 최상위 div
<div
  ref={heroRef}
  style={{
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#080706',
  }}
>
  {/* 캐러셀 이미지 레이어 */}
  {/* 암전 오버레이 레이어 */}
  {/* 워드마크 */}
  <div ref={wordmarkRef} className="wordmark-container">
    ...
  </div>
  {/* 캡션, 스크롤 인디케이터, 플로팅 nav */}
</div>
```

**주의:** 플로팅 네비게이션(Work/About/Contact)은 `position: fixed`이므로 hero 컨테이너 안에 있어도 무방하다.

---

## 5. zIndex 정리

| 요소 | zIndex |
|---|---|
| 히어로 이미지 | 0 |
| 암전 오버레이 (CAROUSEL_SPEC) | 1 |
| 워드마크·ACP | 10 |
| 캡션 | 10 |
| 스크롤 인디케이터 | 10 |
| 플로팅 네비게이션 | 20 |

---

## 6. 기존 코드 정리 대상

현재 구현에서 아래 항목을 찾아 제거한다:
- 워드마크 관련 `useState` (isCollapsed 등) → useRef + classList 방식으로 대체
- 인라인 style로 처리된 wordmark position/top 전환 로직
- 별도 ACP 요소가 있다면 제거 (하나의 wordmark-container로 통합)
- shimmerReveal keyframe은 globals.css에 유지 (ENTRY_SPEC에서 사용)

---

## 7. 검증 체크리스트

배포 후 아래 순서로 확인한다.

- [ ] 워드마크 "Architect Changhyun Paik"에서 Architect가 가장 두껍고, Paik이 가장 얇게 보임
- [ ] 세 단어가 베이스라인(하단)에 정렬됨 — 현재처럼 상단이 맞지 않음
- [ ] 폰트 크기가 이전보다 명확히 크게 보임 (56px)
- [ ] 스크롤 시작 시 워드마크가 hero 이미지와 함께 위로 올라가다가 상단에서 멈춤
- [ ] 멈추는 순간 "rchitect", " ", "hanghyun", " ", "aik"이 우→좌로 수축하여 "ACP"만 남음
- [ ] ACP의 폰트 크기가 워드마크와 동일 (56px)하게 보임
- [ ] 스크롤을 다시 내리면 ACP → 워드마크로 역방향 전개
- [ ] 전환 중 깜빡임·위치 점프 없음

---

*v1 — 2026.06.08*
*다음 덮어씌우기 시: 버전 번호와 기준일만 수정*
