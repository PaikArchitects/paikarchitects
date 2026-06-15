# MOBILE_MOUSE_SPEC

**목적:** 모바일 레이아웃(<768px)에서 핵심 조작에 한해 마우스 입력을 수용한다. 데스크톱 브라우저 창을 모바일 폭으로 줄여 볼 때를 위한 보정이다. 범위는 "핵심 조작만" — 콘텐츠 트랙 마우스 드래그, 월 카드 커서 보정. 월 카드의 마우스 hover 강조는 **넣지 않는다** (v4.1 동결 위계 로직과 충돌).

**대상 파일**
- `src/components/MobileProjectWall.tsx`

**동결 보호 조항 (절대):** 모바일 인터랙션 레이어 v4.1 — 콘덴스드 월의 "뷰포트 수직 중앙 기준 스크롤 위계 판정", 셔플(6초 idle→랜덤 중앙 스크롤), 확장 모프, FLIP, 트랙 스냅 — 은 동결 대상이다. 이 스펙은 위계 판정 로직을 **일절 건드리지 않는다.** 마우스 hover 기반 위계는 도입하지 않는다.

**검증은 `npx tsc --noEmit`만 사용.** `npm run dev` / `npm run build` 금지. 데스크톱·태블릿 코드는 일절 건드리지 않는다.

---

## P1 — 콘텐츠 트랙 마우스 드래그-투-스크롤 (M4 잔여 해소)

**현상:** 확장 후 수평 트랙(`ExpandedBlock`의 `trackRef` 컨테이너, `overflowX: 'auto'` + `touch-action: 'pan-x'` + `scroll-snap`)이 터치에선 스크롤되나 마우스 드래그로는 넘어가지 않는다. 데스크톱 창을 모바일 폭으로 줄이면 그림이 좌우로 안 넘어간다.

**현재 구조:**
- 트랙 컨테이너: `overflowX: auto`, `touchAction: pan-x`, `scrollSnapType: x mandatory`, `WebkitOverflowScrolling: touch`.
- 터치 스크롤은 네이티브에 위임. 마우스 드래그 핸들러 없음.

**변경:** 트랙 컨테이너에 **마우스 전용** Pointer 드래그-투-스크롤을 추가한다. 터치는 네이티브 스크롤을 그대로 두고 마우스만 가로챈다 (이중 스크롤 충돌 방지).

```tsx
// ExpandedBlock 내부, trackRef와 함께 선언
const trackDrag = useRef<{ startX: number; startScroll: number; moved: boolean } | null>(null)

const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
  if (e.pointerType !== 'mouse') return          // 터치/펜 = 네이티브 스크롤 위임
  const el = trackRef.current
  if (!el) return
  trackDrag.current = { startX: e.clientX, startScroll: el.scrollLeft, moved: false }
  el.setPointerCapture(e.pointerId)
}
const onTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
  const d = trackDrag.current
  const el = trackRef.current
  if (!d || !el) return
  const dx = e.clientX - d.startX
  if (Math.abs(dx) >= 5) d.moved = true
  el.scrollLeft = d.startScroll - dx           // 스냅은 네이티브가 pointerup 후 처리
}
const onTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
  trackDrag.current = null
}
```

트랙 컨테이너 JSX에 핸들러 부착:
```tsx
<div
  ref={trackRef}
  className="mpw-track"
  onScroll={handleScroll}
  onPointerDown={onTrackPointerDown}
  onPointerMove={onTrackPointerMove}
  onPointerUp={onTrackPointerUp}
  style={{ /* 기존 그대로 — overflowX:auto, touchAction:pan-x, scrollSnap 등 변경 없음 */ }}
>
```

**불변식·주의:**
- `pointerType !== 'mouse'`이면 즉시 return → 터치 동작은 현재와 100% 동일 (회귀 0).
- `scroll-snap-type: x mandatory`는 유지. 마우스 드래그 중에는 `scrollLeft` 직접 조작으로 스냅이 일시 무력하지만, `pointerup`(드래그 종료) 후 브라우저가 가장 가까운 스냅으로 정착시킨다. 별도 스냅 코드 불필요.
- 다이어그램 슬라이드의 탭 진행(`MobileDiagramSetSlide`, 5px 미만 탭 판정)과 충돌하지 않도록, 트랙 드래그가 5px 이상 이동(`moved`)한 경우 그 포인터의 후속 click이 다이어그램 탭으로 오인되지 않게 한다. 다이어그램 슬라이드는 자체 `onPointerDown`에서 `downXRef`로 5px 판정을 이미 하므로, 트랙 드래그와 독립적으로 동작한다 — 단 구현 후 "마우스로 트랙을 끌었을 때 다이어그램이 의도치 않게 넘어가는지" 확인하고, 충돌 시 보고할 것.
- `handleScroll`(중앙 최근접 카운터 갱신)은 `scrollLeft` 변경 시 발생하므로, 마우스 드래그 중에도 카운터가 정상 갱신된다. 추가 작업 없음.

