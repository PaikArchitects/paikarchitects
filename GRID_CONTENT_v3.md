# 콘텐츠 에어리어 수정 명세 v3 (GRID_CONTENT_v3)

> 그리드 콘텐츠 진입을 **링월의 검증된 원본-비율 morph 로직에 충실히 정렬**한다.
> 이전 GRID_CONTENT_v2의 "idle 제거·aspect 4/3 고정·메타 별도 배치"는 **오류였으므로 정정**한다.
> 진입 구조(오버레이)는 유지 — 사용자가 원하는 "하나의 화면에서 이어지는 느낌"은 이미 성립.
> 줌은 이 명세에서 분리(별도 설계). 링월 ContentArea.tsx는 getSlides 외 무수정.

---

## 0. 이전 명세(v2) 정정 사항

v2에서 그리드 GridContentArea에 지시한 아래 3개는 **오류. 되돌린다.**
- ❌ "idle 블록 제거" → aspect 소스(idle img)가 사라져 4/3 폴백을 강제한 원인.
- ❌ "aspect = FALLBACK_RATIO(4/3) 고정" → 커버가 콘텐츠에서 4:3으로 잘려 morph 어색·중앙정렬
  실패의 근원.
- ❌ "메타를 트랙 밖 화면 좌측 고정" → 이미지 폭 따라 메타가 못 움직임.

**정정 원칙**: 그리드 콘텐츠는 링월 ContentArea 로직을 **더 충실히 복제**한다. 유일한 차이는
aspect 소스(링월=idle img / 그리드=클릭된 카드 img)뿐.

---

## 1. 확정 사항 (사용자 승인)

1. **커버 원본 aspect** = **Sanity 이미지 metadata의 aspectRatio**
   (`coverImage.asset->metadata.dimensions.aspectRatio`). crop 무관 원본 정확.
   링월·그리드 **동일 소스로 일원화**. (카드 img naturalWidth는 세로 crop 시 원본 미반영이라 폐기.)
   → 링월 morph aspect도 idleImg naturalWidth에서 metadata로 교체(무수정 예외 morph까지 확장, 사용자 승인).
2. **커버 크기** = 높이 `vpH × SLIDE_H_RATIO(0.72)` 고정, 폭 = 높이 × 원본aspect. 링월과 동일.
   가로 긴 이미지는 넓게, 세로 긴 건 좁게.
3. **메타 배치** = 링월처럼 정보 슬라이드를 **트랙 인덱스 0**(히어로 좌측)에 둔다. 히어로가
   원본비로 넓어지거나 좁아지면 그 좌측에 항상 붙는다(트랙 좌표계라 자동).
4. **가로 극장방비 폴백** = `INFO_SLIDE_W(240) + heroW > viewportW`이면, 정보 슬라이드를
   최좌측 고정 + 이미지 위 반투명 배경 오버레이(가독성 확보). 순수 계산 판정.
5. **세로 이미지 크롭** = 썸네일은 Sanity hotspot/crop으로 4:3 고정, 콘텐츠는 원본 비율.
   crop 설정 가능(§4). 
6. **중앙정렬** = 1~3 정상화 시 링월 `centers[1] - viewportW/2`로 자동 해결.
7. **커버=첫 슬라이드 자동 주입** = v2 §2 유지(getSlides가 커버를 첫 image 슬라이드로 prepend).
   단 aspect가 원본비여야 하므로 §3과 연동.

---

## 2. 그리드 GridContentArea — 원본 비율 morph (핵심 정정)

### 2-1. aspect 소스 = Sanity metadata aspectRatio (링월·그리드 공통)
링월 morph 시퀀스(ContentArea L674–719)를 복제하되, aspect 획득을 metadata로 교체:
```
// 링월 원본 (L683–686): idleImg naturalWidth — 폐기
// 교체 (링월·그리드 공통): project.coverRatio (= Sanity metadata aspectRatio)
const aspect = project.coverRatio && project.coverRatio > 0
  ? project.coverRatio
  : FALLBACK_RATIO
const th = rh * SLIDE_H_RATIO
const tw = th * aspect        // 원본비 폭 — 4/3 고정 절대 금지
```
- `project.coverRatio`는 GROQ가 metadata에서 프로젝션(§4-4·§6). crop과 무관하게 원본 비율.
- morph 시작 rect = 클릭 카드 rect(enterRect, 4:3 썸네일 형상). 도착 rect = 원본비(tw×th).
  → **morph 중 4:3에서 원본비로 종횡비가 변하며 확대**. 이것이 "썸네일이 자라나 원본이 되는" 효과.
- **링월 동일 적용**: ContentArea L683–686의 idleImg aspect 계산을 `project.coverRatio` 폴백으로
  교체(무수정 예외 확장, 사용자 승인). 링월·그리드 morph 동작 일원화.

