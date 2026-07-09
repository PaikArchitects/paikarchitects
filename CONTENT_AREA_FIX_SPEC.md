# CONTENT_AREA_FIX_SPEC — 데스크톱 콘텐츠 페이지 트랙 3결함 수정

## 0. 대상 결함 (확정 진단)

1. **마지막 슬라이드 미도달**: 이동 상한 `maxScroll = 마지막 슬라이드 중심 − viewportW/2` — 마지막 슬라이드의 *중심*이 뷰포트 중앙에 오는 지점이 끝이다. 뷰포트보다 넓은 슬라이드(전개 단면도 등 파노라마)의 우측 절반은 구조적으로 도달 불가.
2. **화살표 스냅의 중앙 이탈**: 슬라이드 폭이 이미지 고유 비율 의존(`height:100%; width:auto`)인데 이미지가 지연 로드되면서 앞쪽 슬라이드 폭이 사후 확정 → 뒤쪽 전체 좌표가 밀림 → px 절대값인 scrollPos가 그대로 남아 직전에 중앙 정렬한 슬라이드가 이탈. 재측정 시 보상 로직 부재.
3. **글리프 네온**: `GLYPH_SHADOW`(흰 헤일로 textShadow 2겹, 10px/3px 블러)가 흐릿한 인상의 원인. 목적(어두운 사진 위 대비)은 블러 없는 방식으로 대체 가능.

수정 파일: `src/components/ContentArea.tsx` 1개.

## 1. 이동 상한 수정 — 끝단 도달 보장

```ts
// 기존
const maxScroll = centers.length > 0
  ? Math.max(0, centers[centers.length - 1] - viewportW / 2)
  : 0

// 교체
const contentEnd = rects.length > 0
  ? rects[rects.length - 1].x + rects[rects.length - 1].w
  : 0
const maxScroll = centers.length > 0
  ? Math.max(
      0,
      centers[centers.length - 1] - viewportW / 2,   // 마지막 슬라이드 중앙 정렬 지점 (좁은 슬라이드용)
      contentEnd + TRACK_INSET - viewportW,          // 마지막 슬라이드 우측 에지 + 우측 여백 24 (넓은 슬라이드용)
    )
  : 0
```
- 두 후보의 max: 마지막 슬라이드가 좁으면(크레딧 등) 중앙 정렬 지점이, 뷰포트보다 넓으면 끝단 지점이 상한이 된다.
- 우측 여백은 좌측 클립 인셋과 대칭인 `TRACK_INSET`(24px).
- 화살표 표시 조건(`scrollPos < maxScroll - 1`)·클램프는 기존 식이 새 maxScroll을 자동 상속 — 별도 수정 불요.

## 2. 재측정 보상 — 지연 로드 좌표 이동 흡수

`measure()`를 앵커 보상형으로 교체한다. 재측정 직전의 "뷰포트 중앙 최근접 슬라이드"를 앵커로 삼아, 새 rects에서 그 슬라이드의 중심 이동량만큼 scrollPos를 무애니메이션 보정한다.

```ts
const measure = useCallback(() => {
  const track = trackRef.current
  const vp = viewportRef.current
  if (!track || !vp) return
  const children = Array.from(track.children) as HTMLElement[]
  const next = children.map(el => ({ x: el.offsetLeft, w: el.offsetWidth }))
  const vw = vp.clientWidth

  setRects(prev => {
    // 앵커 보상 — 드래그 중이 아니고, 이전 측정이 존재할 때만
    if (prev.length > 0 && next.length === prev.length && !dragStateRef.current) {
      const prevCenters = prev.map(r => r.x + r.w / 2)
      const sp = scrollPosRef.current
      const vc = sp + vw / 2
      let anchor = 0
      for (let i = 1; i < prevCenters.length; i++) {
        if (Math.abs(prevCenters[i] - vc) < Math.abs(prevCenters[anchor] - vc)) anchor = i
      }
      const delta = (next[anchor].x + next[anchor].w / 2) - prevCenters[anchor]
      if (delta !== 0) {
        setAnimated(false)                      // 보정은 즉시 반영 (transition 없이)
        setScrollPos(p => Math.max(0, p + delta))   // 상한 클램프는 새 rects 반영 렌더에서 자연 적용
      }
    }
    return next
  })
  setViewportW(vw)
}, [])
```
구현 요건:
- `scrollPosRef`(scrollPos 미러 ref)와 `dragStateRef`(기존 `dragState`를 그대로 사용 — 이미 ref다) 참조로 stale closure 없이 판단한다. scrollPos 미러 ref가 없으면 신설한다 (`useEffect`로 동기화 또는 setState 직후 동시 갱신).
- 슬라이드 수가 변하는 경우(prev.length ≠ next.length — 프로젝트 교체 직후)는 보상 없이 신규 측정만.
- 기존 ResizeObserver(track·viewport 관찰)·resize 리스너는 그대로 — 트리거 체계 변경 금지. 이미지 로드로 자식 폭이 변하면 track 폭이 변해 RO가 발화하고, 위 보상이 흡수한다.

## 3. 글리프 스타일 — 네온 제거, 차연(difference) 블렌드

외부 트랙 글리프(64px)와 다이어그램 내부 글리프(28px) 공통:

```ts
// 삭제
const GLYPH_SHADOW = '...'          // 상수 자체 제거
textShadow: GLYPH_SHADOW,           // 두 사용처 모두 제거

// 두 글리프 span 스타일 교체
color: '#FFFFFF',
mixBlendMode: 'difference',
```
- 흰 글리프 + difference 블렌드 = 배경 반전색으로 항상 최대 대비 (흰 배경 위 검정, 어두운 사진 위 흰색). 블러가 없어 형태가 또렷하다.
- 글리프 문자('‹' '›')·크기·커서 추적 배치·표시 조건은 일절 변경 금지.

## 4. 불변 조건
- 드래그 자유 패닝(놓아도 스냅 없음)·플릭 관성·키보드 내비·모프 시퀀스·카운터·정보 슬라이드 — 설계 의도이므로 변경 금지.
- `goToSlide`의 중앙 정렬 산식(`centers[i] − viewportW/2`) 변경 금지 — §1·§2가 적용되면 산식은 그대로 정확해진다.
- 모바일 컴포넌트·링 월·기타 파일 접촉 금지.

## 5. 검증
- `npx tsc --noEmit`만.
- 배포 후 확인 4항: ① 파노라마(광폭) 슬라이드가 마지막인 프로젝트에서 우측 끝 + 24px 여백까지 도달, ② 진입 직후 빠르게 화살표 연타 → 이미지 로드가 뒤따라와도 중앙 정렬 유지(이탈 시 자동 보정), ③ 화살표 클릭 시 대상 슬라이드 중심 = 뷰포트 중심 스냅, ④ 글리프가 밝은/어두운 배경 모두에서 블러 없이 또렷.
