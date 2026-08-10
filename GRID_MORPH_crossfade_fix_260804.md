# GRID_MORPH_crossfade_fix_260804 — morph 원본 교체 암전·크기변화 제거

대상: `src/components/GridContentArea.tsx` 단일 파일.
`ContentArea.tsx`·`GridExperience.tsx` 수정 없음.
검증: `npx tsc --noEmit`만. dev/build 금지.

---

## 0. 증상과 원인

직전 명세(GRID_MORPH_fix_260804 작업 ①)로 썸네일→원본 교체가 동작하나 두 결함이 남았다.

### 결함 A — 짧은 흰색 암전
원본(상위)이 `opacity 0→1`로 페이드인하는 동안 썸네일(하위)이 **동시에 페이드아웃**하면,
두 레이어의 합산 불투명도가 전환 중간에 **1 미만으로 떨어진다.** 그 순간 뒤 흰 배경이 비쳐
암전으로 보인다. 전형적인 크로스페이드 딥(dip).

### 결함 B — 그림 크기 변화
하위는 `gridThumb43`로 **4:3 크롭**된 이미지, 상위는 **원본 비율** 이미지다.
같은 rect에 `objectFit: cover`로 넣으면 크롭 결과가 달라 피사체 크기·위치가 어긋난다.
교체 순간 그림이 미세하게 움직이는 원인.

※ 참고: morph는 시작(카드 = 4:3 크롭)과 끝(히어로 = 원본 비율) 사이에 **이미 종횡비 전환을
내포**한다. 현재는 그 전환이 원본 로드 시점에 갑자기 몰려 눈에 띈다.

---

## 1. 해법 (사용자 확정: 하위 유지한 채 상위만 얹기)

**하위 썸네일을 끄지 않는다.** 원본이 로드되면 상위가 하위를 완전히 덮으므로 하위를 계속
켜둬도 시각적 문제가 없고, 합산 불투명도가 1 아래로 내려가지 않아 **암전이 원천 소멸**한다.

크기 변화는 크롭 차이에서 오므로 완전 소멸은 불가하나, 크로스페이드 중간 단계(두 크롭이
반투명하게 겹쳐 보이는 구간)를 짧게 만들어 **체감을 최소화**한다.

---

## 2. 수정

### 2-1. 하위(썸네일) 레이어 — 절대 끄지 않는다
opacity를 `morphVisible`에만 연동한다. `morphFullLoaded`를 **참조하지 않는다.**
```jsx
opacity: morphVisible ? 1 : 0,
```
만약 현재 구현이 `morphVisible && !morphFullLoaded` 형태라면 **이것이 암전의 직접 원인**이므로
반드시 위와 같이 되돌린다.

### 2-2. 상위(원본) 레이어 — 페이드 시간 단축
```jsx
opacity: morphVisible && morphFullLoaded ? 1 : 0,
transition: `all ${MORPH_MS}ms ${EASE}, opacity ${FULL_FADE_MS}ms ease-out`,
```
상수 추가(`MORPH_MS` 근처):
```
const FULL_FADE_MS = 120   // 원본 교체 페이드 — 짧을수록 크롭 차이 겹침 구간이 줄어 덜 튄다
```
기존 200ms를 120ms로 줄인다. **길게 페이드하면 두 크롭이 겹쳐 보이는 시간이 길어져
오히려 어긋남이 도드라진다.**

### 2-3. z-index 확인
상위가 하위를 확실히 덮어야 한다. 하위 `zIndex: 6`, 상위 `zIndex: 7` 유지.
두 레이어의 `top/left/width/height`와 `objectFit: 'cover'`는 **완전히 동일**해야 한다
(하나라도 다르면 교체 시 어긋남이 커진다).

---

## 3. 선택적 추가 — 크기 변화를 더 줄이려면

위 수정으로도 크롭 차이가 거슬리면, **원본 교체를 morph 완료 후로 미룬다.**
정지 상태에서 교체되므로 이동 중 변화가 인지되지 않는다.

```jsx
// morph 완료 후에만 원본을 올린다 — 이동 중 크롭 전환을 피한다
const [morphSettled, setMorphSettled] = useState(false)
```
- morph 시작 시점(진입 블록)에서 `setMorphSettled(false)`.
- morph 완료 타이머(`MORPH_MS` 경과 지점, 기존 타이머 배열에 추가)에서 `setMorphSettled(true)`.
- 상위 레이어 opacity: `morphVisible && morphFullLoaded && morphSettled ? 1 : 0`.

**우선 §2만 적용해 육안 확인 후, 여전히 거슬릴 때만 §3을 적용할 것.**
§3은 도착 후 해상도가 올라가는 것이 눈에 보일 수 있어 취향이 갈린다.

---

## 4. 작업 순서
1. `FULL_FADE_MS = 120` 상수 추가.
2. 하위 레이어 opacity에서 `morphFullLoaded` 참조 제거(`morphVisible ? 1 : 0`).
3. 상위 레이어 opacity transition을 `FULL_FADE_MS`로 교체.
4. 두 레이어의 rect·objectFit·zIndex 동일성 확인.
5. `npx tsc --noEmit` — 오류 0.
6. 육안 확인 후 필요 시 §3 적용.

## 5. 절대 불변
- 메타 sticky 구조(`metaShift`·`META_SLOT_W`·`META_PAD_X`·`INFO_SLIDE_W 270`·`TITLE_SET_MIN_H 160`) — 불변.
- 역-morph 출발 rect(`curIdx` 기준)·`holdBackdrop` 배경 유지 로직 — 직전 명세 반영분 **불변**.
- `closeProject` rect 재측정(GridExperience) — 불변.
- `centerScroll`·`clampScroll`·캡션·슬라이드 카운터 — 불변.
- `ContentArea.tsx` — 수정 금지.

## 6. 검증 (육안)
1. 최초 클릭(캐시 없는 상태): **흰색 암전 없이** 썸네일에서 원본으로 해상도만 올라간다.
2. 교체 순간 그림 위치·크기 변화가 눈에 띄지 않는다(미세한 잔존은 허용).
3. 복귀 morph는 직전 명세 동작 그대로(회귀 없음).
