# GRID_MORPH_crop_match_260804 — morph 레이어 화각 일치 (확대 튐 제거)

대상: `src/components/GridContentArea.tsx` 단일 파일.
검증: `npx tsc --noEmit`만. dev/build 금지.

---

## ⚠ 0. 선행 명세 정정 — GRID_MORPH_rect_height_fix_260804 는 **폐기**

직전 명세는 "morph 도착 rect의 폭(slideH 기준)과 높이(rh 기준)가 어긋나 컨테이너가 납작해지고
objectFit cover가 확대 크롭한다"고 진단했으나, **영상 프레임 실측 결과 이 진단은 틀렸다.**

실측(30fps 프레임 추출 후 픽셀 측정):
```
전환 직후 프레임 p_015 : 이미지 컨테이너 446 × 267 px
정착 프레임   p_030 : 이미지 컨테이너 444 × 267 px
```
→ **컨테이너 크기는 변하지 않는다.** 폭 446→444(2px, JPEG 경계 오차), 높이 267 고정.

변하는 것은 컨테이너 안에 그려진 **이미지 내용의 화각**이다. 육안 비교에서
첫 프레임은 아치가 크고 하단 지형이 잘려 있으며, 정착 프레임은 아치가 작고 지형이 더 보인다.

**따라서 `rh * SLIDE_H_RATIO` → `slideH` 교체는 이 증상과 무관하다.
해당 명세는 적용하지 말 것. 이미 적용했다면 되돌릴 필요는 없으나(트랙과 기준을 맞추는 것
자체는 무해하다), 증상은 해소되지 않는다.**

---

## 1. 진짜 원인 — 두 레이어의 크롭(화각)이 다르다

morph 레이어는 2겹이다(GRID_MORPH_fix 작업 ①):

| 레이어 | src | 성질 |
|---|---|---|
| 하위 | `gridThumb43(coverImage, 800, coverHotspot)` | **4:3으로 잘라낸** 이미지 (607행) |
| 상위 | `project.coverImage` | **원본 비율** 이미지 |

둘 다 같은 컨테이너에 `objectFit: 'cover'`로 들어간다.

4:3 크롭본은 원본에서 이미 상하(또는 좌우)가 **잘려나간** 상태다. 원본이 4:3보다 세로로 길면
중앙부만 남고 나머지가 버려진다. 이 잘린 이미지를 컨테이너에 cover로 채우면 **피사체가 크게**
보인다. 반면 원본은 전체 범위를 담고 있어 같은 컨테이너에서 **피사체가 작게** 보인다.

→ 상위(원본)가 로드되어 올라오는 순간 **화각이 바뀌어** "확대됐다가 정상으로 돌아오는" 것으로
보인다. 이것이 증상의 정체다.

`FULL_FADE_MS`를 120ms로 줄인 것은 겹침 구간을 줄였을 뿐 화각 차이 자체는 그대로 남았다.

---

## 2. 해법 — 하위 레이어를 원본과 같은 화각으로

하위 썸네일을 **크롭하지 않는** 저해상도 이미지로 바꾼다. 그러면 두 레이어가 동일한 범위를
보여주고 **해상도만** 달라지므로, 교체가 "자연스럽게 선명해지는" 것으로 보인다.

`@/lib/imageUrl`은 **폭 전용 `sanityThumb`** 를 제공한다(GridExperience 76행 주석에 명시:
"imageUrl.ts는 폭 전용(sanityThumb)·3:2(sanityCard)만 제공"). 폭만 지정하므로 원본 비율이 유지된다.

### 2-1. import 교체 (25행)
```
import { gridThumb43 } from '@/lib/imageUrl'
        ↓
import { gridThumb43, sanityThumb } from '@/lib/imageUrl'
```
`gridThumb43`은 다른 용도로 남아 있을 수 있으므로 **먼저 grep으로 잔존 참조를 확인**하고,
0건이면 import에서 제거한다:
```
grep -n "gridThumb43" GridContentArea.tsx
```

