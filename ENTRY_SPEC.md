# ENTRY_SPEC.md
## Paik Architecture — 진입 시퀀스 구현
**버전:** v1 | **기준일:** 2026.06.08
**이 파일은 향후 진입 시퀀스 변경 시 덮어씌워 재사용한다.**

---

## 사전 작업

아래 파일의 현재 코드를 GitHub raw URL로 fetch한 뒤 시작한다.

```
https://raw.githubusercontent.com/PaikArchitects/paikarchitects/main/src/app/page.tsx
https://raw.githubusercontent.com/PaikArchitects/paikarchitects/main/src/app/globals.css
```

---

## 목표: 4단계 진입 시퀀스

실제 이미지 로딩 완료 여부와 무관하게 아래 순서를 강제한다.

```
① 순수 검정 화면 + 원형 로딩 스피너   (0ms ~ 10000ms)
② 스피너 fade-out + 우하단 nav 출현   (10000ms ~ 10400ms)
③ 워드마크 shimmer 애니메이션         (10400ms ~ 11600ms)
④ 캐러셀 첫 이미지 fade-in            (11600ms ~)
```

---

## 1. 상태 관리

```tsx
// 진입 시퀀스 단계
type EntryPhase = 'loading' | 'nav' | 'shimmer' | 'done';
const [entryPhase, setEntryPhase] = useState<EntryPhase>('loading');

useEffect(() => {
  // ① loading → ② nav (10초 후)
  const t1 = setTimeout(() => setEntryPhase('nav'), 10000);

  // ② nav → ③ shimmer (10.4초 후)
  const t2 = setTimeout(() => setEntryPhase('shimmer'), 10400);

  // ③ shimmer → ④ done (11.6초 후)
  const t3 = setTimeout(() => setEntryPhase('done'), 11600);

  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);
  };
}, []);
```

---

## 2. 로딩 오버레이 (① 단계)

히어로 전체를 덮는 순수 검정 오버레이. `entryPhase === 'loading'` 동안 표시.
`entryPhase === 'nav'` 진입 시 fade-out.

```tsx
{/* 로딩 오버레이 */}
<div
  style={{
    position: 'fixed',
    inset: 0,
    backgroundColor: '#000000',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: entryPhase === 'loading' ? 1 : 0,
    transition: entryPhase === 'loading' ? 'none' : 'opacity 400ms ease-out',
    pointerEvents: entryPhase === 'loading' ? 'auto' : 'none',
  }}
>
  {/* 원형 스피너 */}
  <div className="entry-spinner" />
</div>
```

---

## 3. 원형 스피너 CSS (globals.css에 추가)

```css
/* ── ENTRY SPINNER ── */
.entry-spinner {
  width: 32px;
  height: 32px;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  border-top-color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## 4. 워드마크 shimmer 제어 (③ 단계)

워드마크의 shimmer 애니메이션은 `entryPhase === 'shimmer'` 일 때만 실행된다.
`entryPhase === 'loading'` 또는 `'nav'` 동안 워드마크는 완전히 투명(opacity: 0)이어야 한다.

```tsx
{/* 워드마크 컨테이너에 적용 */}
<div
  ref={wordmarkRef}
  className={`wordmark-container ${isCollapsed ? 'collapsed' : ''} ${entryPhase === 'shimmer' ? 'shimmer-active' : ''}`}
  style={{
    // ... 기존 position, color 스타일 유지
    opacity: entryPhase === 'loading' || entryPhase === 'nav' ? 0 : 1,
    transition: entryPhase === 'shimmer' ? 'none' : 'opacity 0.3s ease',
  }}
>
```

globals.css의 shimmerReveal keyframe을 `.shimmer-active` 클래스로 트리거:

```css
/* globals.css — 기존 shimmerReveal keyframe 유지 */
.wordmark-container.shimmer-active {
  -webkit-mask-image: linear-gradient(
    90deg,
    transparent 0%,
    black 30%,
    black 70%,
    transparent 100%
  );
  -webkit-mask-size: 200% 100%;
  mask-image: linear-gradient(
    90deg,
    transparent 0%,
    black 30%,
    black 70%,
    transparent 100%
  );
  mask-size: 200% 100%;
  animation: shimmerReveal 1.2s ease-out forwards;
}

@keyframes shimmerReveal {
  0%   { -webkit-mask-position: -100% center; mask-position: -100% center; }
  100% { -webkit-mask-position: 100% center;  mask-position: 100% center; }
}
```

---

## 5. 네비게이션 출현 제어 (② 단계)

플로팅 nav(Work/About/Contact)는 `entryPhase === 'nav'` 이후부터 표시된다.

```tsx
{/* 플로팅 nav 컨테이너 */}
<div
  style={{
    // ... 기존 스타일 유지
    opacity: entryPhase === 'loading' ? 0 : 1,
    transition: 'opacity 400ms ease-out',
  }}
>
```

---

## 6. 캐러셀 이미지 출현 제어 (④ 단계)

캐러셀 이미지 레이어는 `entryPhase === 'done'` 이후부터 fade-in된다.

```tsx
{/* 이미지 레이어 */}
<div
  style={{
    opacity: entryPhase === 'done' ? 1 : 0,
    transition: entryPhase === 'done' ? 'opacity 800ms ease-out' : 'none',
  }}
>
  {/* 현재 이미지 또는 #080706 폴백 */}
</div>
```

---

## 7. 캡션·스크롤 인디케이터 출현 제어

캡션과 ↓ 스크롤 인디케이터도 `entryPhase === 'done'` 이후부터 표시된다.

```tsx
opacity: entryPhase === 'done' ? 1 : 0,
transition: 'opacity 600ms ease-out',
```

---

## 8. 검증 체크리스트

- [ ] 페이지 로드 즉시: 순수 검정 화면 + 중앙 원형 스피너만 보임
- [ ] 10초 후: 스피너 사라지고 우하단 Work/About/Contact 텍스트만 검정 위에 출현
- [ ] 10.4초 후: 워드마크 shimmer 시작 (좌→우, 1.2초)
- [ ] 11.6초 후: 캐러셀 첫 이미지 fade-in + 캡션 + 스크롤 인디케이터 출현
- [ ] 이미지 없는 프로젝트는 #080706으로 표시 (검정이므로 자연스럽게 연결)
- [ ] 전체 시퀀스 중 흰색·회색 배경이 노출되지 않음

---

*v1 — 2026.06.08*
*다음 덮어씌우기 시: 버전 번호, 기준일, 타이밍 값만 수정*
