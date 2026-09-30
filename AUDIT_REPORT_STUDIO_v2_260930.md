# AUDIT REPORT — Studio v2 사전 조사 (260930)

> 읽기 전용 조사. 본 파일 외 수정 없음, 패키지 설치 없음 (`npm view` / `npm search` 조회만 실행).
> 모든 판단은 `node_modules` 원문 발췌 근거. 코드로 확인 불가한 사항은 "미확인".
> 경로 약칭: `SANITY` = `node_modules/sanity/lib`, `UI` = `node_modules/sanity/node_modules/@sanity/ui/dist` (sanity가 실제 로드하는 @sanity/ui 3.3.5 — 저장소 최상위 `node_modules/@sanity/ui`는 없음, 감사 260930 §6)

---

## A. 문서 편집 폼의 최대 폭

### A-1. 폭 결정 코드 위치와 값

**① 폼 렌더 체인** — `SANITY/_chunks-es/structureTool.js`

4588–4590행 (DocumentPanel):
```js
      /* @__PURE__ */ jsxs(Scroller$4, { $disabled: layoutCollapsed || !1, "data-testid": "document-panel-scroller", ref: setDocumentScrollElement, children: [
        /* @__PURE__ */ jsx(FormView, { hidden: formViewHidden, margins, ref: formContainerElement }),
        activeViewNode
```

4058–4062행 (FormView 반환부):
```js
  $[100] !== setRef || $[101] !== t26 || $[102] !== t27 ? (t28 = /* @__PURE__ */ jsx(Box, { as: "form", onSubmit: preventDefault, ref: setRef, "data-testid": "form-view", "data-read-only": t26, children: t27 }), ...
  $[104] !== margins || $[105] !== t28 ? (t29 = /* @__PURE__ */ jsx(PresenceOverlay, { margins, children: t28 }), ...
  return $[107] !== hidden || $[108] !== t29 ? (t30 = /* @__PURE__ */ jsx(FormContainer, { hidden, children: t29 }), ...
```
→ DOM 순서: `[data-testid="document-panel-scroller"]` > **FormContainer(div)** > PresenceOverlay > `form[data-testid="form-view"]`

**② 최대 폭 정의 — `FormContainer`** — `SANITY/_chunks-es/index2.js:52266`
```js
const FormContainer = /* @__PURE__ */ styled.div.withConfig({
  displayName: "FormContainer",
  componentId: "sc-yal29m-0"
})((props2) => {
  const {
    space,
    container
  } = getTheme_v2(props2.theme);
  return css`
    --formGutterSize: calc(${space[4]}px * var(--formGutterEnabled));
    --formGutterGap: calc(${space[3]}px * var(--formGutterEnabled));
    box-sizing: border-box;
    margin-inline: auto;
    padding-inline: ${space[4]}px;
    padding-block-start: ${space[5]}px;
    padding-block-end: ${space[9]}px;
    max-width: calc(
      ${container[1]}px + (var(--formGutterSize, 0px) * 2) + (var(--formGutterGap, 0px) * 2)
    );
  `;
});
```
→ **max-width = theme `container[1]` + 거터**. 별도 상수 없음, theme container 배열 인덱스 1을 사용.

**③ container 배열 기본값** — `UI/_chunks/theme.mjs:1102`
```js
	container: [
		320,
		640,
		960,
		1280,
		1600,
		1920
	],
```
→ `container[1]` = **640px**.

**④ `getTheme_v2`** — `UI/_chunks/theme.mjs:1721`
```js
function getTheme_v2(theme) {
	if (theme.sanity.v2?._resolved) return theme.sanity.v2;
	...
		container: theme.sanity.container,
```

**거터 변수 `--formGutterEnabled`의 값 설정 위치**: 미확인 (grep 안 함).
**document pane 자체의 폭(패인 분할 폭)이 폼 폭을 추가로 제한하는지**: 미확인.

### A-2. `defineConfig`의 theme로 바꿀 수 있는 경로

**① config 타입** — `SANITY/_chunks-dts/ActiveWorkspaceMatcherContext.d.ts:16751-16755`
```ts
  /**
   * @hidden
   * @beta
   */
  theme?: StudioTheme;
```

