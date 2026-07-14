# 정보 슬라이드 조판 정리 명세 (260714-B)

## 0. 목적

`INFO_SLIDE_MORPH_SPEC_260714.md` 적용 후 드러난 조판 문제 3건을 정리한다.

| # | 작업 | 파일 |
|---|---|---|
| A | 데스크톱 메타 → 세로 스택 복귀. `INFO_SLIDE_W` 480 → 200 | `ContentArea.tsx` |
| B | 타이틀 블록 ↔ CLIENT 간격 확대 | `ContentArea.tsx` |
| C | 모바일 타이틀 → 히어로 아래로 이동 | `MobileProjectWall.tsx` |

**모바일 2×2 그리드는 현행 유지한다. 손대지 않는다.**

---

## 1. 금지 사항 (Forbidden changes)

1. `useRingWall.ts` — 물리 코어. 접촉 금지.
2. `ProjectWall.tsx` — 데스크톱 월. 접촉 금지.
3. `ContentArea.tsx`의 트랙 스크롤 물리 (`scrollPos`, `dragState`, 플릭, `maxScroll`, `clampScroll`, `isNearCenter`, `centers`) — 접촉 금지.
4. `ContentArea.tsx`의 모프 시퀀스 (`morphing`, `morphVisible`, `morphRect`, `MORPH_MS`, `MORPH_HOLD_MS`, `MORPH_FADE_MS`) — **로직 접촉 금지**. `INFO_SLIDE_W` 값 변경에 따른 종착점 좌표 변화는 기존 수식(`TRACK_INSET + INFO_SLIDE_W + SLIDE_GAP_PX`)이 자동 반영하므로 수식 자체를 고칠 필요가 없다.
5. `ContentArea.tsx`의 `ImageSlideView`, `DiagramSetSlideView`, `CreditsSlideView`, `TextSlideView`, `QuoteSlideView` — 접촉 금지.
6. `MobileProjectWall.tsx`의 링 렌더링·셔플·`useRingWall` 연동 — 접촉 금지.
7. `MobileProjectWall.tsx`의 `MobileInfoSlide` 내부 2×2 그리드 — **현행 유지. 수정 금지.**
8. `MobileProjectWall.tsx`의 `MobileMetaField`, `MobileImageSlide`, `MobileDiagramSetSlide`, `MobileCreditsSlide`, `MobileTextSlide`, `MobileQuoteSlide` — 접촉 금지.
9. `src/lib/projectMeta.ts` (`sizeLabel`, `splitRole`) — 접촉 금지.
10. `SLIDE_H_RATIO`, `DIAGRAM_H_RATIO`, `CREDITS_SLIDE_W`, `TEXT_SLIDE_W`, `QUOTE_SLIDE_W`, `SLIDE_GAP_PX`, `TRACK_INSET` — 값 변경 금지.

---

## 2. 작업 A — 데스크톱 세로 스택 복귀

### 2-1. 폭 복귀 — `ContentArea.tsx`

```ts
const INFO_SLIDE_W = 200     // 세로 스택 — 수평 4열 폐기 (260714-B)
```

**파급 (자동 반영, 수정 불필요):**
- `rects[0].w` = 200 → 트랙 첫 자식 폭 자동 축소
- 모프 종착점 `left = TRACK_INSET + INFO_SLIDE_W + SLIDE_GAP_PX` = 248 → 히어로가 원래 위치로 복귀
- `centers`, `maxScroll` 자동 재계산

### 2-2. 메타 렌더 교체 — 수평 4열 → 세로 스택

정보 슬라이드 내부의 **2블록(수평 4열)** 을 세로 스택으로 교체한다.

**삭제 대상** — 다음 블록 전체:

```tsx
                    {/* 2블록 — TYPOLOGY / SIZE / STATUS / YEAR 수평 4열 */}
                    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                      <div style={{ flex: '1 1 0', minWidth: 0 }}>
                        <MetaField label="TYPOLOGY" value={project.type} />
                      </div>
                      <div style={{ flex: '1 1 0', minWidth: 0 }}>
                        <MetaField
                          label={project.size ? sizeLabel(project.size) : 'SIZE'}
                          value={project.size}
                        />
                      </div>
                      <div style={{ flex: '0 1 auto', minWidth: 0 }}>
                        <MetaField label="STATUS" value={project.status} />
                      </div>
                      <div style={{ flex: '0 0 auto' }}>
                        <MetaField label="YEAR" value={String(project.year)} />
                      </div>
                    </div>
```

**교체:**

```tsx
                    {/* 2블록 — TYPOLOGY / SIZE / STATUS / YEAR 세로 스택 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <MetaField label="TYPOLOGY" value={project.type} />
                      <MetaField
                        label={project.size ? sizeLabel(project.size) : 'SIZE'}
                        value={project.size}
                      />
                      <MetaField label="STATUS" value={project.status} />
                      <MetaField label="YEAR" value={String(project.year)} />
                    </div>
```

