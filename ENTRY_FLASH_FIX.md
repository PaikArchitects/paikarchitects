# ENTRY_FLASH_FIX — 인트로 ACP 선행 플래시 버그 수정

## 수정 대상
`src/components/SiteChromeContext.tsx` — 단일 파일, 2개 지점

---

## 원인 요약
Next.js SSR은 React 초기값(`introPhase: 'done'`, `introSkipped: true`)으로 HTML을 렌더링한다.
이 상태는 SiteHeader에서 `wordmark-intro collapsed moved instant` 클래스를 생성하며,
CSS `opacity: 1`로 인해 ACP 모노그램이 좌상단에 즉시 표시된다.
브라우저는 JS 로딩·hydration 이전에 이 HTML을 먼저 그리므로,
`useLayoutEffect`가 올바른 상태로 교정하기 전에 ACP 플래시가 발생한다.

---

## 수정 내용

### 수정 1 — 초기값 변경 (2행)

```typescript
// ❌ BEFORE
const [introPhase, setIntroPhase] = useState<IntroPhase>('done')
const [introSkipped, setIntroSkipped] = useState(true)

// ✅ AFTER
const [introPhase, setIntroPhase] = useState<IntroPhase>('wordmark')
const [introSkipped, setIntroSkipped] = useState(false)
```

**효과:** SSR HTML이 `wordmark-intro`(클래스 없음)로 렌더링된다.
CSS 기본값 `opacity: 0`이 적용되어 hydration 이전 화면에 아무것도 표시되지 않는다.

---

### 수정 2 — skip 분기에 명시적 상태 설정 추가

기존 `useIsomorphicLayoutEffect` 내부의 early return 분기를 아래와 같이 수정한다.

```typescript
// ❌ BEFORE
if (played || pathname !== '/') {
  try { sessionStorage.setItem(INTRO_STORAGE_KEY, '1') } catch {}
  return
}

// ✅ AFTER
if (played || pathname !== '/') {
  try { sessionStorage.setItem(INTRO_STORAGE_KEY, '1') } catch {}
  setIntroPhase('done')
  setIntroSkipped(true)
  return
}
```

**효과:** 재방문·비랜딩 페이지 진입 시 `useLayoutEffect`(브라우저 페인트 이전 실행)가
즉시 `done + instant` 상태로 전환한다. 사용자는 플래시 없이 ACP를 곧바로 본다.

---

## 수정 후 전체 시퀀스

| 방문 유형 | SSR 초기 페인트 | useLayoutEffect 이후 |
|---|---|---|
| 첫 방문 (`/`) | `opacity: 0` (불가시) | `wordmark` → 중앙 fade-in 인트로 정상 재생 |
| 재방문 or 비랜딩 | `opacity: 0` (불가시) | `done + instant` → ACP 즉시 표시 |

---

## 검증 방법
```bash
npx tsc --noEmit
```
타입 오류 없으면 완료. 브라우저에서 세션 스토리지를 클리어한 뒤 `/` 접속하여 시퀀스 확인.
