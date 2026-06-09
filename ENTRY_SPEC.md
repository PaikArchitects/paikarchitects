# ENTRY_SPEC.md
## Paik Architecture — 진입 시퀀스 구현
**버전:** v2 | **기준일:** 2026.06.08
**이 파일은 향후 진입 시퀀스 변경 시 덮어씌워 재사용한다.**

---

## v1 → v2 변경 내용

강제 로딩 시간: 10초 → **5초**

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
① 순수 검정 화면 + 원형 로딩 스피너   (0ms ~ 5000ms)
② 스피너 fade-out + 우하단 nav 출현   (5000ms ~ 5400ms)
③ 워드마크 shimmer 애니메이션         (5400ms ~ 6600ms)
④ 캐러셀 첫 이미지 fade-in            (6600ms ~)
```

---

## 1. 상태 관리

```tsx
type EntryPhase = 'loading' | 'nav' | 'shimmer' | 'done';
const [entryPhase, setEntryPhase] = useState<EntryPhase>('loading');

useEffect(() => {
  const t1 = setTimeout(() => setEntryPhase('nav'),     5000);  // ① → ②
  const t2 = setTimeout(() => setEntryPhase('shimmer'), 5400);  // ② → ③
  const t3 = setTimeout(() => setEntryPhase('done'),    6600);  // ③ → ④

  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);
  };
}, []);
```

---

## 2. 로딩 오버레이 (① 단계)

히어로 전체를 덮는 순수 검정 오버레이.

```tsx
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
  <div className="entry-spinner" />
</div>
```

---

## 3. 원형 스피너 CSS (globals.css에 추가)

```css
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

`entryPhase === 'loading'` 또는 `'nav'` 동안 워드마크는 완전히 투명하다.
`entryPhase === 'shimmer'` 진입 시 `.shimmer-active` 클래스를 추가하여 애니메이션 트리거.

```tsx
<div
  ref={wordmarkRef}
  className={`wordmark-container
    ${isCollapsed ? 'collapsed' : ''}
    ${entryPhase === 'shimmer' ? 'shimmer-active' : ''}
  `}
  style={{
    opacity: entryPhase === 'loading' || entryPhase === 'nav' ? 0 : 1,
    transition: entryPhase === 'shimmer' ? 'none' : 'opacity 0.3s ease',
    // 나머지 position, color 스타일은 WORDMARK_SPEC 그대로 유지
  }}
>
```

globals.css shimmer keyframe (기존 shimmerReveal 유지 또는 추가):

```css
.wordmark-container.shimmer-active {
  -webkit-mask-image: linear-gradient(
    90deg, transparent 0%, black 30%, black 70%, transparent 100%
  );
  -webkit-mask-size: 200% 100%;
  mask-image: linear-gradient(
    90deg, transparent 0%, black 30%, black 70%, transparent 100%
  );
  mask-size: 200% 100%;
  animation: shimmerReveal 1.2s ease-out forwards;
}

@keyframes shimmerReveal {
  0%   { -webkit-mask-position: -100% center; mask-position: -100% center; }
  100% { -webkit-mask-position:  100% center; mask-position:  100% center; }
}
```

---

## 5. 네비게이션 출현 제어 (② 단계)

```tsx
<div style={{
  opacity: entryPhase === 'loading' ? 0 : 1,
  transition: 'opacity 400ms ease-out',
}}>
  {/* ABOUT / WORKS / ESSAYS / CONTACTS */}
</div>
```

---

## 6. 캐러셀 이미지 + 캡션 + 스크롤 인디케이터 출현 제어 (④ 단계)

```tsx
// 이미지 레이어
opacity: entryPhase === 'done' ? 1 : 0,
transition: entryPhase === 'done' ? 'opacity 800ms ease-out' : 'none',

// 캡션 + 스크롤 인디케이터
opacity: entryPhase === 'done' ? 1 : 0,
transition: 'opacity 600ms ease-out',
```

---

## 7. 검증 체크리스트

- [ ] 페이지 로드 즉시: 순수 검정 + 중앙 원형 스피너만 표시
- [ ] 5초 후: 스피너 사라지고 우하단 nav(ABOUT/WORKS/ESSAYS/CONTACTS)만 출현
- [ ] 5.4초 후: 워드마크 shimmer 시작 (좌→우, 1.2초)
- [ ] 6.6초 후: 캐러셀 이미지 + 캡션 + 스크롤 인디케이터 fade-in
- [ ] 전체 시퀀스 중 흰색·회색 배경 노출 없음

---

*v2 — 2026.06.08 | 강제 로딩 시간 10초 → 5초*
