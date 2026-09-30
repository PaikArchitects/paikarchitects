# STUDIO_REFINE v2 — 폼 폭 확대 · 목록 펼침 · 슬라이드 격자 (260930)

> 근거: `AUDIT_REPORT_STUDIO_v2_260930.md` (읽기 전용 조사, 260930)
> 선행: STUDIO_REFINE v1 배포 완료, `localeTypes.ts` 좌우 2열(`columns: 2`) 적용 완료
> 성격: **Studio 화면 표시만 변경**. 저장 데이터·스키마 식별자·사이트 화면 무변경.

---

## 0. 절대 제약 (위반 시 즉시 중단·보고)

1. 스키마 `name`(타입명·필드명), `_type`, structure `.id`, GROQ 문자열 변경 금지. 필드 순서 변경 금지.
2. **수정 허용 파일 (이 외 전부 금지)**
   - 신규: `src/app/studio/[[...tool]]/studio.css`
   - 신규: `sanity/components/InlineObjectItem.tsx`
   - `src/app/studio/[[...tool]]/page.tsx` — CSS import 1줄만
   - `sanity/schemaTypes/about.ts` — P3 대상 배열 4개에 `components` 추가만
   - `sanity/schemaTypes/project.ts` — `slides` 필드에 `options` 추가만
3. 수정 금지: `globals.css`, `src/lib/sanity/*`, `SiteHeader.tsx`, `SiteChromeContext.tsx`, `localeTypes.ts`, `slides.ts`, `ContentArea.tsx`, `MobileProjectWall.tsx`
4. **`@sanity/ui` import 금지** — 저장소 최상위에 설치돼 있지 않음(감사 260930 §6, v2 조사 서두). 신규 컴포넌트는 React + inline style만 사용. `sanity` 패키지에서의 **타입 import**는 허용.
5. `defineConfig`의 `theme` 옵션 사용 금지 — `@hidden @beta`·deprecated이며 v2 객체 전체를 교체해야 함(조사 §A-2).
6. 패키지 설치·업그레이드 금지(레지스트리 sanity 6.17.0이 있으나 이번 범위 아님). 데이터 마이그레이션 금지.
7. 검증은 `npx tsc --noEmit` + §검증 grep만. `npm run dev` / `npm run build` 금지.

---

## 사전 확인 (구현 전 보고)

| # | 확인 | 중단 조건 |
|---|---|---|
| C1 | `src/app/studio/[[...tool]]/page.tsx` 현재 전문(감사 260930 §5-a와 동일한지) | 다르면 중단·보고 |
| C2 | `ObjectItemProps`가 `sanity` 패키지 루트에서 export되는지(`node_modules/sanity/lib/index.d.ts` 등 발췌) | 없으면 P3 중단·보고(P1·P2는 진행) |
| C3 | `@sanity/types`의 `ArrayOptions`에 `layout` 옵션과 `'grid'` 값이 있는지 발췌 | 없으면 P2 중단·보고 |

---

## P1. 문서 편집 폼 최대 폭 확대 (640px → 1200px)

근거(조사 §A-1): 폼 최대 폭은 `FormContainer`(styled div)의 `max-width: calc(container[1]px + 거터)`, `container[1]` = 640. 공식 설정 경로 없음(§A-2) → CSS 덮어쓰기.

### P1-a. 신규 `src/app/studio/[[...tool]]/studio.css`

```css
/* 260930 STUDIO_REFINE v2 — Studio 문서 편집 폼 최대 폭 확대 (기본 640px)
 * 근거: AUDIT_REPORT_STUDIO_v2_260930 §A. FormContainer에 고정 속성이 없어
 * 해시 아닌 부모 data-testid 기준 첫 자식으로 지정한다.
 * Sanity 업그레이드 시 DOM이 바뀌면 효과가 사라질 수 있음(사이트 영향 없음). */
[data-testid="document-panel-scroller"] > div:first-child {
  max-width: 1200px !important;
}
```

- 선택자는 Studio에만 존재하는 `data-testid`이므로 사이트 페이지에 영향 없음.
- 좁은 화면에서는 기존처럼 화면 폭에 맞춰짐(max-width만 확대).

### P1-b. `page.tsx`에 import 1줄

```tsx
import './studio.css'
```
기존 import들 아래에 추가. 다른 줄 변경 금지.

---

## P2. WORKS 슬라이드 목록을 격자(좌→우 흐름)로 표시

`project.ts`의 `slides` 필드에 옵션 추가:

```ts
      options: { layout: 'grid' },
```

- 기존에 `options`가 있으면 병합(현재 감사 기준 없음).
- 공식 배열 옵션. 슬라이드가 썸네일 타일로 좌→우로 배치되고 드래그로 순서 변경.
- `slides.ts`(각 슬라이드 타입의 preview)는 수정하지 않는다.

