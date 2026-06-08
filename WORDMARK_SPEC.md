# WORDMARK_SPEC.md
## Paik Architecture — 워드마크·모노그램 완전 재구현
**버전:** v2 | **기준일:** 2026.06.08
**이 파일은 향후 워드마크 변경 시 덮어씌워 재사용한다.**

---

## 사전 작업

아래 파일의 현재 코드를 GitHub raw URL로 fetch한 뒤 시작한다.

```
https://raw.githubusercontent.com/PaikArchitects/paikarchitects/main/src/app/page.tsx
https://raw.githubusercontent.com/PaikArchitects/paikarchitects/main/src/app/globals.css
```

---

## v1 → v2 변경 이유

v1 구현 후 세 가지 문제 확인:
1. 자간 이상 — `.rest` inline-block 렌더링 부작용
2. 상단 정렬 — baseline 정렬 미적용
3. 회색 텍스트 — `mix-blend-mode: difference`가 회색 이미지 배경과 섞여 회색 생성

v2는 mix-blend-mode를 제거하고 **순수 흰색·검정색 전환**으로 교체한다.

---

## 1. globals.css — wordmark 스타일 (전면 교체)

기존 `.wordmark-container` 관련 CSS를 모두 제거하고 아래로 교체한다.

```css
/* ── WORDMARK ── */
.wordmark-container {
  display: flex;
  flex-direction: row;
  align-items: baseline;          /* 베이스라인 정렬 — 핵심 */
  font-size: 56px;
  line-height: 1;
  letter-spacing: -0.01em;        /* 자간 미세 조정 */
  white-space: nowrap;
  user-select: none;
  cursor: default;
  /* color와 position은 JS 인라인 스타일로 제어 */
}

.wordmark-container .word {
  display: inline-flex;
  align-items: baseline;
  overflow: hidden;
}

.wordmark-container .rest {
  display: inline-block;
  max-width: 400px;
  overflow: hidden;
  opacity: 1;
  white-space: nowrap;
  vertical-align: baseline;
  transition:
    max-width 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    opacity   0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.wordmark-container .word-space {
  display: inline-block;
  width: 0.3em;
  max-width: 0.3em;
  overflow: hidden;
  opacity: 1;
  transition:
    max-width 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    opacity   0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

/* collapsed 상태 */
.wordmark-container.collapsed .rest,
.wordmark-container.collapsed .word-space {
  max-width: 0;
  opacity: 0;
}
```

---

## 2. page.tsx — JSX 구조

```tsx
{/* 워드마크: hero 내 absolute → scroll 임계점에서 fixed */}
<div
  ref={wordmarkRef}
  className={`wordmark-container ${isCollapsed ? 'collapsed' : ''}`}
  style={{
    position: isCollapsed ? 'fixed' : 'absolute',
    top: isCollapsed ? '16px' : '33%',
    left: '20px',
    transform: isCollapsed ? 'none' : 'translateY(-50%)',
    color: isOverLight ? '#080706' : '#ffffff',   /* 순수 흰색 또는 검정만 */
    zIndex: 10,
    fontFamily: 'var(--font-pretendard, sans-serif)',
  }}
>
  {/* Architect — weight 900 */}
  <span className="word" style={{ fontWeight: 900 }}>
    <span className="initial">A</span>
    <span className="rest">rchitect</span>
  </span>

  {/* 공백 */}
  <span className="word-space">&nbsp;</span>

  {/* Changhyun — weight 400 */}
  <span className="word" style={{ fontWeight: 400 }}>
    <span className="initial">C</span>
    <span className="rest">hanghyun</span>
  </span>

  {/* 공백 */}
  <span className="word-space">&nbsp;</span>

  {/* Paik — weight 300 */}
  <span className="word" style={{ fontWeight: 300 }}>
    <span className="initial">P</span>
    <span className="rest">aik</span>
  </span>
</div>
```

---

## 3. page.tsx — 상태 및 scroll 핸들러

