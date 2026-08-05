# GRID_CONTENT_meta_sticky_260804 — 그리드 콘텐츠 영역 메타 sticky 통합 · 중앙 스냅 교정

대상 파일: `src/components/GridContentArea.tsx` **단일 파일만 수정.**
`ContentArea.tsx`(링월) 절대 수정 금지. 모바일 렌더러·ProjectCard·밀도 로직은 이 명세 범위 밖.

검증: `npx tsc --noEmit`만 사용. `npm run dev` / `npm run build` 금지.

---

## 0. 배경 — 현재 구조와 결함 (감사 확정, 2026-08-04)

메타 본문 `infoContent`(1015~1151행)는 `metaOverlay` 불리언(1010~1012행)으로 **두 배타적 경로** 중 하나에만 렌더된다.

- `metaOverlay === false`: 트랙 자식 0에 렌더(1226행). 트랙과 함께 좌우로 흐르므로, 슬라이드를 밀면 화면 밖으로 사라진다(산수경 결함).
- `metaOverlay === true`: 화면 좌측 고정 오버레이(1296~1322행). 항상 최좌측 고정(도산대로 거동).

이 분기 자체가 결함이다. 목표는 **두 경로를 폐지하고 단일 sticky 오버레이로 통합**하는 것이다.

화면 좌표 환산 기준(793행에서 확정): 트랙 자식 i의 화면 좌측 = `TRACK_INSET + rects[i].x - scrollPos`.
메타는 트랙 자식 0이고 `rects[0].x === 0`이므로, 메타 자연 화면 좌측 = `TRACK_INSET - scrollPos`.

---

## 작업 ① — 메타 sticky 통합 (최우선, 나머지가 여기에 의존)

### 목표 거동 (사용자 확정)
- 메타는 **항상 sticky 오버레이 한 곳**에만 렌더된다. `metaOverlay` 분기 폐지.
- 메타 자연 위치는 히어로 왼쪽 옆(= 트랙 좌표 0, 화면 `TRACK_INSET - scrollPos`).
- 이 자연 위치가 뷰포트 좌측 경계(`TRACK_INSET`) 밖으로 나가려 하면 **경계에 고정**(sticky).
- 반대로 밀면 역으로 자연 위치로 복귀.
- 반투명 흰 배경은 **항상 켠다**(겹치지 않을 땐 어차피 인지 안 됨 → 분기 제거로 단순화).
- 도산대로(넓은 커버)는 처음부터 자연 위치가 경계 밖 → 즉시 sticky. 산수경(정상 비율)은
  처음엔 이미지 옆 → 밀면 경계에서 고정. **둘이 같은 산식의 두 상태**로 자동 처리된다.

### sticky x 산식
```
metaX = TRACK_INSET + Math.max(0, -scrollPos)
```
- `scrollPos >= 0`: `metaX = TRACK_INSET` (좌측 경계 고정).
- `scrollPos < 0`: `metaX = TRACK_INSET - scrollPos` (트랙 따라 우측 이동 — 좁은 히어로에서
  `minScroll`이 음수가 되는 경우, 히어로가 중앙에 오면서 메타가 이미지 옆 자연 위치로 붙는다).

이 산식은 793행 환산과 정합한다. 퍼센트 정렬 금지(Safari), 전부 px 정수.

### 삭제 대상 (참조 전수 열거 — 부분 이행 방지)
1. **`metaOverlay` 상수 선언** — 1010~1012행 (`heroLeftScreen` 포함 3행 블록):
   ```
   const heroLeftScreen = viewportW / 2 - heroW / 2
   const metaOverlay = viewportW > 0 && heroW > 0 &&
     (heroLeftScreen - SLIDE_GAP_PX - INFO_SLIDE_W) < 0
   ```
   → 전부 삭제. `heroLeftScreen`은 이 블록 외 참조 없음(grep으로 0건 확인 후 삭제).
   `metaOverlay`도 아래 2개 참조 지점을 모두 교체한 뒤 삭제.
