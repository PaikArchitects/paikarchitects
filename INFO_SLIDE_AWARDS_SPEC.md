# INFO_SLIDE 재개편 + AWARDS 스키마 명세

작성일 260720. 대상: 데스크톱 `src/components/ContentArea.tsx`, 모바일 `src/components/MobileProjectWall.tsx`, 스키마 `sanity/schemaTypes/project.ts`, 타입 `src/types/index.ts`, 데이터 마이그레이션 스크립트.

본 명세는 실제 소스 감사(260720) 위에 작성되었다. 아래 「현황」은 확인된 사실이며 추정이 아니다.

---

## 0. 현황 (감사 확인 사항)

- `ContentArea.tsx` L893~1000: 정보 슬라이드. `width: INFO_SLIDE_W(200)`, `flexDirection: column`, `gap: 24`, `overflowY: auto`.
- 데스크톱 타이틀 세트: `<div style={{marginBottom:20}}>` 안에 ① 타이틀 `BilingualText order="ko-first"` ② 서브타이틀 `BilingualText order="ko-first"` ③ **LOCATION** 순으로 들어있다.
- 데스크톱 Prize: 타이틀 세트 직후 `<div style={{minHeight:20, display:'flex', alignItems:'center'}}>` 안에 `project.result`, 색 `#b89773`, `fontSize:15`.
- 모바일 `MobileInfoSlide` (L360~457): 컨테이너 `gap: 16`, `marginTop: -SLIDE_GAP + 6`.
- 모바일 영문 타이틀은 `MobileInfoSlide` **바깥**(L577~595, `titleRef`, `fontSize:18`, `marginTop:-SLIDE_GAP+12`)에 있으며 **카드→상세 모프의 종착점**이다. 따라서 모바일은 이미 en-first이며, 이 순서는 변경 불가 제약이다.
- 모바일 InfoSlide 내부 순서: 한글 타이틀 + 서브(`en-first`) → Prize(`minHeight:20`) → LOCATION → CLIENT → 2×2 그리드 → ROLE.
- `SLIDE_GAP = 24` (MobileProjectWall.tsx L59).
- 스키마 `project.ts`: `result`(string, L88), `location`(string, L123) 존재. `subtitle`은 `localeString`.
- `bilingual.tsx`의 `BilingualText`는 `order` prop으로 `'en-first' | 'ko-first'`를 받으며, en은 항상 `primaryStyle`, ko는 항상 `secondaryStyle`이다(순서와 무관하게 영문이 주).

---

## 1. 병기 순서 전면 en-first 통일

### 1-A. 데스크톱 타이틀 — ko-first → en-first

`ContentArea.tsx` 타이틀 `BilingualText`의 `order`를 `"ko-first"` → `"en-first"`로 변경한다. **스타일(primaryStyle/secondaryStyle)은 변경하지 않는다.** 영문이 `fontSize:16 weight:500`, 한글이 `fontSize:12 opacity:0.6`인 위계는 그대로 유지되며, 순서만 뒤집혀 영문이 위·한글이 아래가 된다.

### 1-B. 데스크톱 서브타이틀 — ko-first → en-first

동일하게 `order`를 `"en-first"`로 변경. 스타일 불변.

### 1-C. 모바일 — 변경 없음

모바일은 이미 en-first다(영문 타이틀이 모프 종착점으로 InfoSlide 바깥 상단에 있고, 한글 타이틀·서브가 그 아래). 코드 변경 불필요.

### 1-D. `BilingualText`의 `order` prop — 유지

전 호출부가 `en-first`가 되지만 `order` prop과 `ko-first` 분기는 **제거하지 않는다**. 향후 순서 재조정 여지를 남긴다. `bilingual.tsx`의 JSDoc 주석 중 `order='ko-first': ... — 타이틀·서브타이틀` 문구는 사실과 어긋나므로 다음으로 갱신한다:

```
 * order='en-first': 영문 위(primary) / 한글 아래(secondary) — 전 호출부 기본값 (260720 통일)
 * order='ko-first': 한글 위 / 영문 아래 — 현재 사용처 없음. 향후 재조정용으로 유지
```

### 1-E. 모바일 주석 정정