### 2-2. rects에 원본 aspect 반영
링월 rects(L610–632)는 `ratios?.[i] ?? FALLBACK_RATIO`로 각 슬라이드 폭을 원본비로 계산한다.
그리드도 동일하게, **커버(첫 슬라이드)의 ratio가 원본비**여야 한다.
- getSlides가 커버를 첫 슬라이드로 주입할 때(§3), 그 ImageSlide에 `ratio = project.coverRatio`
  (Sanity metadata aspectRatio) 주입. → rects[1]이 원본비 폭을 가져 트랙·중앙정렬이 정확.

### 2-3. 메타(정보 슬라이드) = 트랙 인덱스 0 유지
- 링월 구조 그대로: `widths[0] = INFO_SLIDE_W`(L611). 정보 슬라이드가 히어로 왼쪽 트랙 자식.
- **v2의 "메타 화면 고정"을 폐기**하고 트랙 인덱스 0으로 복원. 히어로 폭 변화 시 좌측에 자동 부착.
- 초기 scrollPos = `centers[1] - viewportW/2`(히어로 중앙). 정보 슬라이드는 좌로 밀면 보임.

### 2-4. 중앙정렬 자동 성립
2-1~2-3이 서면, 히어로가 원본비로 뷰포트 중앙에 오고 메타가 그 좌측에 붙는다. 별도 보정 불요.
morph 도착 left = `TRACK_INSET + INFO_SLIDE_W + SLIDE_GAP_PX`(링월 L700 그대로) — 단 이 값이
중앙정렬 scrollPos와 정합하는지 확인(§2-5).

### 2-5. morph 도착과 정착 정합
- 링월은 morph 도착을 `left: TRACK_INSET + INFO_SLIDE_W + SLIDE_GAP_PX`로 두고(L700),
  scrollPos=0에서 시작해 트랙이 좌측 정렬(정보 슬라이드가 좌측 상주).
- 그리드는 **중앙정렬**이므로 초기 scrollPos = `centers[1] - viewportW/2` ≠ 0.
  → morph 도착 left도 이 scrollPos 반영: `heroScreenLeft = TRACK_INSET + rects[1].x - scrollPos`.
  이 값이 `viewportW/2 - tw/2`(정중앙)와 일치해야 morph 종료 시 안 튐.
- ⚠ 구현자는 morph 도착 left를 `centers[1] - viewportW/2` 정착 후 히어로 화면 위치와 동일
  픽셀로 계산. 두 경로가 같은 rects·상수를 쓰는지 확인.

---

## 3. getSlides — 커버 원본비 주입 (링월 + 그리드)

v2 §2 유지 + ratio 주입 추가:
```
function getSlides(project: Project, coverRatio?: number): ProjectSlide[] {
  const rest = project.slides ?? []
  if (!project.coverImage) return rest
  const cover: ImageSlide = {
    kind: 'image',
    src: project.coverImage,
    ...(project.coverCaption ? { caption: project.coverCaption } : {}),
    ...(coverRatio ? { ratio: coverRatio } : {}),
  }
  return [cover, ...rest]
}
```
- **링월**: coverRatio = idleImgEl naturalWidth/Height (기존 aspect 계산 재사용).
- **그리드**: coverRatio = enterImg naturalWidth/Height (클릭 카드 img).
- ratio가 rects 계산(§2-2)에 흘러 원본비 폭 확정.
- ⚠ 무수정 예외: ContentArea.tsx는 getSlides 함수 시그니처/본문 교체에 한정. 다른 로직 금지.

---

## 4. Sanity 세로 이미지 크롭 (hotspot/crop)

### 가능 여부 — 가능하다
Sanity 이미지 필드는 `options: { hotspot: true }`로 **Studio에서 crop+hotspot을 시각적 설정**
가능. `coverHotspot: {x,y}`가 이미 스키마에 있음(hotspot 부분 도입됨). crop까지 켜면 편집자가
4:3 박스를 직접 지정.

### 4-1. 스키마 확인·수정 (sanity/schemaTypes/project.ts)
- coverImage 필드가 `type: 'image', options: { hotspot: true }`인지 확인.
- **crop 활성**: hotspot:true면 Studio에서 crop 핸들도 자동 제공(hotspot과 crop은 함께 동작).
  별도 옵션 불필요 — hotspot:true가 crop UI를 포함. 확인만.

### 4-2. 썸네일 렌더 = crop 4:3 (src/lib/imageUrl.ts 또는 sanityImage)
- 그리드 카드 썸네일 URL: `urlFor(coverImage).width(W).height(W*3/4).fit('crop').url()`.
  hotspot/crop 설정이 있으면 그 영역 기준으로, 없으면 중앙 크롭. 4:3 강제.
- ⚠ 구현자는 imageUrl.ts의 실제 urlFor 체인 확인 후, 썸네일이 crop 4:3을 쓰는지 검증.
  현재 카드가 `aspect-ratio:4/3 + object-fit:cover`(CSS 크롭)만 쓰면, Sanity crop과 이중이
  되거나 hotspot이 무시될 수 있음 → Sanity crop URL 사용으로 통일 권장.

### 4-3. 콘텐츠 커버 = 원본 (crop 없음)
- 콘텐츠 진입 시 커버는 crop 없는 원본 URL: `urlFor(coverImage).url()` 또는 width만 지정.
- object-fit:contain 또는 자연 크기. §2의 원본비 morph가 이 원본을 씀.