**② `StudioTheme` 타입** — 같은 파일 5216–5270행 (발췌)
```ts
/** @public
 * @deprecated – Will be removed in upcoming major version
 * */
interface StudioTheme extends Omit<RootTheme, 'avatar' | 'button' | 'container' | 'focusRing' | 'input' | 'layer' | 'media' | 'radius' | 'shadows' | 'space' | 'styles' | 'color' | 'fonts'> {
  ...
  /**
   * @deprecated this theme property is not configurable within the studio
   */
  container?: RootTheme['container'];
  ...
  color?: RootTheme['color'];
  fonts?: RootTheme['fonts'];
}
```

**③ 런타임: Studio가 사용자 theme에서 실제로 쓰는 키** — `SANITY/_chunks-es/index2.js:79332-79340`
```js
function getThemeValues(theme) {
  const defaultTheme2 = getDefaultTheme();
  return {
    ...defaultTheme2,
    v2: theme.v2,
    fonts: isThemerTheme(theme) ? defaultTheme2.fonts : theme.fonts ?? defaultTheme2.fonts,
    color: theme.color ?? defaultTheme2.color
  };
}
```
→ 최상위 `container`는 **버려짐**(`...defaultTheme2`로 덮임). 전달되는 것은 `v2`, `fonts`, `color` 뿐.
→ 결론 ①: `theme: { container: [...] }` 방식은 **효과 없음** (타입 주석 "not configurable"과 런타임 일치).

**④ `v2` 키 경로 — 코드상 존재**

`RootTheme`(= `BaseTheme`)에 `v2` 필드 — `UI/_chunks/theme.d.ts:764`
```ts
  v2?: RootTheme_v2;
```
`StudioTheme`의 Omit 목록에 `'v2'`는 **없음**(②) → 타입상 `theme.v2` 허용.

`RootTheme_v2.container` — `UI/_chunks/theme.d.ts:688`
```ts
  container: number[];
```

ThemeProvider 내부 스코프 테마 생성 — `UI/_chunks/theme.mjs` (getScopedTheme)
```js
	let v0 = is_v2(themeProp) ? v2_v0(themeProp) : themeProp, v2 = is_v2(themeProp) ? themeProp : v0_v2(themeProp), ...
		v2: {
			...v2,
			_resolved: !0,
```
`v0_v2` — `UI/_chunks/theme.mjs:1775`
```js
function v0_v2(v0) {
	if (v0.v2) return v0.v2;
```
→ 체인: `config.theme.v2` → `getThemeValues`가 `v2` 전달 → `v0_v2`가 그대로 반환 → `_resolved: true` 부여 → `getTheme_v2`가 그대로 반환 → `FormContainer`의 `container[1]`에 사용자 값 반영.

**Studio가 config.theme를 워크스페이스에 넣는 위치** — `SANITY/_chunks-es/index2.js:66470`
```js
        theme: rootSource.theme || studioTheme,
```
(`studioTheme`은 `@sanity/ui`에서 import — index2.js 3행)

**v2 경로의 제약 (코드 근거)**
| 항목 | 근거 |
|---|---|
| `theme` 옵션 자체가 `@hidden @beta` | ① |
| `StudioTheme` 전체가 `@deprecated – Will be removed in upcoming major version` | ② |
| `v2`를 넣으면 `color`까지 v2에서 읽힘 → v2 객체는 완전해야 함(부분 객체 불가) | getScopedTheme: `colorScheme_v2 = v2.color[scheme] \|\| v2.color.light` |
| `v2`는 container만이 아니라 **Studio 전체 UI**(Dialog, Container 등 container 배열 참조 컴포넌트 전부)에 적용 | `getTheme_v2` 공용 — 영향 범위 전수는 미확인 |
| 완전한 v2 객체 확보 수단: `sanity`의 `defaultTheme` export (`index.d.ts` export 목록에 `defaultTheme` 있음) — `defaultTheme`은 `buildTheme()` 결과이며 `v2_v0`가 `v2` 필드를 포함해 반환(`UI/_chunks/theme.mjs:1897` `v2`) | 단, Studio 기본값은 `studioTheme`(@sanity/ui)이고 `defaultTheme`(`buildTheme()`)과 색상 동일 여부는 **미확인** |
| 실제 렌더 결과 | **미확인** (dev 서버 금지) |

### A-3. CSS 덮어쓰기용 안정 선택자 후보