`MobileProjectWall.tsx` L371~372의 주석 `데스크톱(ko-first)과 달리 모바일은 영문이 위 — 모프 종착점을 옮길 수 없기 때문`은 데스크톱 변경으로 사실과 어긋난다. 다음으로 교체:

```
/* 타이틀 한글(종) — 영문 타이틀 행은 모프 종착점이라 위에서 별도 렌더된다.
   데스크톱·모바일 모두 en-first (260720 통일) */
```

---

## 2. AWARDS 필드 신설 — `result` 대체

### 2-A. 스키마 (`sanity/schemaTypes/project.ts`)

기존 `result` 필드(L88~92)를 **삭제**하고 다음을 그 자리에 추가한다.

```ts
defineField({
  name: 'awards',
  title: '수상',
  type: 'array',
  description: '수상 내역. 개수 제한 없음. 체크 해제 시 사이트에 노출되지 않는다',
  of: [
    defineArrayMember({
      type: 'object',
      name: 'award',
      title: '수상',
      fields: [
        defineField({
          name: 'title',
          title: '수상명',
          type: 'string',
          description: '최종 표기 그대로 입력 (렌더러는 가공하지 않는다). 예: Competition Winner / 2nd Prize / Grand Prize, 2020 Korea Remodeling Architecture Competition',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'visible',
          title: '노출',
          type: 'boolean',
          description: '체크 시 사이트에 표시',
          initialValue: true,
        }),
      ],
      preview: {
        select: { title: 'title', visible: 'visible' },
        prepare({ title, visible }) {
          return { title, subtitle: visible === false ? '숨김' : '노출' }
        },
      },
    }),
  ],
}),
```

배열이므로 Studio에서 개수 제한 없이 추가된다. 영문 전용(병기 아님) — 기존 `result` 정책 승계.

### 2-B. 타입 (`src/types/index.ts`)

`Project` 인터페이스에서 `result?: string`을 **삭제**하고 다음을 추가한다.

```ts
export interface Award {
  title: string
  visible?: boolean
}
```
```ts
awards?: Award[]
```

`Award`는 `Project`와 함께 export한다.

### 2-C. GROQ 쿼리

`result`를 조회하는 모든 GROQ 문자열에서 `result`를 제거하고 `awards[]{title, visible}`를 추가한다. **`tsc`는 GROQ 문자열을 검증하지 못하므로**, `result`를 문자열로 포함하는 지점을 전수 검색해 누락을 방지한다:

```
grep -rn "result" src/ sanity/ --include=*.ts --include=*.tsx
```

`result`가 GROQ·타입·렌더러 어디에도 남지 않아야 한다.

### 2-D. 데이터 마이그레이션

기존 문서의 `result`(문자열)를 `awards`(배열)로 이관하는 스크립트를 `scripts/migrateAwards.ts`로 작성한다.

**필수 선행 — 전수 조사.** 추정으로 범위를 정하지 말고 GROQ로 실제 데이터를 센서스한다:

```groq
*[_type == "project" && defined(result)]{_id, "title": title.en, result}
```

변환 규칙:
- `result` 값이 `-` 또는 빈 문자열이면 `awards`를 만들지 않는다(unset만).
- 그 외에는 `awards: [{_key, _type:'award', title: result, visible: true}]` 단일 항목으로 이관.
- 이관 후 `result`를 `unset`한다.
- `_key`는 항목마다 고유해야 한다(`randomUUID()` 등).

**복수 수상 수동 분해.** 자동 분해하지 않는다. 마이그레이션 후 다음 프로젝트는 Studio에서 수동으로 항목을 나눈다.

| 프로젝트 | 이관 후 조치 |
|---|---|
| Cheongju Culture Factory | `Winner / Grand prize in 2020 Korea Remodeling Architecture Competition` 1항목 → 2항목으로 분해. ① `Competition Winner` ② `Grand Prize, 2020 Korea Remodeling Architecture Competition` |

**표기 정제(수동).** Career 데이터에 다음 오기가 있다. 이관 후 Studio에서 교정한다.
- `WInner` → `Winner` (Woongbu Middle School)
- `4th prize` → `4th Prize` (The 2nd Complex of Seoul Court House)
- `Grand prize` → `Grand Prize`

실행: `npx tsx --env-file=.env.local scripts/migrateAwards.ts`

