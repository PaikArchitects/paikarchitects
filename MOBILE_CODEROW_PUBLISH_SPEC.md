# 모바일 코드 행 간격 수정 + 프로젝트 노출 스위치 명세

작성일 260720. 대상: `src/components/MobileProjectWall.tsx`, `sanity/schemaTypes/project.ts`, `src/lib/queries.ts`, `src/types/index.ts`.

본 명세는 실제 소스 감사(260720) 위에 작성되었다. 아래 「현황」은 확인된 사실이며 추정이 아니다.

---

## 0. 현황 (감사 확인 사항)

`MobileProjectWall.tsx` `ExpandedBlock`의 세로 스택 구조:

- L552~561: 스택 컨테이너 `display:flex, flexDirection:column, gap: SLIDE_GAP(24)`.
- 스택의 직계 자식 순서: ① 히어로 `<div ref={heroRef}>` → ② 코드 행 `<div>` → ③ 타이틀 행 `<div ref={titleRef}>` → ④ `<MobileInfoSlide>` → ⑤ 나머지 슬라이드들.
- L580~592 코드 행: `fontSize:8`, `opacity:0.35`, `letterSpacing:'0.15em'`, `marginTop: -SLIDE_GAP + 12`(= -12), `marginBottom: 4`.
- L594~611 타이틀 행: `fontSize:18`, `marginTop: 0`, `ref={titleRef}` — **모프 종착점**.

### 0-A. 문제 원인

코드 행과 타이틀 행이 **부모 플렉스 스택의 형제 요소**이므로 그 사이에 `gap: SLIDE_GAP`(24)이 적용된다. 실제 간격은 `marginBottom: 4 + gap 24 = 28px`다.

데스크톱은 코드 행이 타이틀 세트 고정 슬롯(`minHeight: TITLE_SET_MIN_H`) **안**에 있어 `marginBottom: 6`만 적용되며 타이틀과 밀착된다.

따라서 모바일에서 코드가 히어로 쪽에 붙고 타이틀과 떨어져 보인다. 데스크톱과 결속 관계가 반대다.

---

## 1. 코드 행 + 타이틀 행을 단일 래퍼로 묶는다

### 1-A. 구조 변경

코드 행과 타이틀 행을 하나의 `<div>` 래퍼로 감싸 부모 `gap`에서 제외한다. 래퍼가 스택의 자식 하나가 되므로 히어로↔래퍼 사이에만 `gap`이 적용되고, 래퍼 내부에서는 `marginBottom`만 작동한다.

```tsx
{/* 코드 + 타이틀 — 한 세트. 부모 gap에서 제외해 데스크톱과 결속 관계를 맞춘다 */}
<div style={{ marginTop: -SLIDE_GAP + 12 }}>
  {/* 프로젝트 코드 */}
  <div style={{
    fontFamily: FONT,
    fontSize: 8,
    fontWeight: 300,
    letterSpacing: '0.15em',
    opacity: 0.35,
    color: '#080706',
    marginBottom: 4,
  }}>
    {String(project.careerNo).padStart(3, '0')}
  </div>

  {/* 타이틀 행 — 보간 중에는 오버레이가 대신 렌더 (모프 종착점) */}
  <div
    ref={titleRef}
    style={{
      fontFamily: FONT,
      fontSize: 18,
      fontWeight: 600,
      lineHeight: 1.35,
      color: '#080706',
      wordBreak: 'keep-all',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden',
      opacity: titleMorphing ? 0 : 1,
    }}
  >
    {project.title.en}
  </div>
</div>
```

변경점:
- 히어로와의 간격 제어(`marginTop: -SLIDE_GAP + 12`)를 **래퍼로 이전**한다. 코드 행에서는 제거한다.
- 코드 행의 `marginBottom: 4`는 유지 — 이제 부모 `gap` 없이 이 값만 코드↔타이틀 간격이 된다.
- 타이틀 행의 `marginTop: 0`은 **제거**한다(래퍼가 간격을 담당하므로 불필요한 명시다).

### 1-B. `titleRef` 불변

`ref={titleRef}`가 가리키는 DOM 요소는 그대로다. 부모가 하나 추가될 뿐 요소 자체의 화면 좌표는 바뀌지 않으므로 모프 보간에 영향이 없다. **`titleRef`를 래퍼로 옮기지 않는다.** 모프는 타이틀 텍스트 요소의 좌표를 읽는다.

### 1-C. 결과

| 구간 | 변경 전 | 변경 후 |
|---|---|---|
| 히어로 ↔ 코드 | `gap 24 + marginTop(-12)` = 12 | `gap 24 + marginTop(-12)` = 12 (불변) |
| 코드 ↔ 타이틀 | `marginBottom 4 + gap 24` = 28 | `marginBottom 4` = 4 |
| 타이틀 ↔ 정보 슬라이드 | `gap 24 + MobileInfoSlide marginTop(-18)` = 6 | 동일 (불변) |

데스크톱(코드↔타이틀 `marginBottom: 6`)과 결속 관계가 일치한다.

### 1-D. 검증

- 모바일에서 `014` 코드가 타이틀 `Cheonan Samgeori Park` 바로 위에 밀착되는가.
- 히어로 이미지와 코드 사이 간격이 이전과 동일한가(변하면 안 된다).
- 카드→상세 모프가 정상 동작하는가 — 타이틀이 카드 위치에서 상세 위치로 매끄럽게 보간되는가.
- 타이틀 2줄 프로젝트에서도 간격이 유지되는가.

---

## 2. 프로젝트 월 노출 스위치