| 후보 | 근거 원문 | 평가 |
|---|---|---|
| `[data-testid="document-panel-scroller"]` | structureTool.js:4588 `"data-testid": "document-panel-scroller"` | FormContainer의 **부모**. 해시 아님 |
| `[data-testid="form-view"]` | structureTool.js:4058 `"data-testid": "form-view"` | FormContainer의 **손자**(사이에 PresenceOverlay). 해시 아님 |
| `[data-testid="document-panel-portal"]` | structureTool.js:4593 | 폼과 무관 |
| FormContainer 자신 | `componentId: "sc-yal29m-0"` | 자체 data 속성 **없음**. `sc-yal29m-0`은 styled-components 해시 → 버전 변경 시 바뀔 수 있어 **부적합** |

구조상 가능한 선택자 (DOM 순서 ① 근거):
- `[data-testid="document-panel-scroller"] > div:first-child` — Scroller의 첫 자식이 FormView(=FormContainer div)
- `div:has(> * > [data-testid="form-view"])` — 손자 기준 역참조 (PresenceOverlay가 단일 래퍼 요소인지 **미확인**)

주의 (원문 근거):
- `Scroller$4`의 두 번째 자식 `activeViewNode`가 존재 — `:first-child` 전제는 FormView가 항상 첫 자식일 때만 성립 (4589–4590행)
- FormContainer에 `hidden` prop 전달(4062행) → hidden 상태 DOM 표현 미확인
- `max-width`는 styled-components 클래스로 주입 → 덮어쓰기 우선순위(특이도/`!important`) 필요 여부 미확인
- CSS 삽입 위치: 현재 `/studio` 라우트는 `page.tsx` 1개뿐이고 전용 layout·CSS 없음(감사 260930 §5-a). `globals.css`는 사이트 전역이라 수정 금지 대상(STUDIO_REFINE v1 §0-4)

---

## B. 배열 항목 인라인 편집

### B-1. `components.item` props 타입

`SANITY/_chunks-dts/ActiveWorkspaceMatcherContext.d.ts:12067` — `BaseItemProps` (발췌)
```ts
interface BaseItemProps<T> extends NodeDiffProps<ProvenanceDiffAnnotation> {
  ...
  /** The children of the item. */
  children: ReactNode;
  ...
  /** The function to call to render the default item. See {@link ItemProps} */
  renderDefault: (props: ItemProps) => React.JSX.Element;
}
```

같은 파일 12117행 — `ObjectItemProps`
```ts
interface ObjectItemProps<Item extends ObjectItem = ObjectItem> extends BaseItemProps<Item> {
  /** Whether the item has changes in a draft. */
  changed: boolean;
  /** The schema type of the object. */
  schemaType: ObjectSchemaType;
  /** The schema type of the parent array. */
  parentSchemaType: ArraySchemaType;
  /** Whether the item is collapsed. */
  collapsed: boolean | undefined;
  /** Whether the item is collapsible. */
  collapsible: boolean | undefined;
  /** Callback for when the item is collapsed. */
  onCollapse: () => void;
  /** Callback for when the item is expanded. */
  onExpand: () => void;
  /** Whether the item is open. */
  open: boolean;
  /** Callback for when the item is closed. */
  onClose: () => void;
  /** Callback for when the item is opened. */
  onOpen: () => void;
  /** The value of the item. */
  value: Item;
  /**
   * @hidden
   * @beta */
  inputProps: Omit<ObjectInputProps, 'renderDefault'>;
}
```

**`children`의 실체** — `SANITY/_chunks-es/index2.js` `ArrayOfObjectsItem` (22730행~, 22970–22978행 props 조립부 발췌)
```js
t30 = /* @__PURE__ */ jsx(RenderInput$5, { ...inputProps, ... })
...
t31 = /* @__PURE__ */ jsx(RenderItem$1, { ... collapsed: member.collapsed, ... open: member.open, onOpen: handleOpen, onClose: handleClose, onExpand: handleExpand, onCollapse: handleCollapse, ... inputProps, ... children: t30 })
```
→ `children` = 항목의 **객체 입력 폼(RenderInput)**. `open` 조건 없이 항상 전달됨.