**배포 순서 — 데이터 마이그레이션 먼저, 빌드 나중.** 스키마·코드가 새것이어도 데이터가 구형이면 정적 프리렌더가 빌드 시점에 실패한다.

---

## 3. 정보 슬라이드 레이아웃 재개편 — 데스크톱

### 3-A. 목표 구조

```
┌─ 타이틀 세트 (고정 높이 슬롯) ─────┐
│  영문 타이틀                        │
│  한글 타이틀                        │
│  영문 서브 / 한글 서브              │   ← 슬롯 내부에서 유동
│  (남는 공간은 빈 채로 점유)          │
└────────────────────────────────────┘
   AWARDS  ← 시작 y좌표 고정 (전 프로젝트 동일)
   CLIENT
   LOCATION
   TYPOLOGY / SIZE / STATUS / YEAR
   ROLE
```

핵심: **AWARDS 시작 y가 전 프로젝트에서 동일**하다. 타이틀이 1줄이든 3줄이든, 서브가 있든 없든 무관. AWARDS **아래**는 수상 개수에 따라 자연히 밀린다(허용).

### 3-B. 타이틀 세트 고정 슬롯

현재 `<div style={{marginBottom:20}}>` 래퍼를 다음으로 교체한다.

```tsx
<div style={{ minHeight: TITLE_SET_MIN_H, marginBottom: 20 }}>
```

`TITLE_SET_MIN_H` 상수를 `INFO_SLIDE_W` 근처(ContentArea.tsx 상단 상수 블록)에 정의한다.

**산출 근거 (INFO_SLIDE_W = 200px 기준):**

| 요소 | fontSize | lineHeight | 최대 줄수 | 높이 |
|---|---|---|---|---|
| 영문 타이틀 | 16 | 1.35 (=21.6) | 3 | 64.8 |
| gap (BilingualText) | — | — | — | 2 |
| 한글 타이틀 | 12 | 1.3 (=15.6) | 2 | 31.2 |
| marginTop (서브 래퍼) | — | — | — | 8 |
| 영문 서브 | 11 | 1.4 (=15.4) | 3 | 46.2 |
| gap (BilingualText) | — | — | — | 1 |
| 한글 서브 | 10 | 1.4 (=14) | 2 | 28 |
| **합계** | | | | **181.2** |

→ `const TITLE_SET_MIN_H = 182`

**3줄 근거:** 노출 대상 프로젝트 중 최장 영문 타이틀은 `Cheongju City Agricultural and Marine Products Wholesale Market`(63자). 200px 폭·16px·weight 500에서 3줄이 된다. 한글 타이틀 최장은 2줄로 충분하다.

**검증 지시.** 구현 후 다음 3개 프로젝트를 데스크톱에서 육안 확인하고, 타이틀 세트가 슬롯을 넘쳐 AWARDS를 밀어내면 `TITLE_SET_MIN_H`를 상향한다.
- `Cheongju City Agricultural and Marine Products Wholesale Market` (최장 영문 타이틀)
- `ARARIO Gallery _ Former Building of SPACE GROUP Complex extension` (65자)
- `Chungnam International Exhibition and Convention Center` (55자 + 서브 존재)

**넘침 처리.** 슬롯을 넘치는 경우에도 텍스트를 자르지 않는다(`overflow` 미지정, 자연 확장). 넘치면 AWARDS가 밀리며, 이는 `TITLE_SET_MIN_H` 상향으로 해결한다.

### 3-C. LOCATION 이동

타이틀 세트 래퍼 안에 있는 `project.location` 블록(L928~938)을 **삭제**하고, CLIENT 아래로 이동한다. 삭제 후 타이틀 세트 래퍼 안에는 타이틀 `BilingualText`와 서브타이틀 `BilingualText`만 남는다.

### 3-D. Prize → AWARDS 렌더러

기존 Prize 블록(L942~950)을 다음으로 교체한다.

```tsx
{/* AWARDS — 타이틀 세트 고정 슬롯 직후. 시작 y좌표가 전 프로젝트에서 동일하다.
    아래 CLIENT 이하는 수상 개수에 따라 자연히 밀린다 */}
{(() => {
  const visible = project.awards?.filter(a => a.visible !== false) ?? []
  if (visible.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {visible.map((a, i) => (
        <div key={i} style={{
          fontSize: 15,
          fontWeight: 400,
          color: '#b89773',
          letterSpacing: '0.01em',
          lineHeight: 1.35,
          wordBreak: 'keep-all',
        }}>
          {a.title}
        </div>
      ))}
    </div>
  )
})()}
```

