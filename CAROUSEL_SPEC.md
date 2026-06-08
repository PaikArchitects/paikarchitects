# CAROUSEL_SPEC.md
## Paik Architecture — 히어로 캐러셀 전환 방식 수정
**버전:** v1 | **기준일:** 2026.06.08
**이 파일은 향후 캐러셀 변경 시 덮어씌워 재사용한다.**

---

## 사전 작업

아래 파일의 현재 코드를 GitHub raw URL로 fetch한 뒤 시작한다.

```
https://raw.githubusercontent.com/PaikArchitects/paikarchitects/main/src/app/page.tsx
```

---

## 변경 목표

현재 캐러셀은 cross-dissolve (두 이미지가 동시에 fade) 방식이다.
이를 **암전 fade** 방식으로 전면 교체한다.

암전 fade란: 현재 이미지 → 검정으로 fade-out → 순수 검정 유지 → 다음 이미지 fade-in.
이 방식은 이미지 전환 사이에 워드마크가 순수 검정 위에서 선명하게 노출되는 효과를 만든다.

---

## 1. 타이밍 수정

| 항목 | 현재 | 수정 후 |
|---|---|---|
| 이미지 체류 시간 | 8000ms | **3000ms** |
| 전환 방식 | cross-dissolve | **암전 fade** |
| fade-out 시간 | — | **400ms** |
| 검정 유지 시간 | — | **200ms** |
| fade-in 시간 | — | **400ms** |
| 총 사이클 | ~9000ms | **4000ms** (체류 3000 + 전환 1000) |

---

## 2. 구현 방식

### 현재 구조 (cross-dissolve)
현재 구현은 이미지 두 장을 `position: absolute`로 겹쳐 놓고 opacity를 교차하는 방식으로 추정된다.

### 신규 구조 (암전 fade)

**핵심 아이디어:**  
이미지 레이어 위에 순수 검정 오버레이 div를 하나 추가한다.
전환 시 이 오버레이를 fade-in → 이미지 교체 → fade-out 순서로 실행한다.

```tsx
// 상태 관리
const [currentIndex, setCurrentIndex] = useState(0);
const [isBlacking, setIsBlacking] = useState(false); // 암전 오버레이 상태

// 전환 함수
const advanceSlide = useCallback(() => {
  // 1단계: 검정 오버레이 fade-in (400ms)
  setIsBlacking(true);
  
  setTimeout(() => {
    // 2단계: 검정 유지 중 이미지 교체 (200ms)
    setCurrentIndex(prev => (prev + 1) % shuffledProjects.length);
    
    setTimeout(() => {
      // 3단계: 검정 오버레이 fade-out (400ms)
      setIsBlacking(false);
    }, 200);
  }, 400);
}, [shuffledProjects.length]);

// 타이머: 3000ms마다 실행
useEffect(() => {
  const timer = setInterval(advanceSlide, 4000); // 사이클 전체 = 3000 체류 + 1000 전환
  return () => clearInterval(timer);
}, [advanceSlide]);
```

```tsx
// JSX — 히어로 이미지 레이어
<div style={{ position: 'relative', width: '100%', height: '100%' }}>
  
  {/* 현재 이미지 (단일, 교체 방식) */}
  {currentProject.coverImage ? (
    <Image
      src={currentProject.coverImage}
      alt={currentProject.title}
      fill
      style={{ objectFit: 'cover' }}
      priority
    />
  ) : (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#080706' }} />
  )}

  {/* 암전 오버레이 */}
  <div
    style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: '#000000',
      opacity: isBlacking ? 1 : 0,
      transition: isBlacking
        ? 'opacity 400ms ease-in'   // fade-out (이미지 → 검정)
        : 'opacity 400ms ease-out', // fade-in (검정 → 이미지)
      zIndex: 1,
      pointerEvents: 'none',
    }}
  />
</div>
```

**주의:** 워드마크·네비게이션·캡션 등 모든 UI 요소는 암전 오버레이(zIndex: 1)보다 높은 zIndex를 유지해야 한다. 검정 전환 중에도 이 요소들은 계속 보여야 한다.

---

## 3. 이미지 없는 프로젝트 처리

PALETTE 폴백은 이미 DESIGN_SYSTEM_SPEC.md에서 `#080706`으로 통일되었다.
이 스펙에서는 별도 처리 불필요. `coverImage`가 없으면 `#080706` div를 표시하면 된다.
암전 오버레이가 동작할 때 배경도 검정이므로 전환이 자연스럽게 처리된다.

---

## 4. 제거 대상

현재 cross-dissolve 구현에 사용된 아래 요소들을 제거한다:
- 두 번째 이미지 레이어 (prevIndex 또는 nextIndex 관련 상태 및 JSX)
- 이미지 간 opacity 교차 transition
- cross-dissolve 관련 CSS keyframe (있을 경우)

---

## 5. 검증 체크리스트

- [ ] 이미지가 있는 프로젝트: 체류 3초 후 검정으로 암전, 다음 이미지 등장
- [ ] 암전 순간 워드마크("Architect Changhyun Paik" 또는 "ACP")가 순수 검정 위에서 선명하게 보임
- [ ] 이미지가 없는 프로젝트: #080706 배경 → 암전 → 다음 슬라이드 (자연스럽게 연결)
- [ ] 전환 중 네비게이션·캡션·스크롤 인디케이터가 사라지지 않음
- [ ] 전체 사이클이 약 4초(3초 체류 + 1초 전환)로 체감됨

---

*v1 — 2026.06.08*
*다음 덮어씌우기 시: 버전 번호와 기준일만 수정*
