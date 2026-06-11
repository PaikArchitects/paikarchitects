# LANDING_REFINEMENT_SPEC — 아카이브 데이터 추가분 + 랜딩 UI 정밀 조정 6건

## 구성
- PART A: 데이터 추가/변경 (projects.ts, projectSlides.ts)
- PART B: UI 조정 6건 (ProjectWall.tsx, page.tsx, ContentArea.tsx)

검증: `npx tsc --noEmit` (npm run dev / build 금지)

---

# PART A — 데이터

## A-1. projects.ts — coverImage 변경/추가 (5개 항목)

| id | 작업 | coverImage |
|---|---|---|
| `hyundai-india-rd-center` | **교체** (기존 Aerial_001_HDR → 슬라이드로 이동) | `https://res.cloudinary.com/drsybwqg0/image/upload/v1781139372/Aerial_013_rev_resize_dwaanp.jpg` |
| `cloud-tectonic` | **교체** (기존 Cloud_Tectonic → 슬라이드로 이동) | `https://res.cloudinary.com/drsybwqg0/image/upload/v1781139134/01_Pandemic_Life-01_m8hsz9.png` |
| `wonju-innovation-complex` | 신규 추가 | `https://res.cloudinary.com/drsybwqg0/image/upload/v1781138743/CG_Aerial_02_resize_bishfx.jpg` |
| `kb-kookmin-bank-hq` | 신규 추가 | `https://res.cloudinary.com/drsybwqg0/image/upload/v1781138576/Perspective_view_02_resize_lzy7ry.jpg` |
| `the-whale` | 신규 추가 | `https://res.cloudinary.com/drsybwqg0/image/upload/v1781138047/Whale_01_ib7cjy.png` |

다른 필드는 수정하지 않는다. URL 퍼센트 인코딩 그대로 복사.

## A-2. projectSlides.ts — 슬라이드 세트 추가 (9개)

기존 항목(orion-new-office 및 ARCHIVE_SLIDES_SPEC 반영분)은 그대로 두고 아래를 추가한다.
independence-memorial-hall은 기존 반영분과 동일 — 수정 불필요.

```typescript
'cheongju-culture-factory': [
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1780299388/Elevation_01-2_resize_qzmdrj.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781139653/Chimney_03_pxzm5u.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781139774/Interior_View_01_resize_bafiwo.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781139912/Interior_View_09_resize_aq2anz.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781139919/Interior_View_10_resize_uzklge.jpg' },
],

'kfcc-bank-office-building': [
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1780299886/%EC%84%9C%EC%B8%A1_%ED%88%AC%EC%8B%9C%EB%8F%84_resize_yzrpuw.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781140058/%EC%84%9C%EC%B8%A1%ED%88%AC%EC%8B%9C%EB%8F%84_2__resize_wyzcqf.jpg' },
],

'seoul-animation-center': [
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1780300156/CG_Aerial_View_resize_xlqazy.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781139963/CG_Sectional_View_rev_rrwwmv.jpg' },
],

'simmons-factorium': [
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1780300228/Completed_%EC%99%B8%EA%B3%BD_rev_resize_ensojy.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781139566/Completed_%EC%84%9C%EC%B8%A1_3__resize_wgxu1o.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781139574/Completed_Interior_05_rev_sxftnu.jpg' },
],

'hyundai-india-rd-center': [
  // Hero — 신규 커버
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781139372/Aerial_013_rev_resize_dwaanp.jpg' },
  // 기존 커버 → 콘텐츠 슬라이드로 이동
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1780300313/Aerial_001_HDR_resize_jpd5hu.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781139381/08_%EC%9D%B4%EC%A4%91%EC%99%B8%ED%94%BC_%EB%8B%A8%EB%A9%B4%ED%88%AC%EC%8B%9C%EB%8F%84_resize_ybj1mv.jpg' },
],

'cloud-tectonic': [
  // Hero — 신규 커버
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781139134/01_Pandemic_Life-01_m8hsz9.png' },
  // 기존 커버 → 콘텐츠 슬라이드로 이동
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1780301125/Cloud_Tectonic_gzditm.jpg' },
],

'wonju-innovation-complex': [
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781138743/CG_Aerial_02_resize_bishfx.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781138748/CG_Aerial_01_resize_j658pe.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781138782/CG_Site_Plan_resize_h0yfaj.jpg' },
],

'kb-kookmin-bank-hq': [
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781138576/Perspective_view_02_resize_lzy7ry.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781138617/Aerial_view_resize_zh3ai1.jpg' },
],

'the-whale': [
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781138047/Whale_01_ib7cjy.png' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781138363/SGP_2024_Poster_Whale_A2_resize_A2-1_jckfjh.png' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781138366/SGP_2024_Poster_Whale_A2_resize_A2-2_pxthgr.png' },
],
```

---

# PART B — UI 조정 6건

## B-1. ProjectWall — 타이틀 타이포 + 용도명 (WallCard 내부)

```typescript
// 타이틀: BEFORE
fontSize: 16, fontWeight: 400,
// 타이틀: AFTER — 80% 크기, 약간 두껍게 (Pretendard Variable 가변 두께 활용)
fontSize: 13, fontWeight: 450,
```

서브 라인: `{project.location ?? ''}` → `{project.type}` 으로 교체.
서브 라인의 기존 스타일(fontSize 11, uppercase, letterSpacing 등)은 유지.
marginTop 6 → 4 로 축소 (타이틀이 작아진 만큼 조밀하게).