변경점:
- `minHeight: 20` **제거**. 타이틀 세트 슬롯이 고정 역할을 이미 수행하므로 AWARDS의 높이 예약은 불필요하며, 상 없는 프로젝트에서 불필요한 여백이 된다.
- 수상이 없거나 전부 `visible: false`면 `null` 반환 → 컨테이너 `gap: 24`가 자동 흡수되어 CLIENT가 위로 올라온다. **이는 의도된 동작이다**(AWARDS 시작 y 고정은 "AWARDS가 존재할 때"의 요건이며, 없을 때 빈칸을 남기지 않는다).
- 여러 줄 수상은 `lineHeight: 1.35`, `wordBreak: 'keep-all'`로 자연 줄바꿈.
- 항목 간 `gap: 4`.

### 3-E. CLIENT 아래 LOCATION 배치

`<MetaField label="CLIENT" .../>` 직후에 다음을 추가한다.

```tsx
<MetaField label="LOCATION" value={project.location} />
```

`MetaField`는 라벨+값 구조이므로 기존 CLIENT와 동일한 시각 위계를 갖는다. LOCATION 값이 길어 여러 줄이 되어도 전폭이므로 정렬이 깨지지 않는다. `MetaField`가 `wordBreak: 'keep-all'`을 갖고 있는지 확인하고, 없으면 추가한다(긴 주소의 단어 중간 절단 방지).

CLIENT와 LOCATION은 하나의 논리 블록이므로, 둘을 `<div style={{display:'flex', flexDirection:'column', gap:14}}>`로 묶어 그 아래 2블록(TYPOLOGY~YEAR)과 동일한 내부 간격을 갖게 한다.

### 3-F. 최종 데스크톱 순서

```
[타이틀 세트 고정 슬롯: 영문 타이틀 / 한글 타이틀 / 영문 서브 / 한글 서브]
AWARDS (금색, 있을 때만)
CLIENT
LOCATION
TYPOLOGY / SIZE / STATUS / YEAR
ROLE
```

---

## 4. 정보 슬라이드 재개편 — 모바일

### 4-A. LOCATION 이동

`MobileInfoSlide` 내 `project.location` 블록(L401~411)을 삭제하고, `<MobileMetaField label="CLIENT" .../>` 직후로 이동하되 **`MobileMetaField`로 감싼다**:

```tsx
<MobileMetaField label="CLIENT" value={project.client} />
<MobileMetaField label="LOCATION" value={project.location} />
```

현재 모바일 LOCATION은 라벨 없는 단독 텍스트다. 데스크톱과 동일하게 라벨을 갖도록 통일한다.

### 4-B. Prize → AWARDS

기존 Prize 블록(L393~399)을 교체한다. 데스크톱과 동일 로직, `fontSize`만 14 유지.

```tsx
{(() => {
  const visible = project.awards?.filter(a => a.visible !== false) ?? []
  if (visible.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {visible.map((a, i) => (
        <div key={i} style={{
          fontSize: 14,
          fontWeight: 400,
          color: '#b89773',
          letterSpacing: '0.01em',
          lineHeight: 1.35,
          wordBreak: 'keep-all',
        }}>
          {a.title}
        </div>
      ))}
    </div>
  )
})()}
```

`minHeight: 20` 제거.

### 4-C. 타이틀 세트 고정 슬롯 — 모바일은 적용하지 않는다

모바일은 영문 타이틀이 InfoSlide 바깥에 있고 `WebkitLineClamp: 2`로 이미 2줄 고정이다. 폭이 100%라 줄수 편차가 작고, 세로 스크롤 레이아웃이므로 고정 슬롯의 이점이 없다. **모바일에는 `minHeight` 예약을 도입하지 않는다.**

### 4-D. 메타 항목 상하 간격 축소 — 하나의 박스로 읽히게

`MobileInfoSlide` 컨테이너의 `gap: 16` → **`gap: 12`**로 변경한다.

2×2 그리드의 `gap: 12`는 유지한다(변경 시 좌우 열 간격까지 좁아진다).

