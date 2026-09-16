# AUDIT_REPORT_landing2_260916 — 보완 감사 결과

감사 대상: `D:\00 Web\paikarchitects`
실행일: 2026-09-16
생성 파일: 본 파일 1개. 소스 파일 수정·삭제·포맷 없음. `npm run dev`/`build`/`install` 미실행.
기록 원칙: 줄 번호 포함 원문 발췌와 명령 출력만. 결과 없으면 "없음(0건)".

---

## 1. `git show` — d52d90f

### 1-1. `git show --stat d52d90f` 출력 전문

```
commit d52d90f9c60889652003323bafdc7cece620b602
Author: PaikArchitects <paikarchitects@gmail.com>
Date:   Mon Aug 10 12:12:22 2026 +0900

    grid morph rect height

 GRID_MORPH_rect_height_fix_260804.md | 117 +++++++++++++++++++++++++++++++++++
 src/components/GridContentArea.tsx   |  11 +++-
 2 files changed, 125 insertions(+), 3 deletions(-)
```

### 1-2. `git show d52d90f` diff 전문

```diff
commit d52d90f9c60889652003323bafdc7cece620b602
Author: PaikArchitects <paikarchitects@gmail.com>
Date:   Mon Aug 10 12:12:22 2026 +0900

    grid morph rect height

diff --git a/GRID_MORPH_rect_height_fix_260804.md b/GRID_MORPH_rect_height_fix_260804.md
new file mode 100644
index 0000000..2f27f5e
--- /dev/null
+++ b/GRID_MORPH_rect_height_fix_260804.md
@@ -0,0 +1,117 @@
+# GRID_MORPH_rect_height_fix_260804 — morph 도착 rect 높이 기준 통일
+
+대상: `src/components/GridContentArea.tsx` 단일 파일.
+검증: `npx tsc --noEmit`만. dev/build 금지.
+
+---
+
+## 0. 증상
+모프가 끝나는 찰나에 **이미지가 확대된 것처럼** 큰 모습이 잠시 비치고 정상 크기로 돌아온다.
+진입에서 심각, 복귀에서는 경미. 반복해도 동일(= 로드 문제 아님).
+
+---
+
+## 1. 원인 (확정) — 폭과 높이가 서로 다른 기준으로 계산된다
+
+### 트랙 슬라이드의 실제 크기
+```
+684행: const slideH = vpSize.h * SLIDE_H_RATIO      ← 뷰포트 높이 기준
+695행: widths.push(ratio * slideH)                   ← rects[1].w = ratio × slideH
+```
+트랙 히어로는 **높이 `slideH`, 폭 `ratio × slideH`** 로 그려진다. 종횡비 = `ratio`(원본비). 정상.
+
+### morph 도착 rect
+```
+793행: const rh = rootRef.current.clientHeight       ← 루트 컨테이너 높이 (≠ vpSize.h)
+824행: const th = rh * SLIDE_H_RATIO                 ← 높이는 rh 기준
+827행: const tw = hasHero ? rc[1].w : th * aspect    ← 폭은 slideH 기준(rc[1].w)
+```
+**폭은 `ratio × slideH`(큰 기준), 높이는 `rh × SLIDE_H_RATIO`(작은 기준)** 를 조합한다.
+
+루트 컨테이너는 헤더 셸 아래 영역이므로 `rh < vpSize.h`이고, 따라서 `th < slideH`다.
+결과적으로 morph 도착 박스는 **폭은 정상인데 높이가 부족한 가로로 납작한 형태**가 되고,
+종횡비가 원본보다 커진다(`tw/th > ratio`).
+
+`objectFit: 'cover'`는 이 납작한 박스를 채우기 위해 이미지를 **확대 크롭**한다.
+→ 이것이 "확대된 큰 이미지"의 정체다.
+
+### 왜 "찰나에 비치는가"
+morph 레이어는 도착 후 즉시 사라지지 않는다(852~863행):
+```
+MORPH_MS(700)                     → setMorphing(false), 트랙 페이드인 시작. 모프 레이어 유지
+MORPH_MS + MORPH_HOLD_MS(400)     → setMorphVisible(false), 모프 레이어 페이드아웃 개시
++ MORPH_FADE_MS(250)              → rect 해제
+```
+HOLD 400ms 동안 **확대 크롭된 morph 레이어**가 **정상 크기 트랙 히어로 위에 겹쳐** 있다가
+페이드아웃한다. 사용자에게는 "큰 이미지가 잠시 비치고 정상 크기로 돌아오는" 것으로 보인다.
+
+### 복귀가 경미한 이유
+역-morph(879행)도 같은 `rh` 기준을 쓰지만, 출발점이 **화면에 실제로 있던 슬라이드**라
+시작 프레임의 불일치가 눈에 덜 띈다. 다만 원리적으로 동일한 결함이므로 함께 고친다.
+
+---
+
+## 2. 수정 — 높이 기준을 트랙과 통일
+
+morph 도착 높이를 `rh` 기준이 아니라 **트랙과 동일한 `slideH`** 로 계산한다.
+`slideH`는 컴포넌트 스코프에 이미 존재하므로(684행) 그대로 참조하면 된다.
+
+### 2-1. 진입 morph (824행)
+```
+const th = rh * SLIDE_H_RATIO
+        ↓
+const th = slideH        // 트랙 슬라이드와 동일 높이 — 폭(rc[1].w)과 같은 기준이어야 종횡비가 맞는다
+```
+
+### 2-2. 진입 morph top 좌표 (845행)
+`top`은 루트 컨테이너 기준 좌표이므로 `rh`를 계속 쓴다. **여기는 바꾸지 않는다.**
+```
+top: (rh - th) / 2,      // 유지 — 컨테이너 내 세로 중앙
+```
+단 `th`가 커졌으므로 세로 중앙 위치는 자동으로 재계산된다.
+
+⚠ `slideH > rh`인 경우(뷰포트 대비 컨테이너가 매우 낮을 때) `top`이 음수가 될 수 있다.
+평시에는 `SLIDE_H_RATIO = 0.72`이므로 `slideH = 0.72 × vpSize.h`이고 `rh`는 헤더를 뺀 값이라
+`slideH < rh`가 성립한다. 성립하지 않는 극단적 뷰포트에서는 트랙 히어로도 같은 높이로
+그려지므로 morph와 트랙이 여전히 일치한다 — 불일치는 발생하지 않는다.
+
+### 2-3. 역-morph (879행 근처, 같은 패턴)
+역-morph 블록에서도 동일하게 `rh * SLIDE_H_RATIO` → `slideH`로 교체한다.
+해당 지점을 grep으로 확인해 **전부** 바꿀 것:
+```
+grep -n "rh \* SLIDE_H_RATIO" GridContentArea.tsx
+```
+→ 진입·역morph 양쪽 모두 교체. 교체 후 이 grep 결과가 **0건**이어야 한다.
+
+⚠ 역-morph의 출발 슬라이드가 **diagramSet**이면 트랙 높이가 `diagramH`(= `vpSize.h × DIAGRAM_H_RATIO`)
+이지 `slideH`가 아니다. 출발 슬라이드 종류에 따라 높이를 맞춘다:
+```jsx
+const curSlideH = curSlide && isDiagram(curSlide) ? diagramH : slideH
+```
+그리고 역-morph의 `th`에 `curSlideH`를 쓴다. (진입은 항상 커버=image이므로 `slideH` 고정.)
+
+---
+
+## 3. 검증
+
+### 코드
+1. `npx tsc --noEmit` — 오류 0.
+2. `grep -n "rh \* SLIDE_H_RATIO" GridContentArea.tsx` → **0건**.
+3. `rh` 자체는 `top` 계산에 여전히 필요하므로 **선언은 유지**된다(미사용 아님).
+
+### 육안
+1. 진입: 모프 종료 순간 확대된 이미지가 비치지 않고, 크기 변화 없이 트랙 히어로로 인계된다.
+2. 복귀: 역-morph 출발 시 크기 튐 없음.
+3. 가로로 긴 프로젝트(도산대로)·정상 비율(산수경) 양쪽에서 확인.
+4. diagramSet 슬라이드에서 뒤로가기 — 크기 튐 없음.
+
+---
+
+## 4. 절대 불변
+- 메타 sticky 구조(`metaShift`·`META_SLOT_W`·`META_PAD_X`·`INFO_SLIDE_W 270`·`TITLE_SET_MIN_H 160`) — 불변.
+- morph 2겹 레이어(썸네일 하위 + 원본 상위, `FULL_FADE_MS 120`) — 불변.
+- `holdBackdrop`·역-morph `curIdx` 출발 rect·`closeProject` rect 재측정 — 불변.
+- 타이밍 상수 `MORPH_MS 700`·`MORPH_HOLD_MS 400`·`MORPH_FADE_MS 250` — 불변.
+  (HOLD 구간 자체는 트랙 페이드인을 덮는 정당한 설계다. 문제는 크기 불일치였지 타이밍이 아니다.)
+- `centerScroll`·`clampScroll`·캡션·슬라이드 카운터 — 불변.
+- `ContentArea.tsx`·`GridExperience.tsx` — 수정 없음.
diff --git a/src/components/GridContentArea.tsx b/src/components/GridContentArea.tsx
index 0b66579..c71a992 100644
--- a/src/components/GridContentArea.tsx
+++ b/src/components/GridContentArea.tsx
@@ -821,7 +821,10 @@ export function GridContentArea({ project, mode, enterRect, onBack }: GridConten
       const aspect = project.coverRatio && project.coverRatio > 0
         ? project.coverRatio
         : FALLBACK_RATIO
-      const th = rh * SLIDE_H_RATIO
+      // 도착 높이는 트랙 슬라이드와 **동일한 기준**이어야 한다 — 폭(rc[1].w)은 slideH 기준으로
+      // 계산된 값이므로 높이를 루트 컨테이너(rh) 기준으로 잡으면 종횡비가 어긋나
+      // objectFit:'cover'가 확대 크롭한다(= 모프 종료 찰나의 "큰 이미지"). slideH로 통일한다.
+      const th = slideH
       // 도착 폭은 트랙이 예약한 rects[1].w 그대로 — getSlides가 주입한 coverRatio로 계산된 값이라
       // aspect 기반 재계산과 같지만, 1px도 어긋나지 않도록 동일 소스를 쓴다
       const tw = hasHero ? rc[1].w : th * aspect
@@ -888,10 +891,12 @@ export function GridContentArea({ project, mode, enterRect, onBack }: GridConten
           ? Math.min(Math.max(1, nearestRef.current), rc.length - 1)
           : 1
         // 슬라이드마다 높이가 다르다 — rects에는 폭(x·w)만 있고 높이는 트랙 렌더와 동일한
-        // 규칙(isDiagram ? DIAGRAM_H_RATIO : SLIDE_H_RATIO)으로 재현한다.
+        // 값(isDiagram ? diagramH : slideH)을 그대로 쓴다. 진입 morph와 같은 이유로 rh 기준
+        // 재계산은 폭(rc[curIdx].w)과 기준이 어긋나 종횡비가 깨진다 — 트랙 높이를 직접 참조한다.
         // 트랙은 alignItems:center이므로 세로 중앙 정렬은 두 높이 모두 (rh - th)/2로 같다.
         const curSlide = hasHero ? slides[curIdx - 1] : undefined
-        const th = rh * (curSlide && isDiagram(curSlide) ? DIAGRAM_H_RATIO : SLIDE_H_RATIO)
+        const curSlideH = curSlide && isDiagram(curSlide) ? diagramH : slideH
+        const th = curSlideH
         const tw = hasHero
           ? rc[curIdx].w
           : th * (project.coverRatio && project.coverRatio > 0 ? project.coverRatio : FALLBACK_RATIO)
```