---

## P3. About 목록 항목을 모달 없이 펼쳐서 편집

근거(조사 §B-1): 커스텀 `components.item`에 전달되는 `props.children`이 항목의 입력 폼이며, 모달 여부는 기본 렌더러(PreviewItem)의 선택일 뿐.

### P3-a. 신규 `sanity/components/InlineObjectItem.tsx`

```tsx
'use client'

import type { ObjectItemProps } from 'sanity'

// 260930 STUDIO_REFINE v2 — 배열 항목을 모달 대신 목록 안에 펼쳐서 편집
// 기본 항목 행(드래그 핸들·메뉴)은 유지하되 클릭해도 모달이 열리지 않게 하고,
// 항목 입력 폼(children)을 행 아래에 항상 렌더한다.
const noop = () => {}

export function InlineObjectItem(props: ObjectItemProps) {
  return (
    <div
      style={{
        border: '1px solid var(--card-border-color, rgba(128,128,128,0.25))',
        borderRadius: 4,
        marginBottom: 12,
      }}
    >
      {props.renderDefault({ ...props, open: false, onOpen: noop })}
      <div style={{ padding: '4px 16px 16px' }}>{props.children}</div>
    </div>
  )
}
```

- `sanity`에서 **타입만** import. `@sanity/ui` 사용 금지(§0-4).
- tsc가 `renderDefault` 인자 타입 불일치를 보고하면, 최소한의 타입 단언으로 해결하고 그 내용을 보고. 로직 변경 금지.

### P3-b. `about.ts` — 대상 배열 4개

| 필드 | 적용 방식 |
|---|---|
| `preoccupations` | 인라인 object 멤버(`name: 'preoccupation'`) 정의에 `components: { item: InlineObjectItem }` 추가 |
| `education` | `of: [{ type: 'cvSimpleEntry', components: { item: InlineObjectItem } }]` |
| `awards` | `of: [{ type: 'cvRankedEntry', components: { item: InlineObjectItem } }]` |
| `exhibitions` | `of: [{ type: 'cvVenueEntry', components: { item: InlineObjectItem } }]` |

- **`employment`는 제외** — 내부에 참여 프로젝트 46건 배열이 중첩돼 있어 펼치면 화면이 과도하게 길어짐. 기존 모달 유지.
- `of` 배열의 `type` 값은 그대로, `components`만 추가.
- import 1줄: `import { InlineObjectItem } from '../components/InlineObjectItem'`

### 미확인 위험 (조사 §B-1 기준 — 배포 후 육안 확인으로 판정)

- 닫힌 항목에서도 입력 폼이 온전히 그려지는지
- 입력 중 포커스 이동 시 모달이 뜨거나 스크롤이 튀는지

문제가 생기면 about.ts의 `components` 추가분만 되돌리면 원상복구된다(데이터 무관).

---

## 검증

| # | 명령 | 기대 |
|---|---|---|
| V1 | `npx tsc --noEmit` | 오류 0 |
| V2 | `grep -rn "name: '" sanity/schemaTypes` 작업 전후 비교 | 완전히 동일 |
| V3 | `grep -rn "@sanity/ui" sanity src` | 0건 |
| V4 | `grep -n "InlineObjectItem" sanity/schemaTypes/about.ts` | import 1 + 사용 4 = 5건 |
| V5 | `grep -n "layout: 'grid'" sanity/schemaTypes/project.ts` | 1건 |
| V6 | `git diff --stat` | §0-2 허용 파일만 표시 |

## 보고

1. 사전 확인 C1–C3 결과
2. 파일별 변경 줄
3. V1–V6 결과 원문
4. P3 타입 단언 사용 여부

## 배포 후 사용자 육안 확인

1. **폼 폭**: About·WORKS 문서의 입력 영역이 넓어졌는지, EN | KO 두 칸이 여유 있게 보이는지
2. **슬라이드 격자**: WORKS → SLIDES 탭에서 썸네일 타일이 좌→우로 놓이는지, 드래그로 순서가 바뀌는지
3. **About 목록 펼침**: PREOCCUPATIONS·EDUCATION·AWARDS·EXHIBITIONS 항목이 클릭 없이 펼쳐져 있고 바로 입력되는지
4. **펼친 항목 편집 중**: 모달이 뜨거나 스크롤이 튀지 않는지, 드래그 순서 변경·삭제 메뉴가 그대로 되는지
5. **EMPLOYMENT**: 기존처럼 클릭 시 창이 열리는지(의도된 유지)
6. **사이트**: `/`·`/about` 화면이 그대로인지
