# 그리드 콘텐츠 중앙정렬 산식 최종 수정 (GRID_CONTENT_center_fix)

> 대부분 프로젝트에서 히어로가 좌측에 붙는 결함. 넓은 이미지(도산대로229)만 우연히 중앙에 옴.
> 원인 = 초기 scrollPos가 `centers[1]`(슬롯 중심) 기준이라 이미지 폭에 따라 어긋남.
> 실제 이미지 폭(rects[1].width) 기준 역산으로 교체. 링월·그리드 공통 가능성 확인.

---

## 0. 결함 진단 (실측 패턴)

- `/work-grid/[slug]` 진입 시 히어로가 화면 좌측에 붙음(산수경·아라리오·고래·리조트·예다함).
- 도산대로229(가로로 매우 넓은 이미지)만 중앙. → **넓을수록 중앙, 좁을수록 좌측**.
- 원인: 초기 scrollPos = `centers[1] - vpW/2`. `centers[1]`은 트랙 좌표계상 정보슬라이드(270)
  + 갭 + 히어로슬롯 절반. 히어로가 좁으면 값이 작아 트랙이 왼쪽에 머묾 → 히어로 좌측 부착.

---

## 1. 수정 — 실제 이미지 폭 기준 역산

### 1-1. 초기 scrollPos 산식 (GridContentArea)
히어로 이미지의 **화면상 실제 중심**을 뷰포트 중심에 맞춘다:
```
// 목표: 히어로 화면 좌측 = viewportW/2 - heroW/2  (히어로가 화면 정중앙)
// 히어로의 트랙 좌표상 좌측 = TRACK_INSET + rects[1].x
// 트랙은 translateX(-scrollPos)이므로 화면 좌측 = 트랙좌측 - scrollPos
// 따라서:  TRACK_INSET + rects[1].x - scrollPos = viewportW/2 - heroW/2
const heroW = rects[1].width            // 원본비 반영된 실제 폭 (centers 아님)
const targetScroll = (TRACK_INSET + rects[1].x) - (vpSize.w / 2 - heroW / 2)
setScrollPos(clampScroll(targetScroll))
```
- **핵심**: `heroW = rects[1].width`(실제 이미지 폭). `centers[1]`(슬롯 중심) 사용 금지.
- rects.length ≥ 2 가드. 좌표 px 정수, transform 퍼센트 금지(Safari).

### 1-2. morph 도착 left 정합
morph 도착 히어로 화면 left도 동일 기준:
```
const heroScreenLeft = vpSize.w / 2 - heroW / 2   // 정중앙
```
- morph 도착 rect의 left = 이 값. 정착 scrollPos와 morph 도착이 같은 heroScreenLeft를
  가리켜야 morph 종료 시 안 튐.
- ⚠ 기존 morph 도착이 `TRACK_INSET + INFO_SLIDE_W + SLIDE_GAP_PX`(좌측 고정 잔재)면 제거하고
  `vpSize.w/2 - heroW/2`로 교체.

### 1-3. 메타 오버레이 폴백 임계 재확인 (v3_1 §3-1과 정합)
중앙정렬이 실제 폭 기준으로 바뀌면 메타 좌측 화면 위치도 재계산:
```
const heroLeftScreen = vpSize.w / 2 - heroW / 2
const metaLeftScreen = heroLeftScreen - SLIDE_GAP_PX - INFO_SLIDE_W
const metaOverlay = metaLeftScreen < 0
```
- v3_1의 임계와 동일. 중앙정렬 산식 수정 후 이 값이 정확해짐.

---

## 2. 링월 적용 여부
- 링월도 같은 증상인지 확인 필요. 링월은 초기 scrollPos=0(좌측 정렬)이라 히어로가 원래
  좌측에서 시작 → 링월은 "중앙정렬"이 요건이 아니었을 수 있음.
- ⚠ **구현자 확인**: 링월 콘텐츠 진입 시 히어로가 중앙이어야 하는가? 그렇다면 동일 산식 적용.
  아니면(좌측 정렬이 링월 의도) 그리드만 이 수정 적용. → 배포 전 링월 현행 동작 확인 후 판단.
- 이 명세는 **그리드 GridContentArea 우선**. 링월은 확인 후 선택 적용.

---

## 3. 검증
- `npx tsc --noEmit`만. dev·build 금지.
- 무수정: LandingExperience.tsx·useRingWall.ts·work-grid 라우트.
- 수정: GridContentArea.tsx(초기 scrollPos·morph 도착 left). 링월 ContentArea는 §2 판단 후.
- tsc 안 잡히는 것: 중앙정렬 시각 결과 → 배포 확인(전 프로젝트 히어로 중앙 오는지).

## 4. 배포 후 확인
1. 모든 프로젝트(좁은 이미지 포함)에서 히어로가 화면 정중앙.
2. 도산대로229(넓은 이미지)도 여전히 중앙 + 메타 오버레이(v3_1).
3. 정사각 이미지(고래)도 중앙.
4. morph 종료 시 이미지 안 튐.
5. 메타 오버레이 임계가 실제 폭 기준으로 정확히 발동.
