# MOBILE_SPEC v3 — 모바일 구조 전환: 월 우선(Wall-First) 아키텍처

> **이 스펙은 v2(바텀 시트 모델)를 대체한다.**
> 모바일의 1차 표면을 "Idle 히어로 + 바텀 시트"에서 **"프로젝트 월(수직 피드) + 인라인 트랙"**으로 전환한다.
> BIG 모바일의 실제 구조(수직 피드에 수평 트랙 인라인 삽입, 2축 모델)에 충실한 구현이다.
> 데스크톱(≥768px) 동작은 **일절 변경하지 않는다.**
>
> 구현 완료 후 `npx tsc --noEmit`으로 검증할 것. `npm run dev` / `npm run build` 금지 (CLAUDE.md).

---

## 0. 전환 요약 (Before → After)

| 항목 | v2 (현재) | v3 (목표) |
|---|---|---|
| 모바일 최초 진입 | Idle 히어로 풀스크린 + PROJECTS 버튼 | **프로젝트 월(수직 카드 피드)** |
| 프로젝트 목록 | 72vh 바텀 시트 | 피드 자체가 목록 (시트 폐지) |
| Active 진입 | 시트 하강 → 풀스크린 takeover | **카드 제자리 모프 → 인라인 수평 트랙** |
| 셔플 | 모바일에서도 동작 | **모바일 폐지** |
| 카드 비율 | 임의 | **3:2 고정 (Cloudinary c_fill)** |
| 헤더 | 데스크톱 레이아웃 그대로 → 워드마크/내비 충돌 | **모바일 전용 컴팩트 헤더 56px, 불투명 화이트 바** |
| ContentArea | mobile prop으로 분기 렌더 | **모바일에서 미렌더** (mobile prop 및 분기 로직 제거) |

삭제 대상: `MobileProjectSheet.tsx`, PROJECTS 핸들 버튼, 스크림, `sheetOpen` 상태 및 관련 핸들러 전부.
신규: `MobileProjectWall.tsx` (피드 + 인라인 트랙 통합), `cldCard()` (cloudinary.ts).

---

## 1. MobileProjectWall — 수직 피드 (Idle 상태)

`src/components/MobileProjectWall.tsx` 신규 작성. 모바일(<768px)에서 헤더 아래 전체 영역을 차지하는 **수직 스크롤 피드**.

### 1-A. 컨테이너
- `position: fixed; top: 56px(헤더); left/right/bottom: 0; overflow-y: auto; background: #FFFFFF`
- `-webkit-overflow-scrolling: touch`. 스크롤바 숨김 불필요(시스템 기본).
- 콘텐츠는 어떤 경우에도 헤더 뒤로 비쳐 보이지 않는다 (헤더가 불투명 — §4 참조).

### 1-B. 필터 칩 행 (피드 최상단 sticky)
- v2 시트의 칩 행 문법 승계: 가로 스크롤, 스크롤바 숨김, ● 불릿 + 대문자 11px.
- `position: sticky; top: 0; z-index: 5; background: #FFFFFF; height: 44px; padding: 0 16px`
- 필터 변경 시: 카드 목록 교체 + 재캐스케이드 (§1-D 등장 애니메이션 재실행, activeSlug는 해제).

### 1-C. 프로젝트 카드
- 좌우 패딩 16px, 카드 간 수직 간격 40px. 첫 카드는 칩 행 아래 8px.
- 이미지: 폭 100%, **비율 3:2 고정** (`aspectRatio: '3 / 2'`), `objectFit: cover`.
  - src = `cldCard(p.coverImage, 800)` — §3 신규 헬퍼. 데스크톱 월의 `cldThumb` 480/2:1은 변경하지 않는다.
- 이미지 아래 8px: 프로젝트명 14px / weight 500 / #080706.
- 그 아래 2px: 카테고리 레이블 10px / weight 300 / 대문자 / letterSpacing 0.08em / opacity 0.45.
- 탭 영역 = 카드 전체. cursor 지정 불필요(터치).