**주:** `MetaField` 컴포넌트 자체는 수정하지 않는다. `whiteSpace: 'nowrap'`이 라벨에만 걸려 있고 값은 `wordBreak: 'keep-all'`이므로, 200px 폭에서도 `Housing and Urbanism`이 2줄로 안착한다.

### 2-3. 정보 슬라이드 컨테이너 — 타이틀 크기 조정

`INFO_SLIDE_W`가 200으로 좁아졌으므로 타이틀 `fontSize: 20`은 과대하다. **16으로 낮춘다.**

정보 슬라이드 내 타이틀 `<div>`:

```tsx
                      <div style={{
                        fontSize: 16,          // 20 → 16 (200px 폭 대응)
                        fontWeight: 500,
                        lineHeight: 1.35,
                        letterSpacing: '-0.01em',
                        wordBreak: 'keep-all',
                      }}>
                        {project.title}
                      </div>
```

---

## 3. 작업 B — 타이틀 ↔ CLIENT 간격

### 3-1. 문제

현행 정보 슬라이드 컨테이너는 `gap: 28`로 **전 블록에 균일 적용**된다. 타이틀 블록과 CLIENT 사이만 벌리려면 컨테이너 gap을 키울 수 없다 — CLIENT↔메타↔ROLE 간격까지 함께 벌어진다.

### 3-2. 해결

컨테이너 `gap`을 낮추고, 타이틀 블록에만 `marginBottom`을 부여한다.

**정보 슬라이드 컨테이너 style 수정:**

```tsx
                  <div style={{
                    width: INFO_SLIDE_W,
                    flexShrink: 0,
                    height: slideH,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    gap: 24,               // 28 → 24 (블록 간 기본 간격)
                    fontFamily: FONT,
                    color: '#080706',
                    opacity: infoIn ? 1 : 0,
                    transition: 'opacity 400ms ease',
                    boxSizing: 'border-box',
                    overflowY: 'auto',
                  }}>
```

**타이틀 블록 래퍼에 marginBottom 추가:**

```tsx
                    {/* 타이틀 + LOCATION — 한 세트. 아래 메타군과 시각적으로 분리 */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 16, ... }}>
                        {project.title}
                      </div>
                      {project.location && ( ... )}
                    </div>
```

**결과 간격:** 타이틀 블록 → CLIENT = `gap 24 + marginBottom 20` = **44px**. 나머지 블록 간 = 24px.

---

## 4. 작업 C — 모바일 타이틀 이동

### 4-1. 현행 구조 (`ExpandedBlock`, 450–539행)

```
<div>
  [BACK 버튼]          ← titleMorphing 시 opacity 0
  [타이틀 행]          ← titleRef. FLIP 모프 종착점
  <div 세로 스택>
    [① 히어로]         ← heroRef. 성장 모프 종착점
    [② MobileInfoSlide]
    [③ 이후 슬라이드들]
  </div>
</div>
```

타이틀이 히어로 **위**에 있다.

### 4-2. 목표 구조

```
<div>
  [BACK 버튼]
  <div 세로 스택>
    [① 히어로]
    [타이틀 행]        ← 히어로 직후로 이동
    [② MobileInfoSlide]
    [③ 이후 슬라이드들]
  </div>
</div>
```

### 4-3. 변경 지시

**삭제 대상** — 현행 478–498행의 타이틀 행 전체(`{/* 타이틀 행 — 2줄 허용 ... */}` 주석 포함):

```tsx
      {/* 타이틀 행 — 2줄 허용. 보간 중에는 오버레이가 대신 렌더 (transition 없이 즉시 교대) */}
      <div
        ref={titleRef}
        style={{
          padding: '0 16px',
          marginBottom: 12,
          fontFamily: FONT,
          fontSize: 16,
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
        {project.title}
      </div>
```

**삽입 위치** — 세로 스택 내부, 히어로 `</div>` 직후 / `<MobileInfoSlide>` 직전:

```tsx
        {/* 타이틀 행 — 히어로 직후. 보간 중에는 오버레이가 대신 렌더 */}
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
            marginTop: -SLIDE_GAP + 12,   // 히어로와의 간격을 좁힌다 (히어로와 한 세트로 읽힌다)
          }}
        >
          {project.title}
        </div>
```

**변경점 명시:**
- `padding: '0 16px'` **제거** — 세로 스택 컨테이너가 이미 `marginLeft/Right: 16`을 갖는다. 유지하면 이중 인셋(32px)이 된다
- `marginBottom: 12` **제거** — 세로 스택의 `gap: SLIDE_GAP`(24)이 대신 적용된다
- `marginTop: -SLIDE_GAP + 12` **추가** — 세로 스택 gap 24를 상쇄해 히어로↔타이틀 간격을 12px로 좁힌다. 타이틀은 독립 슬라이드가 아니라 히어로의 캡션이므로, 슬라이드 간 간격과 같으면 안 된다
- `fontSize: 16 → 18` — 히어로 아래 캡션 위치에서는 타이틀이 시각적 앵커가 되므로 키운다