**기본 항목(PreviewItem)이 children을 모달로만 쓰는 부분** — `index2.js:43458` 이후
```js
function PreviewItem(props2) {
  const $ = c(101), {
    ...
    open,
    ...
    onOpen,
    onClose,
    changed,
    focused,
    children,
    inputProps: t0
  } = props2, ...
```
```js
  } = useEnhancedObjectDialog(), openPortal = open && !enhancedObjectDialogEnabled, openEnhancedDialog = open && enhancedObjectDialogEnabled, ...
```
```js
      openPortal && /* @__PURE__ */ jsx(EditPortal, { ..., type: parentSchemaType?.options?.modal?.type || "dialog", width: parentSchemaType?.options?.modal?.width ?? 1, id: value._key, onClose, autofocus: focused, legacy_referenceElement: previewCardElement, children }),
      openEnhancedDialog && /* @__PURE__ */ jsx(EnhancedObjectDialog, { ..., type: parentSchemaType?.options?.modal?.type || "dialog", width: parentSchemaType?.options?.modal?.width ?? 1, id: value._key, onClose, autofocus: focused, legacy_referenceElement: previewCardElement, children })
```
→ 모달 여부는 **기본 렌더러(PreviewItem)의 선택**일 뿐. 커스텀 `components.item`이 `props.children`을 목록 안에 직접 렌더하는 것은 타입상 가능.

**항목 폼 상태(members)가 open과 무관하게 계산되는지** — `index2.js:44579~` `prepareArrayOfObjectsMember`
```js
... comparisonValue = Array.isArray(parent.comparisonValue) && parent.comparisonValue.find((i) => i._key === arrayItem._key) || void 0, itemState = prepareObjectInputState({
      schemaType: itemType,
      level: itemLevel,
      value: arrayItem,
      ...
      openPath: parent.openPath,
      ...
    }, !1), defaultCollapsedState = getCollapsedWithDefaults(itemType.options, itemLevel), collapsed = scopedCollapsedPaths?.value ?? defaultCollapsedState.collapsed;
    return {
      kind: "item",
      key,
      index,
      open: startsWith(itemPath, parent.openPath),
      collapsed,
      ...
      item: itemState
    };
```
`prepareObjectInputState` 서두 — `index2.js:44397`
```js
  }), prepareObjectInputState = memoizePrepareObjectInputState(function(props2, enableHiddenCheck = !0) {
    if (props2.level === MAX_FIELD_DEPTH)
      return null;
```
`MAX_FIELD_DEPTH` — `index2.js:43848`
```js
MAX_FIELD_DEPTH = 20, AUTO_COLLAPSE_DEPTH = 3,
```
→ 항목 state는 `open` 여부로 분기하지 않고 계산됨(깊이 20 제한만 존재). 이 발췌 범위에서 open에 따른 members 생략 코드는 발견되지 않음. 단 `prepareObjectInputState` 본문 전체는 미열람 → **"닫힌 항목의 inputProps.members가 완전하다"는 최종 판정은 미확인**.

**포커스/스크롤 부수 동작** — 인라인 렌더 시 `onFocus`·`focusPath`·`useScrollIntoViewOnFocusWithin`의 상호작용: 미확인.

### B-2. open/expanded 제어 API 존재 여부 (6.4.0)

**항목 레벨** — `ObjectItemProps` (B-1 발췌): `open`, `onOpen`, `onClose`, `collapsed`, `collapsible`, `onExpand`, `onCollapse` **존재**.

**배열 입력 레벨** — `SANITY/_chunks-dts/ActiveWorkspaceMatcherContext.d.ts:12327` `ArrayOfObjectsInputProps` (발췌)
```ts
  /**
   * for array inputs using expand/collapse semantics for items
   *
   * @hidden
   * @beta
   */
  onItemCollapse: (itemKey: string) => void;
  /**
   * @hidden
   * @beta */
  onItemExpand: (itemKey: string) => void;
  /**
   * for array inputs using modal open/close semantics for items
   *
   * @hidden
   * @beta
   */
  onItemOpen: (path: Path) => void;
  /**
   * @hidden
   * @beta */
  onItemClose: () => void;
```
→ `onItemExpand`/`onItemCollapse`/`onItemOpen`/`onItemClose` **존재**. 모두 `@hidden @beta`.