### 1-D. 등장 캐스케이드 (인트로 직후 + 필터 변경 시)
- 각 카드 `opacity 0 → 1`, `translateY(12px) → 0`, 400ms ease-out, **stagger 60ms** (지연 상한 600ms — 11번째 이후 카드는 동시).
- 인트로 시퀀스: 기존 워드마크 중앙→좌상단 collapse는 그대로 유지하고, `introPhase === 'done'` 시점에 피드가 캐스케이드로 등장한다. 모바일에서 Idle 히어로·블랙아웃·PROJECTS 버튼은 더 이상 존재하지 않는다.

### 1-E. 셔플 폐지
- `LandingExperience`의 셔플 타이머 effect에 모바일 가드 추가: `if (mobileRef.current) return` (또는 의존성 조건에 `mobile` 포함). 모바일에서 `advanceShuffle`이 절대 실행되지 않아야 한다.
- `isBlacking`은 모바일 렌더 경로에서 사용처가 없어진다.

---

## 2. 인라인 트랙 — Active 상태 (핵심 인터랙션)

카드 탭 = 별도 페이지/뷰로 이동하지 않는다. **해당 카드가 피드 안에서 제자리 변형**되어 수평 트랙이 되고, 위아래 인접 프로젝트 카드는 그대로 보인다 (BIG 2축 모델: 수직 = 프로젝트 간, 수평 = 프로젝트 내).

### 2-A. 모프 (카드 → 트랙)
- 탭 시 해당 피드 아이템이 확장 상태로 전환. 전환 500ms `cubic-bezier(0.7,0,0.3,1)`.
- 카드 이미지(3:2 풀폭)가 트랙의 첫 이미지 슬라이드로 시각적으로 연속되도록, 확장 직후 트랙 스크롤 위치는 0 (정보 슬라이드가 좌측 클립 라인에 정렬되, 히어로 이미지가 화면 안에 보이는 초기 상태 — 데스크톱 scrollPos 0 문법과 동일).
- 확장과 동시에 해당 아이템을 `scrollIntoView({ block: 'start' })` 부드럽게 — 칩 행 아래에 BACK 행이 오도록.
- **단일 active**: 다른 카드를 탭하면 기존 확장 아이템은 카드로 수축(동일 500ms)하고 새 아이템이 확장된다.

### 2-B. 확장 아이템 구조 (위→아래)
1. **BACK 행**: 높이 36px, 좌측 패딩 16px, `← BACK` 11px / weight 300 / 대문자 / letterSpacing 0.12em. 탭 시 수축 복귀.
2. **타이틀 행**: 프로젝트명 16px / weight 600. 2줄 허용 (keep-all). 좌측 패딩 16px, 아래 여백 12px.
3. **수평 트랙**: §2-C.
4. **카운터 행**: 우측 패딩 16px, 우정렬, `03 / 13` 형식 10px / opacity 0.45. 현재 뷰포트 중앙에 가장 가까운 슬라이드 인덱스 기준.