### 2-2. morph 하위 레이어 src 교체
607행 `morphThumbSrc`(또는 동등한 변수)를 교체:
```jsx
// morph 하위 레이어 — 상위(원본)와 동일 화각이어야 교체 시 배율이 튀지 않는다.
// gridThumb43(4:3 크롭)은 원본에서 잘려나간 상태라 cover 결과가 달라진다 → 폭 전용 썸네일 사용.
const morphThumbSrc = useMemo(
  () => (project.coverImage ? sanityThumb(project.coverImage, 800) : ''),
  [project.coverImage]
)
```
`sanityThumb`의 실제 시그니처를 확인해 인자를 맞출 것:
```
grep -n "export function sanityThumb\|export const sanityThumb" src/lib/imageUrl.ts
```

### 2-3. 캐시 히트 상실에 대한 대응
하위 레이어가 더 이상 그리드 카드와 같은 URL이 아니므로 **캐시 히트를 잃는다.**
최초 클릭 시 하위 썸네일 로드가 늦으면 초기 깜빡임이 돌아올 수 있다.

이를 막기 위해 **그리드에서 미리 프리로드**한다. GridExperience에서 카드 호버 시,
또는 그리드 마운트 후 유휴 시점에 `sanityThumb(coverImage, 800)`을 프리페치한다.

**단, 우선 §2-1·2-2만 적용해 화각 튐이 사라지는지 먼저 확인할 것.**
깜빡임이 실제로 재발하지 않으면 프리로드는 불필요하다(800px 썸네일은 가볍다).

재발 시에만 적용할 프리로드(GridExperience, 카드 컴포넌트 내부):
```jsx
onPointerEnter={() => {
  if (project.coverImage) {
    const img = new window.Image()
    img.src = sanityThumb(project.coverImage, 800)
  }
}}
```

---

## 3. 대안 (§2로 해결되지 않을 때만)

두 레이어를 쓰지 않고 **원본 한 장만** 쓰되, 원본이 디코드될 때까지 morph 시작을 지연한다.
```jsx
const img = new window.Image()
img.src = project.coverImage
img.decode().then(() => { /* morph 시작 */ }).catch(() => { /* 그래도 시작 */ })
```
화각 불일치가 원천적으로 없어지지만 클릭 반응이 로드만큼 지연된다. **최후 수단.**

---

## 4. 작업 순서
1. `grep -n "gridThumb43" GridContentArea.tsx` — 잔존 용도 확인.
2. `grep -n "sanityThumb" src/lib/imageUrl.ts` — 시그니처 확인.
3. import에 `sanityThumb` 추가(필요 시 `gridThumb43` 제거).
4. morph 하위 레이어 src를 `sanityThumb(coverImage, 800)`으로 교체.
5. `npx tsc --noEmit` — 오류 0.
6. 육안 확인 후 필요 시 §2-3 프리로드 적용.

## 5. 절대 불변
- 메타 sticky 구조(`metaShift`·`META_SLOT_W`·`META_PAD_X`·`INFO_SLIDE_W 270`·`TITLE_SET_MIN_H 160`) — 불변.
- `holdBackdrop`·역-morph `curIdx` 출발 rect·`closeProject` rect 재측정 — 불변.
- 타이밍 상수(`MORPH_MS 700`·`MORPH_HOLD_MS 400`·`MORPH_FADE_MS 250`·`FULL_FADE_MS 120`) — 불변.
- 하위 레이어 opacity는 `morphVisible ? 1 : 0` (끄지 않는다) — 불변.
- **그리드 카드 자체의 `gridThumb43` 4:3 크롭 표시는 유지** — 카드 레이아웃은 4:3 격자다.
  바꾸는 것은 morph 레이어의 하위 src뿐이다.
- `ContentArea.tsx`·`GridExperience.tsx` — §2-3 프리로드를 적용하지 않는 한 수정 없음.

## 6. 검증 (육안)
1. 진입 후 콘텐츠 안착 순간: 이미지 **화각 변화 없이** 선명도만 올라간다.
   아치·태양의 크기와 위치가 교체 전후로 동일해야 한다.
2. 최초 클릭(캐시 없는 상태)에서 흰색 깜빡임이 재발하지 않는지 확인 — 재발 시 §2-3 적용.
3. 복귀 morph 회귀 없음.