---

## 2. d52d90f 변경 파일별 후속 이력·누적 diff

d52d90f에서 변경된 파일은 2개다.

1. `GRID_MORPH_rect_height_fix_260804.md`
2. `src/components/GridContentArea.tsx`

### 2-1. `GRID_MORPH_rect_height_fix_260804.md`

#### `git log --oneline d52d90f..HEAD -- GRID_MORPH_rect_height_fix_260804.md`

```
```

**없음(0건)** — 출력 없음(종료 코드 0). d52d90f 이후 이 파일을 건드린 커밋 없음.

#### `git diff d52d90f~1 HEAD -- GRID_MORPH_rect_height_fix_260804.md` 출력 전문

```diff
diff --git a/GRID_MORPH_rect_height_fix_260804.md b/GRID_MORPH_rect_height_fix_260804.md
new file mode 100644
index 0000000..2f27f5e
--- /dev/null
+++ b/GRID_MORPH_rect_height_fix_260804.md
@@ -0,0 +1,117 @@
+# GRID_MORPH_rect_height_fix_260804 — morph 도착 rect 높이 기준 통일
+
+대상: `src/components/GridContentArea.tsx` 단일 파일.
+검증: `npx tsc --noEmit`만. dev/build 금지.
+
+---
+
+## 0. 증상
+모프가 끝나는 찰나에 **이미지가 확대된 것처럼** 큰 모습이 잠시 비치고 정상 크기로 돌아온다.
+진입에서 심각, 복귀에서는 경미. 반복해도 동일(= 로드 문제 아님).
+
+---
+
+## 1. 원인 (확정) — 폭과 높이가 서로 다른 기준으로 계산된다
+
+### 트랙 슬라이드의 실제 크기
+```
+684행: const slideH = vpSize.h * SLIDE_H_RATIO      ← 뷰포트 높이 기준
+695행: widths.push(ratio * slideH)                   ← rects[1].w = ratio × slideH
+```
+트랙 히어로는 **높이 `slideH`, 폭 `ratio × slideH`** 로 그려진다. 종횡비 = `ratio`(원본비). 정상.
+
+### morph 도착 rect
+```
+793행: const rh = rootRef.current.clientHeight       ← 루트 컨테이너 높이 (≠ vpSize.h)
+824행: const th = rh * SLIDE_H_RATIO                 ← 높이는 rh 기준
+827행: const tw = hasHero ? rc[1].w : th * aspect    ← 폭은 slideH 기준(rc[1].w)
+```
+**폭은 `ratio × slideH`(큰 기준), 높이는 `rh × SLIDE_H_RATIO`(작은 기준)** 를 조합한다.
+
+루트 컨테이너는 헤더 셸 아래 영역이므로 `rh < vpSize.h`이고, 따라서 `th < slideH`다.
+결과적으로 morph 도착 박스는 **폭은 정상인데 높이가 부족한 가로로 납작한 형태**가 되고,
+종횡비가 원본보다 커진다(`tw/th > ratio`).
+
+`objectFit: 'cover'`는 이 납작한 박스를 채우기 위해 이미지를 **확대 크롭**한다.
+→ 이것이 "확대된 큰 이미지"의 정체다.
+
+### 왜 "찰나에 비치는가"
+morph 레이어는 도착 후 즉시 사라지지 않는다(852~863행):
+```
+MORPH_MS(700)                     → setMorphing(false), 트랙 페이드인 시작. 모프 레이어 유지
+MORPH_MS + MORPH_HOLD_MS(400)     → setMorphVisible(false), 모프 레이어 페이드아웃 개시
++ MORPH_FADE_MS(250)              → rect 해제
+```
+HOLD 400ms 동안 **확대 크롭된 morph 레이어**가 **정상 크기 트랙 히어로 위에 겹쳐** 있다가
+페이드아웃한다. 사용자에게는 "큰 이미지가 잠시 비치고 정상 크기로 돌아오는" 것으로 보인다.
+
+### 복귀가 경미한 이유
+역-morph(879행)도 같은 `rh` 기준을 쓰지만, 출발점이 **화면에 실제로 있던 슬라이드**라
+시작 프레임의 불일치가 눈에 덜 띈다. 다만 원리적으로 동일한 결함이므로 함께 고친다.
+
+---
+
+## 2. 수정 — 높이 기준을 트랙과 통일
+
+morph 도착 높이를 `rh` 기준이 아니라 **트랙과 동일한 `slideH`** 로 계산한다.
+`slideH`는 컴포넌트 스코프에 이미 존재하므로(684행) 그대로 참조하면 된다.
+
+### 2-1. 진입 morph (824행)
+```
+const th = rh * SLIDE_H_RATIO
+        ↓
+const th = slideH        // 트랙 슬라이드와 동일 높이 — 폭(rc[1].w)과 같은 기준이어야 종횡비가 맞는다
+```
+
+### 2-2. 진입 morph top 좌표 (845행)
+`top`은 루트 컨테이너 기준 좌표이므로 `rh`를 계속 쓴다. **여기는 바꾸지 않는다.**
+```
+top: (rh - th) / 2,      // 유지 — 컨테이너 내 세로 중앙
+```
+단 `th`가 커졌으므로 세로 중앙 위치는 자동으로 재계산된다.
+
+⚠ `slideH > rh`인 경우(뷰포트 대비 컨테이너가 매우 낮을 때) `top`이 음수가 될 수 있다.
+평시에는 `SLIDE_H_RATIO = 0.72`이므로 `slideH = 0.72 × vpSize.h`이고 `rh`는 헤더를 뺀 값이라
+`slideH < rh`가 성립한다. 성립하지 않는 극단적 뷰포트에서는 트랙 히어로도 같은 높이로
+그려지므로 morph와 트랙이 여전히 일치한다 — 불일치는 발생하지 않는다.
+
+### 2-3. 역-morph (879행 근처, 같은 패턴)
+역-morph 블록에서도 동일하게 `rh * SLIDE_H_RATIO` → `slideH`로 교체한다.
+해당 지점을 grep으로 확인해 **전부** 바꿀 것:
+```
+grep -n "rh \* SLIDE_H_RATIO" GridContentArea.tsx
+```
+→ 진입·역morph 양쪽 모두 교체. 교체 후 이 grep 결과가 **0건**이어야 한다.
+
+⚠ 역-morph의 출발 슬라이드가 **diagramSet**이면 트랙 높이가 `diagramH`(= `vpSize.h × DIAGRAM_H_RATIO`)
+이지 `slideH`가 아니다. 출발 슬라이드 종류에 따라 높이를 맞춘다:
+```jsx
+const curSlideH = curSlide && isDiagram(curSlide) ? diagramH : slideH
+```
+그리고 역-morph의 `th`에 `curSlideH`를 쓴다. (진입은 항상 커버=image이므로 `slideH` 고정.)
+
+---
+
+## 3. 검증
+
+### 코드
+1. `npx tsc --noEmit` — 오류 0.
+2. `grep -n "rh \* SLIDE_H_RATIO" GridContentArea.tsx` → **0건**.
+3. `rh` 자체는 `top` 계산에 여전히 필요하므로 **선언은 유지**된다(미사용 아님).
+
+### 육안
+1. 진입: 모프 종료 순간 확대된 이미지가 비치지 않고, 크기 변화 없이 트랙 히어로로 인계된다.
+2. 복귀: 역-morph 출발 시 크기 튐 없음.
+3. 가로로 긴 프로젝트(도산대로)·정상 비율(산수경) 양쪽에서 확인.
+4. diagramSet 슬라이드에서 뒤로가기 — 크기 튐 없음.
+
+---
+
+## 4. 절대 불변
+- 메타 sticky 구조(`metaShift`·`META_SLOT_W`·`META_PAD_X`·`INFO_SLIDE_W 270`·`TITLE_SET_MIN_H 160`) — 불변.
+- morph 2겹 레이어(썸네일 하위 + 원본 상위, `FULL_FADE_MS 120`) — 불변.
+- `holdBackdrop`·역-morph `curIdx` 출발 rect·`closeProject` rect 재측정 — 불변.
+- 타이밍 상수 `MORPH_MS 700`·`MORPH_HOLD_MS 400`·`MORPH_FADE_MS 250` — 불변.
+  (HOLD 구간 자체는 트랙 페이드인을 덮는 정당한 설계다. 문제는 크기 불일치였지 타이밍이 아니다.)
+- `centerScroll`·`clampScroll`·캡션·슬라이드 카운터 — 불변.
+- `ContentArea.tsx`·`GridExperience.tsx` — 수정 없음.
```