### 2-C. 수평 트랙 사양
- 컨테이너: `overflow-x: auto`, **네이티브 터치 스크롤** (모멘텀 포함). 스냅 없음 — BIG의 자유 멈춤과 등가. 스크롤바 숨김. 커서 치환 화살표는 모바일에 존재하지 않는다 (useFinePointer 게이팅과 일관).
- 좌측 패딩 16px = 클립 라인. 슬라이드 간 갭 12px. 우측 끝 패딩 16px.
- **트랙 높이: 36vh** (이미지 슬라이드 기준). 슬라이드 폭은 각 이미지 비율이 결정 (높이 통일 + 비율 폭 — 데스크톱 문법 승계).
- **다이어그램 분류**: `isDiagram()` 판정(diagramSet 또는 `image.diagram === true`) 슬라이드는 높이 **24vh**, 트랙 내 수직 중앙 정렬 — 데스크톱의 72%/48% 이분법과 동일 비례(2/3).
- **정보 슬라이드** (트랙 첫 요소): 폭 60vw, 수직 중앙. 내용: 카테고리 레이블(10px 대문자 0.45) / 연도 등 메타가 데이터에 있으면 함께. 타이틀은 §2-B 고정 행이 전담하므로 중복 표기하지 않는다.
- **diagramSet 슬라이드**: 자동 진행 3000ms 루프 유지. 서브 화살표·호버 일시정지는 모바일 미적용. 캡션은 현재 서브슬라이드의 것을 표시.
- **캡션**: 이미지 슬라이드 하단 외부, 슬라이드 폭 내 줄바꿈(keep-all), 10px / weight 300 / opacity 0.55, 최대 2줄. 캡션 영역 높이는 트랙 높이에 포함하지 않고 하단에 고정 28px 확보.
- **크레딧 슬라이드**: 데스크톱과 동일 데이터, 폭 70vw, 11px, 수직 중앙.
- 슬라이드 데이터 소스는 `projectSlides.ts` 그대로. 미등록 프로젝트는 coverImage 1장 fallback (기존 규칙).
- 렌더 로직은 ContentArea와 공유하지 않고 MobileProjectWall 내 독립 구현한다 (데스크톱 트랙은 드래그 물리·모프 히어로·커서 화살표 등 모바일과 무관한 복잡도를 가짐 — 분리가 안전).

### 2-D. URL / 히스토리 동기화
- 카드 탭(확장): `pushState('/work/[slug]')`
- BACK(수축): `pushState('/work')` — 단, 진입 경로가 `/`였고 필터를 건드리지 않았다면 `/`로. 단순화를 위해 **모바일은 수축 시 항상 `/work`** 로 통일한다 (모바일에서 `/`와 `/work`는 동일 화면이므로 사용자 체감 차이 없음).
- popstate: `/work/[slug]` → 해당 slug 아이템 확장 + scrollIntoView / `/work` 또는 `/` → 전체 수축.
- 딥링크 `/work/[slug]` 모바일 직접 진입: 인트로 후 피드 렌더 → 해당 아이템 즉시 확장 상태(모프 생략, 전환 없음) + 해당 위치로 스크롤.
- `initialShowFilters` 모바일 분기(`setSheetOpen(true)`)는 삭제 — 모바일은 필터 칩이 상시 노출이므로 별도 상태 불필요.

---

## 3. Cloudinary — 카드 크롭 헬퍼

`src/lib/cloudinary.ts`에 추가:

```ts
/** 모바일 카드용 3:2 크롭. 비-Cloudinary 경로는 원본 반환 */
export function cldCard(src: string, width = 800): string {
  return src.includes('/upload/')
    ? src.replace('/upload/', `/upload/f_auto,q_auto,w_${width},ar_3:2,c_fill,g_auto/`)
    : src
}
```

- `g_auto` = 자동 주제 중심 크롭. Sanity 이관 시 hotspot 필드로 승계 예정 (코드 주석으로 명시).
- 기존 `cldThumb`는 수정하지 않는다.

---

## 4. 모바일 헤더 — 컴팩트화 + 침범 차단

`SiteHeader.tsx` 및 워드마크 관련 CSS(globals.css의 `.wordmark-intro` 계열)에 **모바일 분기(<768px)** 를 추가한다. 데스크톱 값은 변경 금지.

### 4-A. 헤더 바
- 모바일에서 헤더는 **불투명 고정 바**: `position: fixed; top: 0; height: 56px; background: #FFFFFF; z-index: 90` (워드마크·내비 z-index 100 아래, 콘텐츠 위). 보더 없음 — 화이트 셸 위 화이트 바이므로 시각적으로는 영역 확보만 수행하며, 피드가 스크롤되어도 헤더 영역으로 콘텐츠가 비치지 않는다.
- 콘텐츠 시작점 = 56px (MobileProjectWall top과 일치). **헤더 존을 콘텐츠가 침범하는 일이 구조적으로 불가능해야 한다.**