> ⚠ 썸네일(crop 4:3)과 콘텐츠(원본)가 **같은 coverImage에서 서로 다른 URL 변환**으로 생성됨.
> aspect 소스(enterImg)는 썸네일 img인데, 썸네일은 crop되어 4:3이다. **문제**: enterImg의
> naturalWidth/Height는 crop된 4:3 값이라 원본 aspect가 아니다!
> **해결**: 세로 이미지 원본 aspect는 카드 썸네일 img로 못 얻는다(crop됨). → **원본 aspect는
> Sanity metadata에서 공급**해야 정확하다. §4-4 참조.

### 4-4. 원본 aspect 소스 = Sanity metadata (확정)
- 원본 aspect = **Sanity 이미지 metadata의 dimensions.aspectRatio**. Sanity는 업로드 시
  이미지 원본 w/h를 metadata로 자동 저장. crop과 무관하게 원본 비율.
- GROQ 추가: `"coverRatio": coverImage.asset->metadata.dimensions.aspectRatio`.
- getSlides의 coverRatio·morph aspect 모두 이 값 사용. **링월·그리드 공통**(사용자 승인).
- ⚠ GROQ는 tsc 미검증 → 프로젝션 실재 grep 확인. metadata 경로가 정확한지
  (`asset->metadata.dimensions.aspectRatio`) Sanity 스키마 버전에 맞는지 확인.

---

## 5. GridExperience openProject — enterImg 전달
```
const openProject = useCallback((project: Project, cardEl: HTMLElement) => {
  const r = cardEl.getBoundingClientRect()
  enterRectRef.current = { top:r.top, left:r.left, width:r.width, height:r.height }
  // 원본 aspect는 Sanity metadata(project.coverRatio 등)에서 — img 아님
  setSelected(project)
  setContentMode('idle')
  window.history.pushState({ gridContent: project.id }, '', `/work/${project.id}`)
  requestAnimationFrame(() => requestAnimationFrame(() => setContentMode('active')))
}, [])
```
- enterImg 전달 불요(metadata 사용으로 변경). project에 coverRatio가 실려오면 그것 사용.
- ⚠ types/index.ts Project에 `coverRatio?: number` 추가(§6), GROQ 프로젝션 추가(§4-4).

---

## 6. 스키마·타입·GROQ
- types/index.ts Project: `coverCaption?: LocaleString`(v2) + `coverRatio?: number`(신설).
- sanity/schemaTypes/project.ts: coverImage `options:{hotspot:true}` 확인, coverCaption 필드
  추가(v2).
- src/lib/sanity/queries.ts GROQ: `coverCaption`, `"coverRatio": coverImage.asset->metadata.dimensions.aspectRatio`
  프로젝션 추가. **GROQ는 tsc 미검증 → grep으로 프로젝션 실재 확인.**

---

## 7. 가로 극장방비 폴백 (메타 오버레이)
```
const heroW = th * aspect
const metaOverlay = (INFO_SLIDE_W + heroW + SLIDE_GAP_PX) > viewportW
```
- `metaOverlay === true`: 정보 슬라이드를 트랙에서 빼내 화면 최좌측 고정(position 등),
  이미지 위에 반투명 배경(예: rgba(8,7,6,0.5) + backdrop-blur) 위에 렌더. 텍스트 가독성 확보.
- `false`: §2-3 정상(트랙 인덱스 0).
- ⚠ 이 분기는 히어로만 해당. 다른 슬라이드는 무관. morph 종료 후 정착 상태에서 판정.
- 1차는 판정·오버레이 스타일만 구현, 실제 극장방비 이미지로 배포 확인 후 투명도·블러 조정.

---

## 8. 검증
- `npx tsc --noEmit`만. dev·build 금지.
- 무수정: LandingExperience.tsx·useRingWall.ts·work-grid/page.tsx.
- **ContentArea.tsx 허용 수정(사용자 승인)**: ①getSlides 시그니처/본문(커버 주입·coverRatio)
  ②morph aspect 계산(L683–686, idleImg naturalWidth → project.coverRatio). 이 2개에 한정.
  트랙·rects·슬라이드 렌더러·넘김은 무수정.
- tsc 안 잡히는 것: GROQ 프로젝션(grep), crop URL(실물), 극장방비 폴백(실물).

---

## 9. 배포 후 확인
1. 커버가 콘텐츠에서 원본 비율(4:3 아님). 가로 이미지 넓게·세로 좁게.
2. morph가 4:3 썸네일 → 원본비 커버로 종횡비 변하며 확대(썸네일이 자라남).
3. 메타가 이미지 좌측에 붙고, 이미지 폭 따라 위치 변동.
4. 히어로 화면 정중앙, morph 종료 시 안 튐.
5. 세로 긴 이미지: 썸네일 4:3 crop(hotspot 반영), 콘텐츠 원본.
6. 가로 극장방비: 메타가 이미지 위 반투명 오버레이로.
7. 링월도 커버 원본비 morph 정상(회귀 없음).