**참고 — 모달 폭 옵션 (공식 스키마 옵션)** — `node_modules/@sanity/types/lib/index.d.ts:2446`
```ts
interface ModalOptions {
  type?: 'dialog' | 'popover';
  width?: 1 | 2 | 3 | 4 | 5 | 'auto' | (1 | 2 | 3 | 4 | 5 | 'auto')[];
}
```
`ArrayOptions`에 `modal?: ModalOptions;` (같은 파일 954행). PreviewItem이 `width: parentSchemaType?.options?.modal?.width ?? 1`로 사용(B-1 발췌) → 배열 필드 `options: { modal: { width: N } }`로 **모달 폭 확대는 공식 경로로 가능**. `width` 숫자와 실제 px 대응: 미확인.

### B-3. `sanity-plugin-advanced-array` npm 조회

명령: `npm view sanity-plugin-advanced-array version peerDependencies dependencies time.modified dist-tags --json`
```
npm error code E404
npm error 404 Not Found - GET https://registry.npmjs.org/sanity-plugin-advanced-array - Not found
npm error 404  The requested resource 'sanity-plugin-advanced-array@*' could not be found or you do not have permission to access it.
```
→ **레지스트리에 해당 이름의 패키지 없음**. peerDependencies·sanity 6 지원 여부: 해당 없음.

보조 조회 `npm search "sanity advanced array"` / `npm search "sanity-plugin array"` 결과에도 배열 항목 인라인 편집 목적의 플러그인은 없음. 배열 관련으로 나온 것은 다음 두 개뿐:
```
sanity-plugin-internationalized-array	Store localized fields in an array to save on attributes	2026-09-29	5.3.2	sanity,sanity-plugin
sanity-plugin-hotspot-array	A configurable Custom Input for Arrays that will add and update items by clicking on an Image	2026-09-29	5.0.18	sanity,sanity-plugin
```
(두 패키지의 peerDependencies는 조회하지 않음 — 미확인)

참고(같은 검색 결과): 레지스트리 최신 `sanity` 6.17.0 / `@sanity/icons` 5.2.3 — 저장소 설치본은 6.4.0 / 5.0.0.

---

## C. 현황 — `about` 문서 배열 필드 (재확인)

`sanity/schemaTypes/about.ts` 현재 원문 grep (`git status` clean — 감사 260930 이후 about.ts 변경은 STUDIO_REFINE v1의 `icon` 추가 2줄뿐)

| 필드 name | title | type | 항목 타입 (of) | 원문 행 |
|---|---|---|---|---|
| `preoccupations` | `'PREOCCUPATIONS'` | `'array'` | 인라인 object `preoccupation` (fields: `heading` localeString, `body` localeText) | 17–33 |
| `education` | `'EDUCATION'` | `'array'` | `cvSimpleEntry` | 36–39 |
| `employment` | `'EMPLOYMENT'` | `'array'` | `cvEmployment` (내부에 `projects: array of cvProjectEntry` — 2단 중첩 배열) | 42–46 |
| `awards` | `'AWARDS'` | `'array'` | `cvRankedEntry` | 49–52 |
| `exhibitions` | `'EXHIBITIONS AND PUBLICATIONS'` | `'array'` | `cvVenueEntry` | 55–58 |

비배열 필드: `position` (`localePortableText`, 11–13행).

원문 발췌 (grep):
```
17:      name: 'preoccupations',
19:      type: 'array',
21:      of: [
23:          type: 'object',
24:          name: 'preoccupation',
26:            defineField({ name: 'heading', title: 'HEADING', type: 'localeString' }),
27:            defineField({ name: 'body', title: 'BODY', type: 'localeText' }),
36:      name: 'education',
38:      type: 'array',
39:      of: [{ type: 'cvSimpleEntry' }],
42:      name: 'employment',
44:      type: 'array',
46:      of: [{ type: 'cvEmployment' }],
49:      name: 'awards',
51:      type: 'array',
52:      of: [{ type: 'cvRankedEntry' }],
55:      name: 'exhibitions',
57:      type: 'array',
58:      of: [{ type: 'cvVenueEntry' }],
```
`cvEmployment.projects` (감사 260930 §3-5):
```ts
    defineField({
      name: 'projects',
      title: 'PROJECTS',
      type: 'array',
      of: [{ type: 'cvProjectEntry' }],
    }),
```
`grep -n "options" sanity/schemaTypes/about.ts` → **0건** — 배열 필드 5개 모두 `options` 없음(`modal` 등 미설정).