## B-2. ProjectWall — 카드 크기/장방비

```typescript
// 카드: BEFORE
height: 155,
// 카드: AFTER
height: 124,
```

이미지 영역 구조 변경 — 현재 `flexGrow: 1`(가용폭 전체 채움)을 폐기하고
**고정 장방비** 방식으로 교체:

```typescript
// 카드 컨테이너에 추가
justifyContent: 'flex-end',

// 이미지 래퍼: BEFORE
{ flexGrow: 1, overflow: 'hidden', ... }
// 이미지 래퍼: AFTER
{
  height: '100%',
  aspectRatio: '2.5 / 1',
  flexShrink: 1,
  minWidth: 0,
  maxWidth: 'calc(100% - 188px)',   // 텍스트 컬럼(180px) + 여유 확보, 좁은 화면 오버플로 방지
  overflow: 'hidden',
  ...opacity/transition 기존 유지
}
```

텍스트 컬럼(width 180)은 유지. 이미지는 우측 가장자리에 정렬된다.

## B-3. 프로젝트 월 ↔ 콘텐츠 영역 간격

- `page.tsx` MAIN flex 컨테이너에 `gap: 16` 추가 (카드 상하 간격 16px와 동일 값)
- `ProjectWall.tsx`의 `borderRight: '1px solid rgba(255,255,255,0.12)'` **제거**
- 간격 사이로 루트 배경(#080706)이 노출되는 것이 의도된 동작임

## B-4. 셔플 속도 — 전체 1.5배 감속 (page.tsx + ContentArea.tsx)

page.tsx:
```typescript
// 셔플 간격: BEFORE → AFTER
setInterval(advanceShuffle, 4000)  →  setInterval(advanceShuffle, 6000)

// advanceShuffle 내부 타이밍: BEFORE → AFTER
setTimeout(..., 400)   →  setTimeout(..., 600)    // 암전 후 이미지 교체 대기
setTimeout(..., 200)   →  setTimeout(..., 300)    // 교체 후 암전 해제 대기
```

ContentArea.tsx (Idle 모드):
```typescript
// 암전 오버레이: BEFORE → AFTER
'opacity 400ms ease-in'  / 'opacity 400ms ease-out'
→ 'opacity 600ms ease-in' / 'opacity 600ms ease-out'

// 이미지 페이드인: BEFORE → AFTER
'opacity 800ms ease-out'  →  'opacity 1200ms ease-out'
```

## B-5. 헤더 영역 확보 (page.tsx + SiteHeader 색상 로직)

헤더 존 높이 = 현재 모노그램(32px)의 2배 = **64px**.

page.tsx MAIN 컨테이너:
```typescript
// BEFORE
position: 'absolute', inset: 0,
// AFTER — 상단 64px를 헤더 전용 영역으로 비움
position: 'absolute', top: 64, left: 0, right: 0, bottom: 0,
```

이로써 ProjectWall과 ContentArea가 모노그램/내비 라인을 침범하지 않는다.
(향후 이 64px 존에 용도별 필터 UI가 들어갈 예정 — 이번에는 공간 확보만)

**색상 로직 갱신 (중요):** 헤더 존 배경이 항상 루트 다크(#080706)가 되므로,
랜딩에서 모노그램과 내비는 **항상 흰색**이어야 한다. page.tsx의 해당 effect를 수정:

```typescript
// BEFORE
setWordmarkOnLight(layoutVisible && (!mobile || activeProject !== null))
setNavOnLight(layoutVisible && activeProject !== null)
// AFTER — 랜딩에서는 헤더 존이 항상 다크 배경
setWordmarkOnLight(false)
setNavOnLight(false)
```

(/about, /work 등 정적 라이트 페이지의 STATIC_LIGHT_PATHS 로직은 SiteHeader에 있으며 수정하지 않는다)

## B-6. Idle 이미지 위 프로젝트명 오버레이 (ContentArea.tsx)

Idle 모드 블록에서, 이미지 div **다음**, 암전 오버레이 div **이전**에 추가
(암전 시 텍스트도 함께 어두워지는 z-순서가 의도임):

```tsx
<div style={{
  position: 'absolute',
  bottom: 24,
  left: 24,
  fontFamily: FONT,
  fontSize: 12,
  fontWeight: 300,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#FFFFFF',
  opacity: visible ? 1 : 0,
  transition: 'opacity 1200ms ease-out',
  pointerEvents: 'none',
  zIndex: 2,
}}>
  {project.title}
</div>
```

암전 오버레이의 zIndex가 이 텍스트보다 위에 있도록 확인 (필요 시 오버레이에 zIndex: 3 명시).

---

# 검증

```bash
npx tsc --noEmit
```

배포 후 확인 항목:
1. 월 카드: 타이틀 축소·용도명 표기, 카드 124px, 이미지 장방비 2.5:1
2. 월-콘텐츠 사이 16px 다크 갭
3. 셔플 6초 간격, 암전 600ms
4. 모노그램·내비가 64px 헤더 존 안에 단독 위치, 항상 흰색
5. Idle 이미지 좌하단 프로젝트명 표시
6. 신규 커버 5건(현대차·클라우드텍토닉 교체 포함) 및 슬라이드 9세트 작동