### 4-B. 워드마크 (모바일)
- collapse 종착점: `top: 16px; left: 16px`, 크기 **22px** (데스크톱 32px 유지).
- 인트로 중앙 단계의 크기·위치는 뷰포트 비례로 자연 축소되면 충분 — 종착점 값만 미디어 쿼리로 분기.

### 4-C. 내비게이션 (모바일)
- 중앙 정렬 폐지 → **우측 정렬**: `right: 16px; left: auto; transform: none; top: 0; height: 56px; display: flex; align-items: center`.
- fontSize **10px**, gap **14px**, letterSpacing 0.06em. 4개 항목 + 좌측 워드마크가 390px 뷰포트에서 충돌 없이 공존하는 것을 기준으로 한다.
- 워드마크와 내비가 어떤 뷰포트 폭(최소 360px)에서도 겹치지 않을 것 — 360px에서 넘치면 fontSize 9px / gap 12px로 한 단계 축소.

### 4-D. 필터 바 (데스크톱 전용 요소)
- `LandingExperience`의 top:50 필터 바는 현재도 `!mobile` 조건이므로 변경 없음. 모바일 필터는 §1-B 칩 행이 전담.

---

## 5. LandingExperience 통합 변경

- `mobile === true`일 때 렌더 트리: 헤더(전역) + `<MobileProjectWall …/>` **만**. `ProjectWall`(데스크톱)·`ContentArea`·필터 바·PROJECTS 버튼·시트는 모바일에서 렌더하지 않는다.
- `ContentArea`의 `mobile` prop과 내부 모바일 분기 코드를 제거한다 (데스크톱 전용으로 단순화).
- `MobileProjectWall` props (제안): `projects(filtered)`, `filterTypes`, `activeFilter`, `onFilter`, `activeSlug`, `onActivate(slug)`, `onDeactivate()`, `revealed(layoutVisible)`. 상태 소유는 기존대로 LandingExperience (URL 동기화가 그곳에 있으므로).
- `handleSelectMobile`·`handleSheetOpen`·`handleSheetClose`·`sheetOpen` 제거. `handleBack`의 모바일 분기는 §2-D 규칙으로 교체.
- `MobileProjectSheet.tsx` 파일 삭제.

---

## 6. 검증 체크리스트 (실기기 세로 녹화 기준)

1. 진입: 인트로 collapse 직후 **월 피드가 캐스케이드로 등장** (히어로 셔플 없음)
2. 헤더: 워드마크와 내비 항목이 어떤 순간에도 겹치지 않음
3. 스크롤: 피드를 끝까지 스크롤해도 콘텐츠가 헤더 56px 존을 침범하지 않음
4. 카드: 전 카드 3:2 동일 비율, 주제 중심 크롭 자연스러움 (Network 탭에서 `ar_3:2,c_fill,g_auto,w_800` 확인)
5. 탭: 카드가 **제자리에서** 트랙으로 모프, 위아래 인접 카드 상시 노출
6. 트랙: 좌우 네이티브 스와이프 자유 멈춤, 이미지 36vh / 다이어그램 24vh 수직 중앙
7. diagramSet: 3초 자동 진행 + 캡션 갱신
8. 카운터: 스와이프에 따라 `NN / NN` 갱신
9. BACK: 수축 복귀 + URL `/work`, 브라우저 뒤로가기로도 동일 동작
10. 딥링크: `/work/orion-new-office` 직접 진입 시 해당 아이템 확장 상태로 로드
11. 다른 카드 탭: 기존 확장 수축 + 신규 확장 (동시 진행)
12. 필터: 칩 변경 시 active 해제 + 재캐스케이드
13. 데스크톱(≥768px): 기존 동작 전부 불변 (월 위계·트랙·화살표·셔플·필터 바)

---

## 7. 범위 동결

이 스펙의 5개 영역(월 우선 진입 / 인라인 모프 트랙 / 3:2 크롭 / 모바일 셔플 폐지 / 헤더 컴팩트화) 외 어떤 인터랙션 변경도 수행하지 않는다. 이 스펙 검증 완료 = **인터랙션 레이어 동결** (이후 결함은 백로그 누적).