```tsx
// 상태 선언
const wordmarkRef = useRef<HTMLDivElement>(null);
const [isCollapsed, setIsCollapsed] = useState(false);
const [isOverLight, setIsOverLight] = useState(false);

// 밝은 배경 감지 함수
// 흰 배경 패널에 className="light-panel" 을 추가하고,
// ACP 위치(top: 28px, left: 40px)가 해당 요소와 겹치는지 확인
const checkOverLight = useCallback(() => {
  const acpCenterY = 28;   // top: 16px + 약 12px
  const acpCenterX = 40;
  const lightPanels = document.querySelectorAll('.light-panel');
  let over = false;
  lightPanels.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (
      rect.top    <= acpCenterY &&
      rect.bottom >= acpCenterY &&
      rect.left   <= acpCenterX &&
      rect.right  >= acpCenterX
    ) {
      over = true;
    }
  });
  setIsOverLight(over);
}, []);

// scroll 핸들러
useEffect(() => {
  const handleScroll = () => {
    const scrollY = window.scrollY;
    // 임계점: 워드마크(top 33vh)가 viewport top 16px에 도달하는 시점
    const threshold = window.innerHeight * 0.33 - 16;

    const collapsed = scrollY >= threshold;
    setIsCollapsed(collapsed);

    if (collapsed) {
      checkOverLight();
    } else {
      setIsOverLight(false); // hero 구간은 항상 어두운 배경
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, [checkOverLight]);
```

---

## 4. Work 섹션 — 흰 배경 패널에 className 추가

Work 섹션에서 배경이 `#FFFFFF`인 패널(텍스트 또는 이미지 패널)에
`className="light-panel"` 을 추가한다.

```tsx
{/* 예시: 흰 배경 텍스트 패널 */}
<div
  className="light-panel"
  style={{
    backgroundColor: '#FFFFFF',
    width: '50%',
    height: '100vh',
    position: 'sticky',
    top: 0,
    // ...
  }}
>
```

검정 배경(#080706) 패널에는 이 className을 추가하지 않는다.

---

## 5. Hero 컨테이너 — position: relative 확인

워드마크가 `position: absolute`로 작동하려면 hero 최상위 div에
`position: 'relative'`가 설정되어 있어야 한다. 현재 코드에 없으면 추가한다.

---

## 6. mix-blend-mode 완전 제거

v1에서 추가된 `mix-blend-mode: difference` 관련 코드를 모두 제거한다.
- globals.css의 mix-blend-mode 선언
- page.tsx 인라인 스타일의 mixBlendMode 속성
- 네비게이션(Work/About/Contact)에 적용된 mixBlendMode 속성

네비게이션 색상도 동일 원칙으로 교체한다:
```tsx
color: isOverLight ? '#080706' : '#ffffff'
```
이 값을 플로팅 nav에도 동일하게 적용한다.

---

## 7. 검증 체크리스트

- [ ] "Architect" 가 가장 두껍고 (900), "Paik" 이 가장 얇게 (300) 보임
- [ ] 세 단어가 하단(베이스라인) 기준으로 정렬됨 — 상단이 맞지 않아도 됨
- [ ] 글자 사이 자간이 자연스러움 (이상한 간격 없음)
- [ ] 히어로 구간: 어두운 이미지 위에서 텍스트가 순수 흰색 (#FFFFFF)
- [ ] 스크롤 → Work 흰 배경 패널 구간: ACP가 순수 검정 (#080706)으로 전환
- [ ] 스크롤 → Work 검정 배경 패널 구간: ACP가 순수 흰색 (#FFFFFF)
- [ ] 회색 텍스트가 어느 구간에서도 나타나지 않음
- [ ] 워드마크 → ACP 수축 애니메이션이 자연스러움
- [ ] ACP → 워드마크 역방향 전개도 자연스러움

---

*v2 — 2026.06.08 | mix-blend-mode 제거, 베이스라인 정렬 수정, 색상 전환 방식 교체*