프로젝트별로 사이트 게재 여부를 제어하는 불리언 필드를 추가한다. 이미지 미확보 프로젝트나 비공개 프로젝트를 스키마에서 지우지 않고 숨길 수 있다.

### 2-A. 스키마 (`sanity/schemaTypes/project.ts`)

필드 목록 **최상단**(현행 `careerNo`보다 위)에 다음을 추가한다.

```ts
defineField({
  name: 'published',
  title: 'PUBLISHED',
  type: 'boolean',
  description: '체크 해제 시 사이트에 표시되지 않는다 (Studio에는 남는다)',
  initialValue: true,
}),
```

**`initialValue: true`인 근거**: 신규 프로젝트를 만들 때마다 체크해야 하는 부담을 없앤다. 숨김이 예외 상황이므로 기본값은 노출이다.

**필드명이 `published`인 근거**: Sanity의 published/draft 문서 상태와 이름이 겹치지만, 그것은 문서 상태이지 필드가 아니므로 충돌하지 않는다. 다만 혼동 여지가 있으므로 **`visibleOnSite`를 대안으로 검토했고, 라벨 통일 원칙(사이트 표시 개념을 영문 대문자로)에 따라 `published`를 택한다.** Studio 상단 `Published`/`Draft` 탭과 시각적으로 구분되도록 `description`에 동작을 명시한다.

`initialValue`가 `true`여도 **기존 30개 문서에는 필드가 없다**(`undefined`). GROQ 필터에서 이를 처리해야 한다(2-B).

### 2-B. GROQ 필터 (`src/lib/queries.ts`)

`PROJECTS_QUERY`의 필터절을 다음으로 변경한다.

```
*[_type == "project" && published != false] | order(careerNo desc) {
```

`published != false`인 근거: 기존 문서는 `published`가 `undefined`이며 GROQ에서 `undefined != false`는 참이다. 따라서 **마이그레이션 없이 기존 30개가 전부 노출된다.** `published == true`로 쓰면 기존 문서가 전부 사라지므로 반드시 `!= false`를 쓴다.

`SLUGS_QUERY`도 동일하게 변경한다. 숨긴 프로젝트의 정적 페이지를 생성하지 않기 위해서다.

```
*[_type == "project" && published != false].slug.current
```

### 2-C. 프로젝션·타입

`PROJECTS_QUERY` 프로젝션에 `published`를 **추가하지 않는다.** 필터에서만 쓰이고 렌더러가 참조하지 않으므로 `Project` 타입에도 추가하지 않는다. 불필요한 필드를 타입에 넣으면 `RawProject`·매핑까지 3지점을 늘리게 된다.

### 2-D. 데이터 마이그레이션 불필요

`published != false` 필터 덕에 기존 문서는 그대로 노출된다. 창현님이 특정 프로젝트를 숨기고 싶을 때 Studio에서 체크를 해제하면 된다.

### 2-E. 검증

- Studio 문서 최상단에 `PUBLISHED` 체크박스가 있고 신규 문서에서 기본 체크 상태인가.
- 기존 30개 프로젝트가 모두 사이트에 그대로 노출되는가(마이그레이션 없이).
- 임의 프로젝트의 `PUBLISHED`를 해제하고 Publish 후 재배포하면 프로젝트 월에서 사라지는가.
- 숨긴 프로젝트의 `/work/[slug]` 직접 접근 시 404가 되는가(`SLUGS_QUERY` 필터 적용 확인).

---

## 3. 검증

`npx tsc --noEmit` 만 실행한다. `npm run dev` / `npm run build`는 실행하지 않는다.

`tsc`는 GROQ 문자열·스키마 필드 순서·레이아웃 간격을 검증하지 못한다. 1-D와 2-E의 항목을 육안 확인한다.

---

## 4. 변경 파일 목록

| 파일 | 변경 |
|---|---|
| `src/components/MobileProjectWall.tsx` | 코드 행 + 타이틀 행을 단일 래퍼로 묶음, `marginTop` 이전 |
| `sanity/schemaTypes/project.ts` | `published` 불리언 필드 최상단 추가 |
| `src/lib/queries.ts` | `PROJECTS_QUERY`·`SLUGS_QUERY` 필터에 `published != false` 추가 |

`src/types/index.ts` 변경 없음. 데이터 마이그레이션 없음.

---

## 5. 제약

- `titleRef`가 가리키는 DOM 요소를 변경하지 않는다. 래퍼를 추가하되 `ref`는 타이틀 텍스트 요소에 그대로 둔다(모프 종착점).
- 히어로 ↔ 코드 행 간격(현행 12px)을 변경하지 않는다.
- `SLIDE_GAP`(24) 상수 변경 금지.
- `INFO_SLIDE_W`(200) / `TEXT_SLIDE_W`(560) / `QUOTE_SLIDE_W`(460) 상수 변경 금지.
- `useRingWall.ts` 수정 금지.
- 데스크톱 `ContentArea.tsx`를 수정하지 않는다. 데스크톱 코드 행 간격은 현재 상태가 기준이다.
- GROQ 필터는 반드시 `published != false`를 쓴다. `published == true`는 기존 문서(필드 부재)를 전부 제외시킨다.
- `published`를 프로젝션·`RawProject`·`Project` 타입에 추가하지 않는다. 필터 전용이다.
- `src/lib/shuffle.ts`와 `LandingExperience.tsx`의 셔플 로직을 수정하지 않는다.
- 측정 반응형 패턴 금지 — `getBoundingClientRect`, 콘텐츠 측정용 `ResizeObserver`, `offsetWidth` 기반 레이아웃을 도입하지 않는다.