### 2-2. `src/components/GridContentArea.tsx`

#### `git log --oneline d52d90f..HEAD -- src/components/GridContentArea.tsx`

```
267ddea grid morph crop match
```

1건.

#### `git diff d52d90f~1 HEAD -- src/components/GridContentArea.tsx` 출력 전문

```diff
diff --git a/src/components/GridContentArea.tsx b/src/components/GridContentArea.tsx
index 0b66579..d06a31d 100644
--- a/src/components/GridContentArea.tsx
+++ b/src/components/GridContentArea.tsx
@@ -20,9 +20,10 @@ import type { CreditsSlide, DiagramSetSlide, ImageSlide, PortableTextBlock, Proj
 import { useFinePointer } from '@/hooks/useFinePointer'
 import { BilingualText } from '@/lib/bilingual'
 import { sizeLabel, sizeValue, splitRole } from '@/lib/projectMeta'
-// 그리드 카드와 **동일한** 4:3 크롭 URL — morph 하위 레이어가 캐시 히트로 즉시 그려지려면
-// 함수·인자(800·coverHotspot)가 카드 쪽과 정확히 같아야 한다 (GRID_MORPH_fix 작업 ①)
-import { gridThumb43 } from '@/lib/imageUrl'
+// gridThumb43: 그리드 카드와 **동일한** 4:3 크롭 URL — 역-morph 상위(도착=카드)가 카드와
+// 같은 화각으로 안착하려면 함수·인자(800·coverHotspot)가 카드 쪽과 정확히 같아야 한다.
+// sanityThumb: 폭 전용(크롭 없음) — 진입 morph 하위 레이어용 (GRID_MORPH_crop_match §2)
+import { gridThumb43, sanityThumb } from '@/lib/imageUrl'
 
 const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
 
@@ -601,12 +602,20 @@ export function GridContentArea({ project, mode, enterRect, onBack }: GridConten
   const slides = useMemo(() => getSlides(project), [project])
   const total = Math.max(slides.length, 1)
   // 카드와 1:1로 같은 URL — GridExperience 카드 <img>의 호출부와 인자를 일치시킨다
-  // (gridThumb43(project.coverImage, 800, project.coverHotspot)). 어느 한쪽만 바뀌면
-  // 캐시가 어긋나 진입 깜빡임이 되돌아온다 (작업 ①)
+  // (gridThumb43(project.coverImage, 800, project.coverHotspot)). 역-morph 상위 레이어(도착
+  // 지점이 카드)는 이 URL을 그대로 써야 카드와 화각이 어긋나지 않는다 (작업 ①)
   const coverThumb = useMemo(
     () => (project.coverImage ? gridThumb43(project.coverImage, 800, project.coverHotspot) : ''),
     [project.coverImage, project.coverHotspot],
   )
+  // 진입 morph 하위 레이어 — 상위(원본)와 동일 화각이어야 교체 시 배율이 튀지 않는다.
+  // gridThumb43(4:3 크롭)은 원본에서 이미 잘려나간 상태라 같은 컨테이너에 cover로 채워도
+  // 피사체가 더 크게 잡힌다 → 상위 원본이 올라오는 순간 화각이 튄다. 폭 전용 썸네일을 써서
+  // 두 레이어가 같은 범위를 보여주고 해상도만 달라지게 한다 (GRID_MORPH_crop_match §2-2)
+  const morphThumbSrc = useMemo(
+    () => (project.coverImage ? sanityThumb(project.coverImage, 800) : ''),
+    [project.coverImage],
+  )
   const finePointer = useFinePointer()
 
   const rootRef = useRef<HTMLDivElement>(null)
@@ -821,7 +830,10 @@ export function GridContentArea({ project, mode, enterRect, onBack }: GridConten
       const aspect = project.coverRatio && project.coverRatio > 0
         ? project.coverRatio
         : FALLBACK_RATIO
-      const th = rh * SLIDE_H_RATIO
+      // 도착 높이는 트랙 슬라이드와 **동일한 기준**이어야 한다 — 폭(rc[1].w)은 slideH 기준으로
+      // 계산된 값이므로 높이를 루트 컨테이너(rh) 기준으로 잡으면 종횡비가 어긋나
+      // objectFit:'cover'가 확대 크롭한다(= 모프 종료 찰나의 "큰 이미지"). slideH로 통일한다.
+      const th = slideH
       // 도착 폭은 트랙이 예약한 rects[1].w 그대로 — getSlides가 주입한 coverRatio로 계산된 값이라
       // aspect 기반 재계산과 같지만, 1px도 어긋나지 않도록 동일 소스를 쓴다
       const tw = hasHero ? rc[1].w : th * aspect
@@ -888,10 +900,12 @@ export function GridContentArea({ project, mode, enterRect, onBack }: GridConten
           ? Math.min(Math.max(1, nearestRef.current), rc.length - 1)
           : 1
         // 슬라이드마다 높이가 다르다 — rects에는 폭(x·w)만 있고 높이는 트랙 렌더와 동일한
-        // 규칙(isDiagram ? DIAGRAM_H_RATIO : SLIDE_H_RATIO)으로 재현한다.
+        // 값(isDiagram ? diagramH : slideH)을 그대로 쓴다. 진입 morph와 같은 이유로 rh 기준
+        // 재계산은 폭(rc[curIdx].w)과 기준이 어긋나 종횡비가 깨진다 — 트랙 높이를 직접 참조한다.
         // 트랙은 alignItems:center이므로 세로 중앙 정렬은 두 높이 모두 (rh - th)/2로 같다.
         const curSlide = hasHero ? slides[curIdx - 1] : undefined
-        const th = rh * (curSlide && isDiagram(curSlide) ? DIAGRAM_H_RATIO : SLIDE_H_RATIO)
+        const curSlideH = curSlide && isDiagram(curSlide) ? diagramH : slideH
+        const th = curSlideH
         const tw = hasHero
           ? rc[curIdx].w
           : th * (project.coverRatio && project.coverRatio > 0 ? project.coverRatio : FALLBACK_RATIO)
@@ -1386,8 +1400,9 @@ export function GridContentArea({ project, mode, enterRect, onBack }: GridConten
 
       {/* ── 모프 레이어: 카드 rect ↔ 현재 슬라이드 rect ──
           2겹이다. 두 겹은 **동일한 rect·objectFit**을 공유해야 교체 순간 어긋나지 않는다.
-            하위 = 즉시 그려져야 하는 쪽. 진입에서는 카드와 같은 썸네일(캐시 히트 → 흰 깜빡임
-                   차단, 작업 ①), 역-morph에서는 보고 있던 슬라이드 원본(morphFromSrc).
+            하위 = 즉시 그려져야 하는 쪽. 진입에서는 폭 전용 저해상 썸네일(morphThumbSrc —
+                   상위 원본과 화각 동일, crop_match §2-2), 역-morph에서는 보고 있던 슬라이드
+                   원본(morphFromSrc).
             상위 = 목적지 이미지. 진입에서는 원본(onLoad 시), 역-morph에서는 카드 썸네일
                    (도착 직전 타이머). 둘 다 morphFullLoaded 하나로 켠다. */}
       {morphRect && (
@@ -1395,7 +1410,7 @@ export function GridContentArea({ project, mode, enterRect, onBack }: GridConten
           <>
             {/* eslint-disable-next-line @next/next/no-img-element */}
             <img
-              src={morphFromSrc ?? coverThumb}
+              src={morphFromSrc ?? morphThumbSrc}
               alt=""
               draggable={false}
               style={{
```