2. **트랙 자식 0의 메타 렌더** — 1211~1227행. 트랙 자식 0은 **폭 예약 목적으로만 남긴다**
   (rects·중앙정렬 계산이 `INFO_SLIDE_W`에 의존). 즉 이 `<div>`는 유지하되:
   - `opacity: infoIn && !metaOverlay ? 1 : 0` → `opacity: 0` (항상 빈 자리, 폭만 예약)
   - 내부 `{!metaOverlay && infoContent}` → 내용 제거(빈 div). `infoContent`는 오버레이에서만 렌더.
   - `overflowY: 'auto'` 제거(빈 자리이므로 불필요).
   ※ 트랙 자식 0을 통째로 삭제하면 rects 인덱싱(0=정보, 1..=콘텐츠)이 어긋나므로 **폭 예약은 필수 유지**.
3. **기존 오버레이 렌더** — 1296~1322행 `{metaOverlay && (...)}` 블록. 조건 `metaOverlay &&`를
   제거하고 **항상 렌더**로 바꾸되, 아래 신규 스펙으로 위치·배경·높이를 교체(작업 ②·⑤와 통합).

### 신규 sticky 오버레이 스펙 (기존 1296~1322행 대체)
```jsx
{/* 메타 sticky 오버레이 — 항상 렌더. metaX가 자연 위치/경계 고정을 단일 산식으로 처리 */}
<div style={{
  position: 'absolute',
  left: TRACK_INSET + Math.max(0, -scrollPos),   // sticky x (작업 ①)
  top: Math.round((vpSize.h - slideH) / 2) - META_BLEED,      // 작업 ② bleed
  width: INFO_SLIDE_W + 16,
  height: Math.round(slideH) + META_BLEED * 2,                // 작업 ② bleed
  paddingLeft: 0,
  paddingRight: 16,
  paddingTop: META_TOP_PAD,       // 작업 ⑤ 상단 하향
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  gap: META_GAP,                  // 작업 ⑤ (기존 24 → 축소)
  fontFamily: FONT,
  color: '#080706',
  background: 'rgba(255,255,255,0.66)',   // 작업 ② 투명도 (0.72 → 0.66)
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  opacity: infoIn ? 1 : 0,
  transition: 'opacity 400ms ease',
  overflowY: 'auto',              // 작업 ⑤에서 이 스크롤이 안 생기도록 콘텐츠 압축
  zIndex: 7,
}}>
  {infoContent}
</div>
```
주의: 기존 오버레이는 `width: TRACK_INSET + INFO_SLIDE_W + 16`, `paddingLeft: TRACK_INSET`였다.
sticky x가 이미 `TRACK_INSET`을 포함하므로 **width에서 `TRACK_INSET` 제거, paddingLeft를 0으로**
바꾼다(좌측 경계에 정확히 붙되 텍스트는 경계에서 시작). 상수 `META_BLEED·META_TOP_PAD·META_GAP`은
작업 ②·⑤에서 정의.

---

## 작업 ② — 배경 투명도 · 실선 틈 제거

### 투명도
- sticky 오버레이 `background`: `rgba(255,255,255,0.72)` → **`rgba(255,255,255,0.66)`**.
  ("아주 약간만 더 투명" — 실물에서 0.60~0.70 사이 미세 조정 가능, 기본값 0.66.)

### 실선 틈 (도산대로 1번 스크린샷 빨간 원)
원인: 오버레이 배경 높이 `Math.round(slideH)`와 이미지 슬라이드 높이 `slideH`가 각각 독립 반올림되어
1px 어긋난다. 해법: 배경을 상하로 `META_BLEED`만큼 초과 확장해 반올림 오차를 흡수.
```
const META_BLEED = 2   // 상수 선언부에 추가 (예: SLIDE_H_RATIO 근처)
```
- `top`: `Math.round((vpSize.h - slideH) / 2) - META_BLEED`
- `height`: `Math.round(slideH) + META_BLEED * 2`
이미지보다 위아래로 각 2px 크므로, 어떤 반올림 방향에서도 이미지 높이를 완전히 덮는다.