### 4-4. FLIP 모프 종착점 — 자동 반영 확인

타이틀 FLIP 모프는 `title.getBoundingClientRect()`로 종착점을 **런타임 측정**한다(895행 부근):

```ts
to: { top: title.getBoundingClientRect().top, left: 16, fontSize: 16, fontWeight: 600 },
```

타이틀 DOM 위치가 바뀌면 `getBoundingClientRect()`도 자동으로 새 위치를 반환하므로, **모프 로직 수정은 불필요**하다.

**단, `fontSize: 16`이 하드코딩되어 있다.** 4-3에서 실제 타이틀을 18로 키웠으므로, 모프 종착 폰트 크기도 **18로 맞춰야** 모프 완료 시점에 크기 점프가 발생하지 않는다.

**변경 지시:** `MobileProjectWall.tsx` 내에서 `fontSize: 16, fontWeight: 600`을 포함하는 모프 종착점 객체를 **전부** 찾아 `fontSize: 18`로 교체한다.

**참조 지점 열거 (grep으로 전수 확인할 것):**
- 895행 부근 — BACK 복귀 시 `to:` 객체
- 930행 부근 — `pending.titleFrom` 관련 `title:` 객체
- 그 외 `fontSize: 16` + `fontWeight: 600` 조합이 나타나는 모든 곳

**주의:** `fontSize: 16`이 타이틀 모프와 무관한 다른 요소(예: 필터 칩, 헤더)에도 쓰일 수 있다. `fontWeight: 600`과 함께 나타나고 타이틀 모프 컨텍스트에 있는 것만 교체한다. 판단이 서지 않으면 해당 지점을 보고하고 중단할 것.

### 4-5. `MobileInfoSlide` — LOCATION 간격

타이틀이 바로 위로 왔으므로, `MobileInfoSlide` 최상단의 LOCATION은 타이틀과 한 세트로 읽혀야 한다.

`MobileInfoSlide` 컨테이너 style에서 `marginTop`을 추가해 세로 스택 gap을 상쇄한다.

```tsx
    <div style={{
      width: '100%',
      padding: '4px 0',
      marginTop: -SLIDE_GAP + 6,     // 타이틀과 LOCATION을 한 세트로 붙인다
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      fontFamily: FONT,
      color: '#080706',
    }}>
```

**결과 조판:**
```
[히어로]
  12px
Orion New Office          ← 18px, 600
  6px
SEOUL, KR                 ← 10px, uppercase, opacity 0.6
  16px
CLIENT
  —
  16px
[2×2 그리드]
  16px
ROLE
  ...
```

**주:** LOCATION↔CLIENT 간격(16px)이 타이틀↔LOCATION(6px)보다 크므로, "타이틀+LOCATION"이 한 세트로, CLIENT 이하가 별개 정보군으로 읽힌다. 데스크톱의 44px 분리와 같은 원리이나, 모바일은 세로 공간이 귀하므로 값을 줄였다.

---

## 5. 검증

**허용된 검증 수단:**
```
npx tsc --noEmit
```

`npm run dev` / `npm run build`는 실행하지 않는다.

**절차:**
1. 전 절 적용 후 `npx tsc --noEmit` 통과 확인
2. 4-4절의 `fontSize: 16` 참조 지점 grep 결과를 **목록으로 보고**할 것. 교체한 지점과 교체하지 않은 지점을 구분해 제시한다

---

## 6. 체크리스트

- [ ] `ContentArea.tsx`: `INFO_SLIDE_W` 480 → 200
- [ ] `ContentArea.tsx`: 수평 4열 블록 삭제 → 세로 스택 교체
- [ ] `ContentArea.tsx`: 타이틀 `fontSize` 20 → 16
- [ ] `ContentArea.tsx`: 컨테이너 `gap` 28 → 24, 타이틀 블록 `marginBottom: 20` 추가
- [ ] `MobileProjectWall.tsx`: 타이틀 행 삭제 (BACK 아래) → 세로 스택 내 히어로 직후로 이동
- [ ] `MobileProjectWall.tsx`: 타이틀 `padding`/`marginBottom` 제거, `marginTop` 추가, `fontSize` 18
- [ ] `MobileProjectWall.tsx`: 모프 종착점 `fontSize: 16` → 18 (참조 지점 전수 확인 후 보고)
- [ ] `MobileProjectWall.tsx`: `MobileInfoSlide` 컨테이너 `marginTop: -SLIDE_GAP + 6` 추가
- [ ] `npx tsc --noEmit` 통과
