# MOBILE_ENTRY_FIX_SPEC

**목적:** 모바일(<768px) 최초 진입 시, 첫 프로젝트가 수직 중앙의 애매한 위치에 잠시 놓였다가 상단으로 점프하는 현상을 제거한다. 방향 B — **최초 진입 1회에 한해 unfolding 펼침 트랜지션을 생략하고 즉시 idle(펼쳐진 상단 정렬) 상태로 진입**한다.

**대상 파일**
- `src/components/MobileProjectWall.tsx`

**적용 범위 (절대 조항):**
- **최초 진입 1회만** 우회한다. 필터 변경에 의한 `folding→pre→unfolding→idle` 재펼침 연출은 **그대로 보존**한다.
- v4.1 동결 로직(셔플, 위계 판정, 확장 모프, FLIP, 트랙 스냅, active 중앙 정렬)은 일절 수정하지 않는다.
- 데스크톱·태블릿 코드는 일절 건드리지 않는다.
- 검증은 `npx tsc --noEmit`만. `npm run dev` / `npm run build` 금지.

---

## 원인 (확정)

진입 시 `phase`는 `'pre'`(folded)로 시작한다. folded 상태에서 모든 카드의 페어 레이어가 `gridTemplateRows: '0fr'`로 수축되어 리스트 전체 높이가 거의 0이다. 이 상태에서 `scrollTop=0`이면 첫 카드가 상단 근처 작은 영역에 모여, 리스트가 짧은 탓에 **화면상 수직 중앙처럼 보인다.** 이어 `phase='unfolding'`으로 전환되며 카드들이 위에서부터 stagger로 펼쳐지고, 리스트가 제 높이를 갖추면서 첫 카드가 최종 상단 위치로 이동한다. 이 이동이 "중앙→점프"로 인지된다.

→ 최초 진입에서 unfolding 과도기를 제거하면, 첫 카드가 처음부터 펼쳐진 상단 정렬 상태로 나타나 과도기가 사라진다.

---

## 변경 명세

### S1. 최초 진입 식별 ref 추가

컴포넌트 상단(다른 ref 선언부)에서:
```tsx
const firstRevealRef = useRef(true)   // 최초 진입(인트로 완료 후 첫 펼침) 1회 식별
```

### S2. pre→unfolding 전이에서 최초 진입만 idle 직행

현재 (L516 부근):
```tsx
// pre(접힘) 상태에서 인트로 완료/리스트 교체 시 펼침 시작
useEffect(() => {
  if (!revealed || phase !== 'pre') return
  const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('unfolding')))
  return () => cancelAnimationFrame(raf)
}, [revealed, phase])
```

변경:
```tsx
// pre(접힘) 상태에서 인트로 완료/리스트 교체 시 펼침 시작
// — 단, 최초 진입(firstReveal)은 unfolding 과도기를 생략하고 즉시 idle로 직행
//   (folded 리스트가 0fr→펼쳐지는 동안 첫 카드가 중앙처럼 보였다가 점프하는 현상 제거)
useEffect(() => {
  if (!revealed || phase !== 'pre') return
  if (firstRevealRef.current) {
    firstRevealRef.current = false
    const c = containerRef.current
    if (c) c.scrollTop = 0            // 상단 정렬 보장
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('idle')))
    return () => cancelAnimationFrame(raf)
  }
  const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('unfolding')))
  return () => cancelAnimationFrame(raf)
}, [revealed, phase])
```

**불변식·근거:**
- `firstRevealRef`는 최초 1회만 true → 이후 필터 변경에 의한 `pre` 재진입은 항상 `else` 경로(`unfolding`)로 가므로 **필터 재펼침 연출은 100% 보존**된다.
- 최초 진입은 `pre`에서 바로 `idle`로 전이 → `unfolding` 페이즈를 건너뛰므로 stagger 펼침 과도기가 발생하지 않는다. 첫 카드는 펼쳐진 상태(`folded=false`)로 상단(`scrollTop=0`)에 즉시 정착.
- 2-rAF 대기는 기존 패턴과 동일하게 유지하여, idle 진입 직전 레이아웃이 확정된 뒤 위계(`updateCenter`, L570 effect가 `phase==='idle'`에서 실행)가 정상 계산되도록 한다.

### S3. folded 판정 확인 (변경 없음, 검증용)

`const folded = phase === 'pre' || phase === 'folding'` (L927) 는 변경하지 않는다.
- 최초 진입이 `pre`를 1프레임만 거치고 즉시 `idle`로 가므로, `folded`는 거의 즉시 false가 된다 → 카드가 펼쳐진 채 나타난다. 의도된 동작.

### S4. 셔플·위계 영향 점검 (변경 없음, 검증용)

- 셔플 타이머(L647): `if (!revealed || activeSlug || phase !== 'idle') return`. 최초 진입이 `idle`에 더 빨리 도달하므로 셔플 idle 타이머가 정상 기동한다. 셔플 시작까지 6초(SHUFFLE_INTERVAL_MS) 여유가 있어 진입 직후 즉시 셔플이 튀지 않는다. 동작 변화 없음.
- 위계 effect(L570): `if (phase === 'idle') updateCenter()`. idle 진입 시 1회 실행되어 `centerIdx`가 첫 항목(상단 최근접)으로 정상 설정된다.

---

## 검증 체크리스트 (`npx tsc --noEmit` 통과 후, 모바일 폭 화면 녹화 검증)

최초 진입:
- [ ] E1. 인트로(ACP 로고) 종료 직후 첫 프로젝트가 **상단 정렬 상태로 즉시** 나타남 (수직 중앙 배치 과도기 없음)
- [ ] E2. "중앙→상단 점프" 현상 완전 소멸
- [ ] E3. 진입 직후 첫 카드가 d=0 위계(288×192)로 정상 강조, 상단 정렬

필터 변경 (회귀 0 — 연출 보존 확인):
- [ ] F1. 필터 칩 선택 시 folding→pause→unfolding 펼침 연출이 변경 전과 동일하게 재생
- [ ] F2. 필터 변경 후 첫 항목 상단 정렬 정상

동결 회귀 0:
- [ ] R1. 셔플(6초 idle 후 랜덤 중앙 스크롤) 정상 기동, 진입 직후 즉시 튀지 않음
- [ ] R2. 카드 탭→확장 모프, active 중앙 정렬, 트랙 스냅 등 v4.1 동작 회귀 없음
- [ ] R3. 데스크톱·태블릿 무영향

---

## Claude Code 입력 프롬프트

```
MOBILE_ENTRY_FIX_SPEC.md 파일을 읽고 명세대로 구현해줘.

핵심 제약:
- 모바일(<768px) MobileProjectWall.tsx 만 수정. 데스크톱·태블릿 코드는 일절 건드리지 말 것.
- "최초 진입 1회"만 unfolding을 생략하고 idle 직행. 필터 변경에 의한 folding→unfolding 재펼침 연출은 절대 건드리지 말 것.
- v4.1 동결(셔플, 위계 판정, 확장 모프, FLIP, 트랙 스냅, active 중앙 정렬)은 일절 수정 금지.
- firstRevealRef로 최초 진입만 식별. 2-rAF 대기 패턴 유지.
- 검증은 npx tsc --noEmit 만 사용. npm run dev / npm run build 금지.
- 구현 후 셔플 기동 타이밍·위계 초기값에 이상이 없는지 확인하고 이상 시 보고할 것.
```