---

## 작업 ③ — 모든 슬라이드 뷰포트 정중앙 스냅 (첫·마지막 포함)

### 원인 (감사 확정)
`centerScroll(i)`(687~690행)는 슬라이드 i를 뷰포트 정중앙(`viewportW/2`)에 놓는 값으로 **정확하다**.
캡션(이미지 중앙 종속, 118~130행)·슬라이드 번호(뷰포트 중앙 `left:50%`, 1256행)도 각각 올바르다.
어긋남의 진짜 원인은 **`clampScroll`(711행)이 일부 슬라이드를 뷰포트 중앙 지점에서 막는 것**이다:
- `minScroll = Math.min(0, centerScroll(1))` — 히어로(인덱스1)만 하한 개방(695행).
- `maxScroll`에 `contentEnd + TRACK_INSET - viewportW`(700행)가 포함 — 마지막 슬라이드 우측 에지를
  뷰포트 우측에 맞추는 항. 이것이 마지막(및 근처) 슬라이드를 중앙보다 왼쪽에 고정한다.
결과: 중간의 좁은 슬라이드·마지막 슬라이드가 정중앙에 도달 못 해 캡션이 슬라이드 번호보다 왼쪽으로 보인다.

### 해법 (사용자 확정: 마지막 슬라이드도 중앙, 양 끝 여백 허용)
클램프 경계를 **모든 슬라이드의 중앙정렬 지점을 포함**하도록 확장한다. `contentEnd` 기반 우측
에지 정렬 항(700행)을 제거하고, 첫·마지막 슬라이드 중앙정렬 지점을 그대로 경계로 쓴다.

`minScroll`·`maxScroll`를 다음으로 교체(695~702행):
```jsx
// 모든 슬라이드를 뷰포트 정중앙에 스냅 가능하게 — 콘텐츠 슬라이드(인덱스 1..)의
// centerScroll 최소/최대를 경계로 삼는다. 양 끝 슬라이드에서 반대편 여백은 허용한다.
const contentCenterScrolls = rects.length >= 2
  ? Array.from({ length: rects.length - 1 }, (_, k) => centerScroll(k + 1))
  : [0]
const minScroll = Math.min(...contentCenterScrolls)
const maxScroll = Math.max(...contentCenterScrolls)
```
- 인덱스 0(정보 슬라이드)은 스냅 대상이 아니므로 제외(k+1로 1부터).
- 이렇게 하면 `goToSlide(i)` → `clampScroll(centerScroll(i))`가 모든 i에서 `centerScroll(i)`를
  그대로 통과시켜(경계가 곧 그 집합의 min/max이므로) 항상 정중앙에 스냅된다.
- 드래그 자유 스크롤도 이 경계 안에서 움직이고, 놓으면 기존 nearest 스냅이 정중앙으로 정착한다.

### 삭제 대상 (참조 전수 열거)
- `contentEnd` 상수(675~677행): 위 교체로 `maxScroll`에서의 참조가 사라진다. **다른 참조가 있는지
  grep으로 확인** — 없으면 선언 삭제, 있으면 그 지점을 먼저 처리 후 삭제. (tsc가 미사용 변수를
  잡지 못할 수 있으므로 grep `contentEnd` 0건 확인 필수.)

### 회귀 방지
- 드래그 중 트랙이 경계를 넘지 않는지(`clampScroll`가 드래그 핸들러에도 적용되는지) 확인.
  현재 드래그 핸들러가 `clampScroll`를 쓰면 자동 정합. 안 쓰면 경계 밖 스크롤 가능 → 확인 필요.
- `geomRef.current`에 `clampScroll·centerScroll`이 실려 있으므로(719~720행) 모프 경로도 자동 반영.

---

## 작업 ⑤ — 산수경 세로 스크롤 제거 (메타 콘텐츠 압축 + 상단 하향)

