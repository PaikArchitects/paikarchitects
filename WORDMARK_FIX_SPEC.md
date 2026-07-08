# WORDMARK_FIX_SPEC — 인트로 워드마크 디센더 잘림 수정

## 0. 문제
인트로 워드마크 "Architect Changhyun Paik"에서 디센더를 가진 글리프('g', 'y'의 하단 획)가 잘린다. 데스크톱·모바일 공통.

## 1. 원인 (확정 진단 — 추정 아님)
`src/app/globals.css`:
- `.wordmark-intro`가 `line-height: 1` → 라인 박스 높이 = 폰트 사이즈. 디센더는 라인 박스 아래로 돌출한다.
- `.wordmark-intro .rest`에 로고 수축 애니메이션(max-width 보간)을 위한 `overflow: hidden`이 걸려 있어, 라인 박스 밖으로 나간 디센더가 클리핑된다.

## 2. 수정 (외과적 — 레이아웃 치수 불변)
`src/app/globals.css`의 `.wordmark-intro .rest, .wordmark-intro .spacer` 규칙에 다음 2줄 추가:

```css
padding-bottom: 0.25em;
margin-bottom: -0.25em;
```

원리: `padding-bottom`이 클립 박스를 아래로 0.25em 확장해 디센더 렌더 공간을 확보하고, 동수의 음수 `margin-bottom`이 박스의 마진 에지를 원위치로 되돌린다.
- inline-block(overflow≠visible)의 베이스라인 = 하단 마진 에지 → 마진 에지가 불변이므로 베이스라인 정렬 불변.
- 레이아웃 점유 높이 불변 → 인트로 수축 애니메이션(1600ms max-width 보간)·최종 안착 위치에 부작용 없음.

## 3. 금지 사항
- `line-height` 변경 금지 (워드마크 전체 박스 높이가 변해 고정 위치 안착점이 이동한다).
- `overflow` 값 변경 금지 (`overflow-x`/`overflow-y` 분리 포함 — 한 축이 hidden이면 다른 축의 visible은 auto로 계산되어 스크롤바 유발 위험).
- 다른 파일 접촉 금지. 수정 파일은 `src/app/globals.css` 1개.

## 4. 검증
`npx tsc --noEmit` (CSS 전용 수정이므로 통과 확인만). 시각 검증은 배포 후 인트로 재생 화면에서 'g'·'y' 하단 획 온전 여부 — 데스크톱·모바일 각 1회.