참고 — `git diff --stat d52d90f~1 HEAD` (두 파일):

```
 GRID_MORPH_rect_height_fix_260804.md | 117 +++++++++++++++++++++++++++++++++++
 src/components/GridContentArea.tsx   |  37 +++++++----
 2 files changed, 143 insertions(+), 11 deletions(-)
```

---

## 3. `src/components/SiteChromeContext.tsx` 전문 (79행)

```tsx
 1  'use client'
 2
 3  import { createContext, useContext, useState, useLayoutEffect, useEffect, type ReactNode } from 'react'
 4  import { usePathname } from 'next/navigation'
 5
 6  export type IntroPhase = 'wordmark' | 'collapsed' | 'done'
 7
 8  interface SiteChromeContextValue {
 9    introPhase: IntroPhase
10    introSkipped: boolean
11    wordmarkOnLight: boolean
12    navOnLight: boolean
13    setWordmarkOnLight: (value: boolean) => void
14    setNavOnLight: (value: boolean) => void
15  }
16
17  const SiteChromeContext = createContext<SiteChromeContextValue>({
18    introPhase: 'done',
19    introSkipped: true,
20    wordmarkOnLight: false,
21    navOnLight: false,
22    setWordmarkOnLight: () => {},
23    setNavOnLight: () => {},
24  })
25
26  const INTRO_STORAGE_KEY = 'acp-intro-played'
27
28  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect
29
30  export function SiteChromeProvider({ children }: { children: ReactNode }) {
31    const pathname = usePathname()
32    const [introPhase, setIntroPhase] = useState<IntroPhase>('wordmark')
33    const [introSkipped, setIntroSkipped] = useState(false)
34    const [wordmarkOnLight, setWordmarkOnLight] = useState(false)
35    const [navOnLight, setNavOnLight] = useState(false)
36
37    // 진입 시퀀스: 세션당 최초 진입이면서 랜딩(/)일 때만 1회 재생.
38    // 그 외(다른 페이지 최초 진입, 재방문 등)에는 최종 헤더 상태를 즉시 표시.
39    useIsomorphicLayoutEffect(() => {
40      let played = true
41      try {
42        played = sessionStorage.getItem(INTRO_STORAGE_KEY) === '1'
43      } catch {
44        played = true
45      }
46
47      if (played || pathname !== '/') {
48        try { sessionStorage.setItem(INTRO_STORAGE_KEY, '1') } catch {}
49        setIntroPhase('done')
50        setIntroSkipped(true)
51        return
52      }
53
54      try { sessionStorage.setItem(INTRO_STORAGE_KEY, '1') } catch {}
55      setIntroSkipped(false)
56      setIntroPhase('wordmark')
57      const t1 = setTimeout(() => setIntroPhase('collapsed'), 3200)
58      const t2 = setTimeout(() => setIntroPhase('done'), 4800)
59      return () => { clearTimeout(t1); clearTimeout(t2) }
60      // eslint-disable-next-line react-hooks/exhaustive-deps
61    }, [])
62
63    return (
64      <SiteChromeContext.Provider value={{
65        introPhase,
66        introSkipped,
67        wordmarkOnLight,
68        navOnLight,
69        setWordmarkOnLight,
70        setNavOnLight,
71      }}>
72        {children}
73      </SiteChromeContext.Provider>
74    )
75  }
76
77  export function useSiteChrome() {
78    return useContext(SiteChromeContext)
79  }
```