### 원인
산수경은 AWARDS(긴 서술)·LOCATION·46,303㎡ 등이 겹쳐 `slideH` 안에서 메타 세로가 넘쳐
`overflowY:auto` 스크롤이 발생(ROLE 하단 잘림). 최장 콘텐츠 프로젝트 기준으로 잡아야 한다.

### 해법 (사용자 확정 방향)
1. **상단 하향**: BACK·타이틀 세트 영역을 아래로 소폭 내린다 → sticky 오버레이 `paddingTop`.
2. **하단 압축**: AWARDS 이하를 위로 당긴다 → 블록 간 gap·marginBottom 축소.

### 신규 상수 (선언부 추가)
```
const META_TOP_PAD = 28   // BACK 위 상단 여백 — 오버레이 상단 붙음 완화 (사용자: 아래로 내림)
const META_GAP = 18       // 오버레이 세로 스택 gap (기존 24 → 18, 하단 압축)
```
`META_GAP`은 작업 ① 스펙의 `gap`에 이미 반영됨. `META_TOP_PAD`는 `paddingTop`에 반영됨.

### 추가 압축 (필요 시 — 산수경에서 여전히 넘치면)
`infoContent` 내부 조정으로 세로를 더 줄인다. 우선순위 순:
- 타이틀 세트 `marginBottom: 20`(1043행) → `14`.
- CLIENT+LOCATION 블록 `gap: 14`(1098행) → `12`.
- 2블록 `gap: 14`(1104행) → `12`.
- TITLE_SET_MIN_H `175`(30행) → 필요 시 `160`. (단 AWARDS 시작 y 전 프로젝트 동일화 규약이므로
  이 값 변경은 전 프로젝트에 영향 → 최후 수단.)

**절차**: 위 상수(META_TOP_PAD=28, META_GAP=18) 먼저 적용 후, 산수couk(최장) 기준으로 스크롤이
남으면 추가 압축을 순서대로 적용. ~0.8cm ≈ 30px 목표(사용자 언급)는 `META_GAP` 6px 축소 ×
블록 수 + marginBottom 6px 축소로 대략 충족. **다른 프로젝트에서 상단 여백 과다가 안 생기도록**
`META_TOP_PAD`는 28을 상한으로.

---

## 작업 순서 (의존성)

1. 상수 선언부 추가: `META_BLEED=2`, `META_TOP_PAD=28`, `META_GAP=18` (SLIDE_H_RATIO 근처).
2. 작업 ③ 먼저 — `minScroll·maxScroll` 교체, `contentEnd` grep 후 삭제. `centerScroll`은 불변.
3. 작업 ① — `metaOverlay·heroLeftScreen` 삭제, 트랙 자식 0을 빈 폭예약으로, 오버레이 항상 렌더.
4. 작업 ②·⑤ — 오버레이 스펙에 투명도·bleed·top-pad·gap 반영(작업 ① 신규 스펙에 이미 통합).
5. `npx tsc --noEmit` — 잔존 참조(`metaOverlay`·`heroLeftScreen`·`contentEnd`) 오류로 검출.
6. grep 확인: `grep -n "metaOverlay\|heroLeftScreen\|contentEnd" GridContentArea.tsx` → **0건**이어야 함.

## 삭제 심볼 요약 (전수)
`metaOverlay`, `heroLeftScreen`, `contentEnd` — 세 상수 완전 제거. 각각 참조 지점을 위에 열거함.
트랙 자식 0 div는 **삭제 아님**(폭 INFO_SLIDE_W 예약 유지, 내용만 제거).

## 불변 (건드리지 말 것)
- `centerScroll` 함수(687~690행) — 정확하므로 불변.
- 캡션 렌더(118~143행) — 이미지 중앙 종속, 올바름. 불변.
- 슬라이드 번호(1252~1267행) — 뷰포트 중앙, 올바름. 불변.
- rects 인덱싱(0=정보, 1..=콘텐츠), `INFO_SLIDE_W` 폭 예약 — 불변.
- `ContentArea.tsx`(링월) — 절대 수정 금지.