`MobileMetaField` 내부 라벨↔값 `marginTop: 2`는 유지한다.

### 4-E. 정보 슬라이드 ↔ 다음 슬라이드 간격 +10%

`MobileInfoSlide` 다음에 오는 첫 슬라이드(스크린샷의 `Urban sprawl and NIMBY` 텍스트 슬라이드)와의 간격을 현재 대비 10% 증가시킨다.

현재 간격은 부모 스택의 `gap: SLIDE_GAP`(=24)이다. `SLIDE_GAP` 자체를 바꾸면 **모든 슬라이드 간 간격**이 함께 변하므로 변경하지 않는다.

`MobileInfoSlide` 루트 `<div>`에 다음을 추가한다:

```tsx
marginBottom: Math.round(SLIDE_GAP * 0.1),   // 정보↔다음 슬라이드 간격 +10% (24 → 26.4 ≈ 26)
```

`marginTop: -SLIDE_GAP + 6`은 그대로 유지한다(히어로·타이틀과의 결속).

---

## 5. 검증

`npx tsc --noEmit` 만 실행한다. `npm run dev` / `npm run build`는 실행하지 않는다.

### 5-A. 컴파일러를 진단 수단으로 사용

`result` 제거 시 다음 순서를 지킨다:

1. `src/types/index.ts`에서 `result?: string`을 **먼저 삭제**한다.
2. `npx tsc --noEmit` 실행 → `project.result`를 참조하는 모든 지점이 컴파일 오류로 드러난다.
3. 드러난 지점을 전부 처리한 뒤 다시 `tsc`.

이 순서를 밟지 않고 신규 코드만 추가하면 구 참조가 남아 부분 이행이 된다.

### 5-B. tsc가 잡지 못하는 것 — 수동 확인 필수

`tsc`는 코드만 검증하며 **데이터·GROQ 문자열·preview 문자열을 검증하지 못한다.** 다음은 반드시 수동 확인한다:

- GROQ 문자열에 `result`가 남아있지 않은지 (`grep -rn "result" src/ sanity/`)
- 마이그레이션 후 Sanity 데이터에 `result` 필드가 남아있지 않은지 (GROQ: `*[_type=="project" && defined(result)]`)
- `awards` 배열 항목에 `_key`가 모두 존재하는지 (누락 시 Studio에서 배열 편집 불가)

---

## 6. 변경 파일 목록

| 파일 | 변경 |
|---|---|
| `sanity/schemaTypes/project.ts` | `result` 삭제, `awards` 배열 추가 |
| `src/types/index.ts` | `result` 삭제, `Award` 인터페이스 + `awards?: Award[]` 추가 |
| `src/components/ContentArea.tsx` | 타이틀·서브 `order` → en-first, `TITLE_SET_MIN_H` 상수 + 슬롯 적용, LOCATION 이동, AWARDS 렌더러 |
| `src/components/MobileProjectWall.tsx` | AWARDS 렌더러, LOCATION 이동(MobileMetaField화), `gap` 16→12, `marginBottom` 추가, 주석 정정 |
| `src/lib/bilingual.tsx` | JSDoc 주석 갱신 (동작 변경 없음) |
| GROQ 쿼리 파일 | `result` → `awards[]{title, visible}` |
| `scripts/migrateAwards.ts` | 신규 |

---

## 7. 제약

- `INFO_SLIDE_W`(200), `TEXT_SLIDE_W`(560), `QUOTE_SLIDE_W`(460)는 **변경 금지**. rects·morph가 참조한다.
- `useRingWall.ts` 물리 코어는 수정하지 않는다.
- `SLIDE_GAP`(24) 상수 자체는 변경하지 않는다.
- 모바일 영문 타이틀(`titleRef`)의 위치·구조는 모프 종착점이므로 이동하지 않는다.
- 측정 반응형 패턴 금지 — `getBoundingClientRect`, 콘텐츠 측정용 `ResizeObserver`, `offsetWidth` 기반 레이아웃을 도입하지 않는다. `TITLE_SET_MIN_H`는 상수에서 결정론적으로 파생된다.
- `src/lib/`의 공유 헬퍼(`sizeLabel`, `splitRole`, `BilingualText`)를 컴포넌트 안에 복제하지 않는다.