---

## 4. `src/components/SiteHeader.tsx` 전문 (156행)

```tsx
  1  'use client'
  2
  3  import Link from 'next/link'
  4  import { usePathname } from 'next/navigation'
  5  import { useEffect, useState } from 'react'
  6  import { useSiteChrome } from './SiteChromeContext'
  7
  8  const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
  9
 10  const NAV_ITEMS = [
 11    { label: 'ABOUT',    href: '/about'   },
 12    { label: 'WORKS',    href: '/work'    },
 13    { label: 'ESSAYS',   href: '/essays'  },
 14    { label: 'CONTACTS', href: '/contact' },
 15  ] as const
 16
 17  // 랜딩(/) 외 페이지 중 흰 배경(light) 레이아웃을 사용하는 경로
 18  // /work 계열(/work, /work/[slug])은 LandingExperience 흰 셸을 렌더하므로 항상 light
 19  const STATIC_LIGHT_PATHS = new Set(['/about', '/work', '/essays', '/contact'])
 20
 21  function isStaticLight(pathname: string): boolean {
 22    return STATIC_LIGHT_PATHS.has(pathname) || pathname.startsWith('/work/')
 23  }
 24
 25  export function SiteHeader() {
 26    const pathname = usePathname()
 27    const {
 28      introPhase,
 29      introSkipped,
 30      wordmarkOnLight: dynamicWordmarkOnLight,
 31      navOnLight: dynamicNavOnLight,
 32    } = useSiteChrome()
 33
 34    const isLanding = pathname === '/'
 35    const wordmarkOnLight = isLanding ? dynamicWordmarkOnLight : isStaticLight(pathname)
 36    const navOnLight = isLanding ? dynamicNavOnLight : isStaticLight(pathname)
 37
 38    const layoutVisible = introPhase === 'done'
 39    const wordmarkMoved = introPhase !== 'wordmark'
 40
 41    // ── 모바일 햄버거 메뉴 — 전역 크롬이므로 SiteHeader 소유 (§8). 라우트 변경 시 자동 닫힘 ──
 42    const [menuOpen, setMenuOpen] = useState(false)
 43    useEffect(() => {
 44      setMenuOpen(false)
 45    }, [pathname])
 46
 47    return (
 48      <>
 49        {/* ── 모바일 전용 불투명 헤더 바(56px) — 콘텐츠의 헤더 존 침범을 구조적으로 차단.
 50             데스크톱에서는 display:none (globals.css) ── */}
 51        <div className="mobile-header-bar" aria-hidden="true" />
 52
 53        {/* ── WORDMARK "Paik Architects" — 히어로 겸 헤더 로고(단일 요소). 홈 링크 ── */}
 54        <Link
 55          href="/"
 56          aria-label="Home"
 57          className={[
 58            'wordmark-intro',
 59            wordmarkMoved ? 'moved' : '',
 60            wordmarkOnLight ? 'on-light' : '',
 61            introSkipped ? 'instant' : '',
 62            !isLanding ? 'no-color-transition' : '',
 63          ].filter(Boolean).join(' ')}
 64        >
 65          <span className="word" style={{ fontWeight: 700 }}>Paik</span>
 66          <span className="wordmark-gap">&nbsp;</span>
 67          <span className="word" style={{ fontWeight: 300 }}>Architects</span>
 68        </Link>
 69
 70        {/* ── NAVIGATION — 데스크톱: 헤더 존 수평 중앙 / 모바일: 56px 바 내 우측 정렬 (globals.css) ── */}
 71        <nav
 72          className="site-nav"
 73          style={{
 74            opacity: layoutVisible ? 1 : 0,
 75            pointerEvents: layoutVisible ? 'auto' : 'none',
 76          }}
 77        >
 78          {NAV_ITEMS.map(({ label, href }) => {
 79            const current = pathname === href || (href === '/work' && pathname.startsWith('/work'))
 80            return (
 81              <Link
 82                key={label}
 83                href={href}
 84                className={current ? 'site-nav-link is-current' : 'site-nav-link'}
 85                style={{ color: navOnLight ? '#0a0908' : '#ffffff' }}
 86              >
 87                {label}
 88              </Link>
 89            )
 90          })}
 91        </nav>
 92
 93        {/* ── MOBILE HAMBURGER — <768px 전용 (globals.css가 표시 제어).
 94             SVG 통일 기하: viewBox 0 0 18 14, 선 중심 y=1/7/13 (중심 간격 6px 정수 — 균질 렌더) ── */}
 95        <button
 96          className="mobile-menu-btn"
 97          aria-label="Menu"
 98          onClick={() => setMenuOpen(o => !o)}
 99          style={{
100            color: '#080706',
101            opacity: layoutVisible ? 1 : 0,
102            pointerEvents: layoutVisible ? 'auto' : 'none',
103          }}
104        >
105          <svg
106            viewBox="0 0 18 14"
107            width={18}
108            height={14}
109            style={{ display: 'block' }}
110            stroke="currentColor"
111            strokeWidth={1.5}
112            strokeLinecap="butt"
113          >
114            <line x1="0" y1="1" x2="18" y2="1" />
115            <line x1="0" y1="7" x2="18" y2="7" />
116            <line x1="0" y1="13" x2="18" y2="13" />
117          </svg>
118        </button>
119
120        {/* 스크림 — 탭 시 닫힘 */}
121        <div
122          className={menuOpen ? 'mobile-menu-scrim open' : 'mobile-menu-scrim'}
123          onClick={() => setMenuOpen(false)}
124          aria-hidden="true"
125        />
126
127        {/* 좌측 메뉴 패널 — 필터 패널의 미러 (§8-2) */}
128        <nav className={menuOpen ? 'mobile-menu-panel open' : 'mobile-menu-panel'}>
129          {NAV_ITEMS.map(({ label, href }) => {
130            const current = pathname === href || (href === '/work' && pathname.startsWith('/work'))
131            return (
132              <Link
133                key={label}
134                href={href}
135                onClick={() => setMenuOpen(false)}
136                className={current ? 'mobile-menu-link is-current' : 'mobile-menu-link'}
137                style={{
138                  display: 'block',
139                  padding: '14px 0',
140                  fontFamily: FONT,
141                  fontSize: 13,
142                  fontWeight: current ? 500 : 300,
143                  letterSpacing: '0.08em',
144                  textTransform: 'uppercase',
145                  textDecoration: 'none',
146                  color: '#0a0908',
147                }}
148              >
149                <span className="mobile-menu-label">{label}</span>
150              </Link>
151            )
152          })}
153        </nav>
154      </>
155    )
156  }
```