---

## P2 — 월 카드 커서 보정 (손가락 커서)

**현상:** 모바일 월에서 마우스로 카드에 올렸을 때 커서가 `pointer`(손가락)로 바뀌지 않는다. 클릭·확장 진입은 정상 작동한다.

**원인:** 월 카드 선택 요소(`onClick={() => handleTap(p)}` 가 붙은 div)에 `cursor: 'pointer'`가 없다. 데스크톱 `WallCard`·BACK 버튼·필터 칩에는 있으나 이 요소엔 누락.

**변경:** `handleTap(p)` `onClick`이 붙은 div의 style에 `cursor: 'pointer'`를 추가한다.

```tsx
<div
  onClick={() => handleTap(p)}
  style={{ opacity: tier.opacity, transition: 'opacity 400ms ease', cursor: 'pointer' }}
>
```

**불변식:**
- `cursor`는 순수 시각 속성. 위계·스크롤·동결 로직에 영향 없음.
- 터치 디바이스에서는 cursor가 무의미하므로 부작용 없음.

---

## P3 — 필터 칩 마우스 드래그 (참조 — 별도 스펙에서 처리)

칩 행 마우스 드래그-투-스크롤은 **MOBILE_FIX_SPEC.md의 M2-2**에 이미 정의되어 있다. 이 스펙에서 중복 구현하지 않는다. 두 스펙을 함께 실행하는 경우 M2-2가 칩 드래그를 담당하고, 본 스펙 P1이 콘텐츠 트랙 드래그를 담당한다. (만약 MOBILE_FIX_SPEC을 아직 실행하지 않았다면 칩 드래그는 그쪽 실행 시 적용됨.)

---

## 검증 체크리스트 (`npx tsc --noEmit` 통과 후, 모바일 폭 화면 녹화 검증)

마우스 환경 (데스크톱 브라우저 모바일 폭):
- [ ] P1-a. 확장 후 콘텐츠 트랙을 마우스로 좌우 드래그하면 슬라이드가 넘어감
- [ ] P1-b. 드래그 후 손을 떼면 스냅이 가장 가까운 슬라이드로 정착
- [ ] P1-c. 마우스로 트랙을 끌어도 다이어그램 슬라이드가 의도치 않게 진행되지 않음
- [ ] P2-a. 월 카드에 마우스 올리면 커서가 손가락(pointer)으로 변경
- [ ] P2-b. 클릭 시 확장 진입 정상 (기존 동작 유지)

터치 환경 (실기기) — 회귀 0:
- [ ] P1-d. 터치로 트랙 스크롤·스냅이 현재와 100% 동일 (마우스 핸들러가 터치를 가로채지 않음)
- [ ] P1-e. 다이어그램 슬라이드 탭 진행 정상
- [ ] R1. 셔플·확장 모프·FLIP·위계 판정 등 v4.1 동결 동작 회귀 없음

---

## Claude Code 입력 프롬프트

```
MOBILE_MOUSE_SPEC.md 파일을 읽고 명세대로 구현해줘.

핵심 제약:
- 모바일(<768px) MobileProjectWall.tsx 만 수정. 데스크톱·태블릿 코드는 일절 건드리지 말 것.
- 마우스 수용은 "핵심 조작만". 월 카드 마우스 hover 강조는 절대 넣지 말 것 (v4.1 위계 판정과 충돌).
- v4.1 동결(셔플, 확장 모프, FLIP, 트랙 스냅, 수직 중앙 기준 위계 판정) 로직은 일절 수정 금지.
- P1 트랙 드래그는 pointerType==='mouse'에만 적용. 터치는 네이티브 스크롤 유지(이중 스크롤 충돌 금지).
- P3(칩 드래그)는 MOBILE_FIX_SPEC M2-2 담당이므로 여기서 중복 구현하지 말 것.
- 검증은 npx tsc --noEmit 만 사용. npm run dev / npm run build 금지.
- P1의 트랙 드래그-다이어그램 탭 충돌 가능성은 구현 후 확인하고 충돌 시 보고할 것.
```