---

## 5. `src/components/GridExperience.tsx` 380–470행 원문

```tsx
380      const v = posToCols(posFromEvent(e.clientX))
381      colsRef.current = v
382      paintRef.current(v)
383    }
384    const onTrackUp = () => {
385      if (!draggingRef.current) return
386      draggingRef.current = false
387      animateTo(clamp(Math.round(colsRef.current), MIN_COLS, maxCols))
388    }
389
390    const snapCols = Array.from({ length: maxCols - MIN_COLS + 1 }, (_, i) => MIN_COLS + i)
391
392    return (
393      <div style={{
394        fontFamily: FONT,
395        background: '#FFFFFF',
396        color: '#080706',
397        minHeight: '100vh',
398        paddingTop: HEADER_H,
399        paddingBottom: BAR_RESERVE,
400      }}>
401        {/*
402          이 라우트 전용 CSS. 카드 지오메트리는 JS가 매 프레임 인라인으로 쓰고, 이 시트는
403          변하지 않는 규칙(4:3 프레임·호버 요약·타이포 변수)만 담는다.
404          전역 헤더는 /work-grid를 light 경로로 모르므로(SiteHeader의 STATIC_LIGHT_PATHS 미포함,
405          해당 파일은 수정 금지 대상) 흰 배경 위에서 흰 글자가 된다. 이 라우트에서만 색을 덮는다.
406        */}
407        <style>{`
408          /* 전환 중 새 열 카드는 콘텐츠 우측 밖에서 대기한다 — 잘라내되 가로 스크롤은 금지 (§1-2) */
409          html, body { overflow-x: hidden; }
410          .gm-stage { overflow-x: clip; }
411          .gm-card {
412            position: absolute;
413            top: 0;
414            left: 0;
415            display: block;
416            opacity: 0;
417            color: inherit;
418            text-decoration: none;
419            cursor: pointer;
420            will-change: transform, width, height, opacity;
421            /* film movement의 "부드러운 재배치"가 사는 곳 — paint는 목표값만 쓰고 CSS가 트윈한다.
422               정수 열 스냅(nr 변경) 순간 전 카드가 새 (row,col)로 이 곡선을 타고 이동한다 (§1) */
423            transition: transform ${TWEEN_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1),
424                        width ${TWEEN_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1),
425                        height ${TWEEN_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1),
426                        opacity ${FADE_MS}ms ease;
427          }
428          /* 필터 재정렬 구간만 더 긴 곡선으로 덮는다 — 이동 거리가 밀도 전환보다 크다 (§4) */
429          .gm-flow .gm-card {
430            transition: transform ${FLOW_MS - 40}ms cubic-bezier(0.22, 0.61, 0.36, 1),
431                        width ${FLOW_MS - 40}ms cubic-bezier(0.22, 0.61, 0.36, 1),
432                        height ${FLOW_MS - 40}ms cubic-bezier(0.22, 0.61, 0.36, 1),
433                        opacity ${FADE_MS}ms ease;
434          }
435          .gm-frame {
436            width: 100%;
437            aspect-ratio: 4 / 3;
438            overflow: hidden;
439          }
440          .gm-frame img {
441            width: 100%;
442            height: 100%;
443            object-fit: cover;
444            display: block;
445          }
446          .gm-meta { padding-top: ${META_PT}px; }
447          /* 타이틀 — 영문 위/한글 아래(en-first). 높이는 한글 유무와 무관하게 2줄분을 예약한다.
448             metaH의 titleBlockH와 동일 식이어야 격자 피치와 DOM 높이가 어긋나지 않는다 (260804) */
449          .gm-title {
450            height: calc(var(--ts, 13px) * ${TITLE_LH * TITLE_LINES} + var(--ts, 13px) * ${KO_SCALE * TITLE_LH});
451          }
452          .gm-title-en {
453            display: block;
454            font-size: var(--ts, 13px);
455            font-weight: 450;
456            line-height: ${TITLE_LH};
457            word-break: keep-all;
458            white-space: nowrap;
459            overflow: hidden;
460            text-overflow: ellipsis;
461          }
462          .gm-title-ko {
463            display: block;
464            font-size: calc(var(--ts, 13px) * ${KO_SCALE});
465            font-weight: 350;
466            line-height: ${TITLE_LH};
467            opacity: 0.55;
468            word-break: keep-all;
469            white-space: nowrap;
470            overflow: hidden;
```

---

## 6. `src/components/LandingExperience.tsx`

파일 총 행수: **419행** (300행 초과). 명세에 따라 return 문 JSX 전체와 필터 바 렌더 부분 ±15줄을 싣는다.

### 6-1. return 문 JSX 전체 (251–418행)

```tsx
251    return (
252      <div style={{
253        fontFamily: FONT,
254        background: '#FFFFFF',
255        width: '100vw',
256        height: '100vh',
257        overflow: 'hidden',
258        position: 'relative',
259      }}>
260
261        {/* ── FILTER BAR — 데스크톱 분기(>=768) 공용, 헤더 존 내 가운데 가로 1열. 좁은 폭은 가로 스크롤 + 어포던스. 모바일(<768)은 월 칩 행이 전담 ── */}
262        {!mobile && (
263          <div style={{
264            position: 'absolute',
265            top: 50,
266            left: 0,
267            right: 0,
268            height: 24,
269            opacity: showFilters ? 1 : 0,
270            pointerEvents: showFilters ? 'auto' : 'none',
271            transition: 'opacity 300ms ease-out',
272            zIndex: 50,
273          }}>
274            {/* 스크롤 컨테이너 — 넓은 폭: 내부 행이 margin auto로 가운데(현행 동일). 좁은 폭: 가로 스크롤 */}
275            <div
276              ref={filterScrollRef}
277              className="mpw-chips"
278              onScroll={updateFilterFade}
279              onWheel={handleFilterWheel}
280              style={{
281                height: '100%',
282                display: 'flex',
283                overflowX: 'auto',
284                overflowY: 'hidden',
285                touchAction: 'pan-x',
286              }}
287            >
288              <div style={{
289                display: 'flex',
290                alignItems: 'center',
291                gap: 28,
292                margin: '0 auto',
293                flexShrink: 0,
294              }}>
295                {FILTER_TYPES.map(t => (
296                  <button
297                    key={t}
298                    onClick={() => handleFilter(t)}
299                    style={{
300                      background: 'none',
301                      border: 'none',
302                      cursor: 'pointer',
303                      fontFamily: FONT,
304                      fontSize: 11,
305                      fontWeight: t === activeFilter ? 500 : 300,
306                      letterSpacing: '0.08em',
307                      textTransform: 'uppercase',
308                      color: '#080706',
309                      display: 'flex',
310                      alignItems: 'center',
311                      gap: 6,
312                      whiteSpace: 'nowrap',
313                      flexShrink: 0,
314                    }}
315                  >
316                    {/* 불릿 — 선택된 항목 앞에만 */}
317                    <span style={{
318                      fontSize: 7,
319                      lineHeight: 1,
320                      opacity: t === activeFilter ? 1 : 0,
321                      transition: 'opacity 200ms',
322                    }}>●</span>
323                    {t}
324                  </button>
325                ))}
326              </div>
327            </div>
328
329            {/* 오버플로 어포던스 — 스크롤 가능 방향에만 그라데이션 + 화살표 글리프 표시 */}
330            <div style={{
331              position: 'absolute',
332              left: 0,
333              top: 0,
334              bottom: 0,
335              width: 32,
336              display: 'flex',
337              alignItems: 'center',
338              justifyContent: 'flex-start',
339              paddingLeft: 4,
340              background: 'linear-gradient(to right, #FFFFFF, rgba(255,255,255,0))',
341              color: '#080706',
342              fontSize: 13,
343              opacity: filterFade.left ? 1 : 0,
344              transition: 'opacity 200ms ease',
345              pointerEvents: 'none',
346            }}>‹</div>
347            <div style={{
348              position: 'absolute',
349              right: 0,
350              top: 0,
351              bottom: 0,
352              width: 32,
353              display: 'flex',
354              alignItems: 'center',
355              justifyContent: 'flex-end',
356              paddingRight: 4,
357              background: 'linear-gradient(to left, #FFFFFF, rgba(255,255,255,0))',
358              color: '#080706',
359              fontSize: 13,
360              opacity: filterFade.right ? 1 : 0,
361              transition: 'opacity 200ms ease',
362              pointerEvents: 'none',
363            }}>›</div>
364          </div>
365        )}
366
367        {/* ── MAIN (데스크톱) — 헤더 높이 전 상태 고정 (수직 점프 없음) ── */}
368        {!mobile && (
369          <div style={{
370            position: 'absolute',
371            top: HEADER_H,
372            left: 0,
373            right: 0,
374            bottom: 0,
375            display: 'flex',
376            gap: 16,
377            opacity: layoutVisible ? 1 : 0,
378            transition: 'opacity 400ms ease-out',
379          }}>
380            <ProjectWall
381              projects={filteredProjects}
382              filterKey={activeFilter}
383              highlightSlug={shuffleProject.id}
384              activeSlug={activeProject?.id ?? null}
385              revealed={layoutVisible}
386              onHover={handleHover}
387              onSelect={handleSelect}
388            />
389
390            <ContentArea
391              project={displayProject}
392              mode={activeProject ? 'active' : 'idle'}
393              isBlacking={isBlacking}
394              visible={layoutVisible}
395              onBack={handleBack}
396            />
397          </div>
398        )}
399
400        {/* ── MOBILE — 월 우선(Wall-First): 수직 피드 + 인라인 트랙 ── */}
401        {mobile && (
402          <MobileProjectWall
403            projects={filteredProjects}
404            filterTypes={FILTER_TYPES}
405            activeFilter={activeFilter}
406            onFilter={handleFilter}
407            activeSlug={activeProject?.id ?? null}
408            onActivate={handleActivate}
409            onDeactivate={handleBack}
410            revealed={layoutVisible}
411            showFilters={showFilters}
412            initialHighlight={lastHighlightRef.current}
413            onHighlight={handleHighlight}
414          />
415        )}
416
417      </div>
418    )
419  }
```

### 6-2. 필터 바 렌더 부분 ±15줄 (246–380행)

필터 바 블록은 261–365행이다. 그 앞 15줄(246–260)과 뒤 15줄(366–380)을 포함한다. 261–365행 본문은 6-1과 동일하므로, 여기서는 6-1이 포함하지 않는 앞부분(246–250행)과 경계 구간만 추가로 싣는다.

앞 15줄 (246–260행):

```tsx
246    useEffect(() => {
247      setWordmarkOnLight(true)
248      setNavOnLight(true)
249    }, [setWordmarkOnLight, setNavOnLight])
250
251    return (
252      <div style={{
253        fontFamily: FONT,
254        background: '#FFFFFF',
255        width: '100vw',
256        height: '100vh',
257        overflow: 'hidden',
258        position: 'relative',
259      }}>
260
```

뒤 15줄 (366–380행):

```tsx
366
367        {/* ── MAIN (데스크톱) — 헤더 높이 전 상태 고정 (수직 점프 없음) ── */}
368        {!mobile && (
369          <div style={{
370            position: 'absolute',
371            top: HEADER_H,
372            left: 0,
373            right: 0,
374            bottom: 0,
375            display: 'flex',
376            gap: 16,
377            opacity: layoutVisible ? 1 : 0,
378            transition: 'opacity 400ms ease-out',
379          }}>
380            <ProjectWall
```

---

## 7. `src/` 전체 `"Header"` 문자열 전수 검색

총 **10건**.

```
src\app\globals.css:188:/* ── MOBILE HAMBURGER MENU — 전역 크롬 (SiteHeader 소유, §8). 데스크톱·태블릿 비표시 ── */
src\app\layout.tsx:4:import { SiteHeader } from '@/components/SiteHeader'
src\app\layout.tsx:43:          <SiteHeader />
src\components\GridExperience.tsx:404:        전역 헤더는 /work-grid를 light 경로로 모르므로(SiteHeader의 STATIC_LIGHT_PATHS 미포함,
src\components\Header.tsx:3:export default function Header() {
src\components\MobileProjectWall.tsx:8:// 필터는 우측 슬라이드 패널(§7), 내비게이션은 SiteHeader의 햄버거 메뉴(§8)가 전담.
src\components\MobileProjectWall.tsx:21:const HEADER_H = 56          // 모바일 헤더 바 높이 (SiteHeader .mobile-header-bar와 일치)
src\components\MobileProjectWall.tsx:1039:  // ── 필터 패널 (§7) — 로컬 상태. 메뉴 패널(SiteHeader)과 각자 스크림으로 상호 독립 ──
src\components\SiteHeader.tsx:25:export function SiteHeader() {
src\components\SiteHeader.tsx:41:    // ── 모바일 햄버거 메뉴 — 전역 크롬이므로 SiteHeader 소유 (§8). 라우트 변경 시 자동 닫힘 ──
```

분류:

| 분류 | 건수 | 위치 |
|---|---|---|
| `SiteHeader` 컴포넌트 선언 | 1건 | `SiteHeader.tsx:25` |
| `SiteHeader` import | 1건 | `layout.tsx:4` |
| `SiteHeader` JSX 사용 | 1건 | `layout.tsx:43` |
| `Header.tsx`의 컴포넌트 선언 | 1건 | `Header.tsx:3` |
| 주석 내 `SiteHeader` 언급 | 5건 | `globals.css:188`, `GridExperience.tsx:404`, `MobileProjectWall.tsx:8`, `:1039`, `SiteHeader.tsx:41` |
| 상수명 `HEADER_H` | 1건 | `MobileProjectWall.tsx:21` |

### `src/components/Header.tsx`의 import·JSX 사용처 건수

| 항목 | 건수 |
|---|---|
| `Header.tsx`를 가리키는 import 문 (`from './Header'` / `from '@/components/Header'`) | **없음(0건)** |
| `<Header` JSX 사용처 | **없음(0건)** |

위 10건 중 `Header.tsx`에 해당하는 것은 `Header.tsx:3` 자기 파일 내 선언 1건뿐이다.
`layout.tsx:4`의 import와 `layout.tsx:43`의 JSX는 모두 `SiteHeader.tsx`를 가리킨다.

---

## 8. `introPhase` · `setWordmarkOnLight` · `setNavOnLight` 전수 검색 (`src/` 전체)

총 **23건**.

```
src\components\LandingExperience.tsx:24:  const { introPhase, setWordmarkOnLight, setNavOnLight } = useSiteChrome()
src\components\LandingExperience.tsx:132:    if (introPhase !== 'done') return
src\components\LandingExperience.tsx:138:  }, [introPhase, mobile, activeProject, hoveredProject, filteredProjects, advanceShuffle])
src\components\LandingExperience.tsx:242:  const layoutVisible = introPhase === 'done'
src\components\LandingExperience.tsx:247:    setWordmarkOnLight(true)
src\components\LandingExperience.tsx:248:    setNavOnLight(true)
src\components\LandingExperience.tsx:249:  }, [setWordmarkOnLight, setNavOnLight])
src\components\MobileProjectWall.tsx:662:  revealed: boolean              // layoutVisible (introPhase === 'done')
src\components\SiteHeader.tsx:28:    introPhase,
src\components\SiteHeader.tsx:38:  const layoutVisible = introPhase === 'done'
src\components\SiteHeader.tsx:39:  const wordmarkMoved = introPhase !== 'wordmark'
src\components\SiteChromeContext.tsx:9:  introPhase: IntroPhase
src\components\SiteChromeContext.tsx:13:  setWordmarkOnLight: (value: boolean) => void
src\components\SiteChromeContext.tsx:14:  setNavOnLight: (value: boolean) => void
src\components\SiteChromeContext.tsx:18:  introPhase: 'done',
src\components\SiteChromeContext.tsx:22:  setWordmarkOnLight: () => {},
src\components\SiteChromeContext.tsx:23:  setNavOnLight: () => {},
src\components\SiteChromeContext.tsx:32:  const [introPhase, setIntroPhase] = useState<IntroPhase>('wordmark')
src\components\SiteChromeContext.tsx:34:  const [wordmarkOnLight, setWordmarkOnLight] = useState(false)
src\components\SiteChromeContext.tsx:35:  const [navOnLight, setNavOnLight] = useState(false)
src\components\SiteChromeContext.tsx:65:      introPhase,
src\components\SiteChromeContext.tsx:69:      setWordmarkOnLight,
src\components\SiteChromeContext.tsx:70:      setNavOnLight,
```

식별자별·파일별 건수:

| 식별자 | `SiteChromeContext.tsx` | `SiteHeader.tsx` | `LandingExperience.tsx` | `MobileProjectWall.tsx` | `GridExperience.tsx` | 합계 |
|---|---|---|---|---|---|---|
| `introPhase` | 4건 (9, 18, 32, 65) | 3건 (28, 38, 39) | 4건 (24, 132, 138, 242) | 1건 (662, 주석) | 없음(0건) | 12건 |
| `setWordmarkOnLight` | 4건 (13, 22, 34, 69) | 없음(0건) | 3건 (24, 247, 249) | 없음(0건) | 없음(0건) | 7건 |
| `setNavOnLight` | 4건 (14, 23, 35, 70) | 없음(0건) | 3건 (24, 248, 249) | 없음(0건) | 없음(0건) | 7건 |

(24행·249행은 세 식별자 중 둘 이상이 같은 줄에 출현하므로 식별자별 합계 26건, 고유 출력 행 23건이다.)

`GridExperience.tsx`에서의 세 식별자 출현: **없음(0건)**.
