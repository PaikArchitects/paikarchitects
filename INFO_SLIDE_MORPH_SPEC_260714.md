# 정보 슬라이드 재편 · 모프 크로스페이드 명세 (260714)

## 0. 목적

3개 작업을 하나의 명세로 묶는다. 모두 `ContentArea.tsx`를 접촉하므로 분리 실행 시 충돌한다.

| # | 작업 | 계층 |
|---|---|---|
| A | 진입 모프 깜빡임 제거 | 렌더러(D) |
| B | 정보 슬라이드 재편 — 타이틀 이동 + 3블록 메타 + `role` 신설 | 스키마 + 타입 + 쿼리 + 렌더러(D/M) |
| C | `ProjectStatus` 유니온 정본화 + 데이터 마이그레이션 | 타입 + 스크립트 |

---

## 1. 금지 사항 (Forbidden changes)

1. `useRingWall.ts` — 물리 코어. 접촉 금지.
2. `ProjectWall.tsx` — 데스크톱 월. 접촉 금지.
3. `ContentArea.tsx`의 트랙 스크롤 물리 (`scrollPos`, `dragState`, 플릭, `maxScroll`, `clampScroll`, `isNearCenter`, `centers`, `nearest`) — 접촉 금지.
4. `ContentArea.tsx`의 `DiagramSetSlideView`, `ImageSlideView`, `CreditsSlideView`, `TextSlideView`, `QuoteSlideView` — 접촉 금지.
5. `MobileProjectWall.tsx`의 링 렌더링·FLIP 모프·셔플 로직 — 접촉 금지.
6. `MORPH_MS` 값(700) 변경 금지.
7. `SLIDE_H_RATIO`, `DIAGRAM_H_RATIO`, `CREDITS_SLIDE_W`, `TEXT_SLIDE_W`, `QUOTE_SLIDE_W`, `SLIDE_GAP_PX`, `TRACK_INSET` 값 변경 금지.
8. **`INFO_SLIDE_W`만 변경 대상이다** (200 → 480). 다른 폭 상수는 손대지 않는다.

---

## 2. 작업 C — `ProjectStatus` 정본화

### 2-1. 타입 — `src/types/index.ts`

**삭제 대상:** 현행 `ProjectStatus` 유니온 전체

```ts
export type ProjectStatus =
  | 'Completed'
  | 'In Progress'
  | 'Competition'
  | 'Published'
  | 'Under Construction'
```

**교체:** Career_260707.xlsx 원본 표기를 정본으로 삼는다.

```ts
/** Career_260707.xlsx 'Status' 열 표기 정본. 연도는 year 필드가 별도 보유 */
export type ProjectStatus =
  | 'Idea'                 // 낙선·미실현 (Excel 최다 값)
  | 'In progress'
  | 'Under construction'
  | 'Completed'
  | 'Published'
```

**참조 지점 열거 — 반드시 전부 확인한다.** `'Competition'`, `'In Progress'`, `'Under Construction'` 리터럴을 참조하는 모든 곳:

1. `src/types/index.ts` — 유니온 정의 (위)
2. `sanity/schemas/` — `project` 스키마의 `status` 필드 `options.list` 배열. 값 5종을 새 리터럴로 교체
3. 필터·정렬·조건문에서 status 리터럴을 비교하는 코드 — **grep으로 전수 확인할 것**

**진단 기법:** 유니온을 먼저 교체하고 `npx tsc --noEmit`을 실행하면, 구 리터럴을 참조하는 모든 지점이 타입 오류로 드러난다. 오류가 0건이면 참조 지점이 유니온 정의뿐이라는 뜻이다. 오류 지점을 전부 보고할 것.

### 2-2. 마이그레이션 스크립트 — `scripts/migrate-status.ts` 신설

```ts
/**
 * ProjectStatus 정본화 마이그레이션 (1회성)
 *
 * 실행:
 *   SANITY_WRITE_TOKEN=<token> npx tsx scripts/migrate-status.ts
 *
 * 토큰 발급: sanity.io/manage → API → Tokens → Editor 권한
 * 실행 후 이 파일은 삭제해도 무방하다.
 */
import { createClient } from '@sanity/client'

const token = process.env.SANITY_WRITE_TOKEN
if (!token) {
  console.error('SANITY_WRITE_TOKEN 환경변수가 필요합니다.')
  process.exit(1)
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

const MAP: Record<string, string> = {
  'Competition': 'Idea',
  'In Progress': 'In progress',
  'Under Construction': 'Under construction',
  // Completed·Published는 표기 동일 — 변환 불필요
}

async function main() {
  const docs = await client.fetch<{ _id: string; title: string; status: string }[]>(
    `*[_type == "project"]{ _id, title, status }`
  )

  const targets = docs.filter(d => d.status in MAP)
  console.log(`총 ${docs.length}건 중 ${targets.length}건 변환 대상`)

  if (targets.length === 0) {
    console.log('변환할 문서가 없습니다.')
    return
  }

  let tx = client.transaction()
  for (const d of targets) {
    const next = MAP[d.status]
    console.log(`  ${d.title}: ${d.status} → ${next}`)
    tx = tx.patch(d._id, p => p.set({ status: next }))
  }

  await tx.commit()
  console.log('완료. Studio에서 값을 확인하십시오.')

  // 잔존 확인 — 새 유니온에 없는 값 검출
  const after = await client.fetch<string[]>(
    `array::unique(*[_type == "project"].status)`
  )
  const VALID = ['Idea', 'In progress', 'Under construction', 'Completed', 'Published']
  const invalid = after.filter(s => !VALID.includes(s))
  if (invalid.length > 0) {
    console.warn('경고 — 유니온에 없는 status 값이 남아 있습니다:', invalid)
  } else {
    console.log('검증 통과 — 모든 status가 유니온에 속합니다.')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
```

**실행 순서 주의:** 스키마의 `options.list`를 새 값으로 바꾸면 Studio는 기존 문서의 구 값을 "허용되지 않은 값"으로 표시하지만, **문서 자체는 변하지 않는다**. 따라서 스크립트를 먼저 돌리고 스키마를 바꾸든, 반대 순서든 상관없다. 다만 둘 다 해야 한다.

**주의:** 스크립트 실행 시 Sanity 웹훅이 발동해 Vercel 재빌드가 걸릴 수 있다. 정상 동작이다.

---

## 3. 작업 B-1 — `role` 필드 신설

### 3-1. Sanity 스키마 — `project` 스키마

`size` 필드 **뒤에** 추가한다.

```ts
    defineField({
      name: 'role',
      title: '역할',
      type: 'string',
      description: 'Career 엑셀 Role 열 원문. 형식: 직위 (담당업무1, 담당업무2, ...) — 예: Senior Architect (Concept design, 3d modeling, Visual documentation)',
    }),
```

### 3-2. `size` 필드 description 갱신

기존 `size` 필드의 `description`을 다음으로 교체한다. **단위를 값에 포함시키는 규약**을 스키마에 명문화한다 — 스키마 description은 명세 문서가 소실되어도 살아남는 항구적 계약이다.

```ts
      description: '단위를 포함해 입력한다. 면적: "22,333.78 ㎡" / 영상: "5 min." / 판형: "A2". 라벨(AREA·LENGTH·SIZE)은 값에서 자동 파생되므로 별도 지정하지 않는다.',
```

### 3-3. 타입 — `src/types/index.ts`

`Project` 인터페이스에 추가:

```ts
  role?: string           // Career 엑셀 Role 원문. "직위 (업무1, 업무2)" 형식
```

`size` 주석 갱신:

```ts
  size?: string            // 규모 — 단위 포함 자유 표기. "22,333.78 ㎡" / "5 min." / "A2"
```

### 3-4. 쿼리 — `src/lib/queries.ts`

**3지점 모두 수정한다.**

1. `PROJECTS_QUERY` — `coverColor, location, client, size,` → `coverColor, location, client, size, role,`
2. `RawProject` 인터페이스 — `size: string | null` 아래에 `role: string | null` 추가
3. `getProjects`의 매핑 — `size: r.size ?? undefined,` 아래에 `role: r.role ?? undefined,` 추가

---

## 4. 작업 A — 모프 크로스페이드

### 4-1. 원인 (확인 완료)

- 트랙은 `{!morphing && (...)}` 조건으로 렌더된다 → **모프 중 미마운트**
- `MORPH_MS`(700ms) 만료 시 `setMorphing(false)` → 같은 프레임에 모프 `<img>` 언마운트 + 트랙 히어로 `<img>` 최초 마운트
- 트랙은 `trackIn` opacity 0 → 1, 400ms 페이드인
- 결과: 700ms 시점에 안착해 있던 이미지가 사라지고, 새 이미지가 opacity 0에서 400ms에 걸쳐 나타난다. 재로드가 아니라 **설계된 페이드가 깜빡임으로 발현**된 것

URL은 idle·모프·트랙 히어로 모두 `project.coverImage` 원본으로 동일하다. 재요청은 없다.

### 4-2. 해결 구조

`morphing`(트랙 마운트 제어)과 `morphVisible`(모프 레이어 표시 제어)을 **분리**한다.

```
t=0      morphing=true,  morphVisible=true
         → 트랙 마운트 (trackIn=0, 비가시). 히어로 <img> 디코딩 선행
         → 모프 레이어 풀블리드
t=0+2raf morphRect → 히어로 종착점. 700ms 트랜지션
t=700    morphing=false → trackIn=1 페이드인(400ms) 시작
         morphVisible은 여전히 true — 모프 <img>가 히어로 위에 겹쳐 유지
t=1100   trackIn 완료 → morphVisible=false. 모프 레이어 250ms 페이드아웃 후 언마운트
```

히어로가 opacity 0→1로 올라오는 동안 그 위를 모프 이미지가 opacity 1로 덮는다. **동일 URL·동일 rect이므로 시각적으로 완전히 동일**하다. 교대 순간이 존재하지 않는다.

### 4-3. 상수 추가

`MORPH_MS` 아래:

```ts
const MORPH_HOLD_MS = 400    // 모프 완료 후 모프 레이어 유지 — 트랙 페이드인(400ms)을 덮는다
const MORPH_FADE_MS = 250    // 모프 레이어 페이드아웃
```

### 4-4. 상태 추가

`const [morphRect, setMorphRect] = useState<MorphRect | null>(null)` 아래:

```ts
  const [morphVisible, setMorphVisible] = useState(false)   // 모프 레이어 표시 — morphing과 분리 (크로스페이드)
```

### 4-5. 모프 시퀀스 교체

`useEffect(() => { ... }, [mode])` (현행 428–476행) 내부를 다음으로 교체한다.

```ts
    if (mode === 'active' && prev === 'idle' && rootRef.current) {
      setScrollPos(0)
      setAnimated(false)
      const rw = rootRef.current.clientWidth
      const rh = rootRef.current.clientHeight
      const img = idleImgEl.current
      const aspect = img && img.naturalWidth > 0 && img.naturalHeight > 0
        ? img.naturalWidth / img.naturalHeight
        : FALLBACK_RATIO
      const th = rh * SLIDE_H_RATIO
      const tw = th * aspect

      setMorphing(true)
      setMorphVisible(true)
      setMorphRect({ top: 0, left: 0, width: rw, height: rh })

      let cancelled = false
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (cancelled) return
        // 히어로는 트랙 index 1 — 루트 기준 좌측 = 클립 인셋 + 정보 슬라이드 + gap
        setMorphRect({
          top: (rh - th) / 2,
          left: TRACK_INSET + INFO_SLIDE_W + SLIDE_GAP_PX,
          width: tw,
          height: th,
        })
      }))

      // 1) 모프 종료 → 트랙 페이드인 시작. 모프 레이어는 아직 유지
      const tMorph = setTimeout(() => setMorphing(false), MORPH_MS)
      // 2) 트랙 페이드인 완료 → 모프 레이어 페이드아웃 개시
      const tHold = setTimeout(() => setMorphVisible(false), MORPH_MS + MORPH_HOLD_MS)
      // 3) 페이드아웃 완료 → rect 해제 (언마운트)
      const tFade = setTimeout(() => setMorphRect(null), MORPH_MS + MORPH_HOLD_MS + MORPH_FADE_MS)

      return () => {
        cancelled = true
        clearTimeout(tMorph)
        clearTimeout(tHold)
        clearTimeout(tFade)
      }
    }

    if (mode === 'idle') {
      // Back은 역방향 모프 없이 즉시 전환
      setMorphing(false)
      setMorphVisible(false)
      setMorphRect(null)
      setScrollPos(0)
      setAnimated(false)
      setDiagramHover(false)
      setCursor(null)
    }
```

**주의:** `aspect` 폴백을 `4 / 3` 리터럴에서 `FALLBACK_RATIO` 상수로 교체했다. 값은 동일하다.

### 4-6. 트랙 마운트 조건 — **삭제 지시**

현행 680행:
```tsx
            {!morphing && (
```

**이 조건을 제거한다.** 트랙은 항상 마운트된다. 대응하는 닫는 괄호 `)}`(현행 774행)도 함께 제거하고, 내부의 페이드 래퍼 `<div>`가 직접 자식이 되게 한다.

**즉:**
```tsx
            {!morphing && (
              <div style={{ height: '100%', opacity: trackIn ? 1 : 0, ... }}>
                ...
              </div>
            )}
```
→
```tsx
            <div style={{ height: '100%', opacity: trackIn ? 1 : 0, ... }}>
              ...
            </div>
```

`trackIn`이 모프 중 `false`이므로(현행 489–497행 useEffect가 `morphing`을 의존) 트랙은 비가시 상태로 마운트된다. **이 useEffect는 수정하지 않는다** — `morphing` 의존이 그대로 유효하다.

### 4-7. 모프 레이어 렌더 조건 교체 — **삭제 지시**

현행 841행:
```tsx
      {morphing && morphRect && (
```

**교체:**
```tsx
      {morphRect && (
```

`morphing`은 더 이상 모프 레이어의 표시를 제어하지 않는다. `morphRect`의 존재 여부가 마운트를, `morphVisible`이 opacity를 제어한다.

### 4-8. 모프 레이어 스타일 — opacity 추가

`<img>`와 `<div>` 양쪽 모두의 style에 다음을 추가한다. **두 분기 모두 수정한다** (coverImage 있음 / coverColor 폴백).

```tsx
              opacity: morphVisible ? 1 : 0,
              transition: `all ${MORPH_MS}ms ${EASE}, opacity ${MORPH_FADE_MS}ms ease-out`,
```

**기존 `transition: `all ${MORPH_MS}ms ${EASE}`` 를 위 2행으로 교체한다.** `all` 뒤에 `opacity` 항목을 명시적으로 덧붙여, opacity만 더 짧은 지속시간과 다른 이징을 갖게 한다. CSS transition은 후행 항목이 우선하므로 opacity는 250ms/ease-out으로 동작한다.

---

## 5. 작업 B-2 — 정보 슬라이드 재편

### 5-1. 폭 확대

```ts
const INFO_SLIDE_W = 480     // 메타 4열 수평 배열 최소 폭 (Housing and Urbanism 기준)
```

**파급 (의도된 결과):** 모프 종착점 `left = TRACK_INSET + INFO_SLIDE_W + SLIDE_GAP_PX`가 248 → 528로 이동한다. 히어로 이미지가 우측으로 280px 이동해 안착한다. `rects` 계산도 자동 반영된다 — 별도 수정 불필요.

### 5-2. 파생 헬퍼 — `splitCaption` 아래에 추가

```ts
// ── SIZE 라벨 파생 — 값의 순수 함수. 별도 필드를 두지 않는다 ──
// Career 엑셀 Size 열은 면적 외에도 러닝타임("5 min.")·판형("A2")을 담는다.
// Studio 입력값에 단위가 포함되므로, 판정 근거가 값 안에 있다.
function sizeLabel(size: string): string {
  if (/\d\s*(min|sec)\b/i.test(size)) return 'LENGTH'
  if (/㎡|m²|sqm/i.test(size)) return 'AREA'
  return 'SIZE'
}

// ── ROLE 분해 — "직위 (업무1, 업무2)" → { position, tasks } ──
// 괄호가 없으면 전체를 직위로 취급한다 (폴백).
function splitRole(role: string): { position: string; tasks: string } {
  const m = role.match(/^([^(]+)\((.+)\)\s*$/)
  if (!m) return { position: role.trim(), tasks: '' }
  return { position: m[1].trim(), tasks: m[2].trim() }
}
```

### 5-3. 정보 슬라이드 렌더 — 전면 교체

현행 699–732행(트랙 첫 자식 `<div>`)을 다음으로 교체한다.

```tsx
                  {/* 트랙 첫 자식 — 정보 슬라이드. 타이틀 + LOCATION + 3블록 메타 */}
                  <div style={{
                    width: INFO_SLIDE_W,
                    flexShrink: 0,
                    height: slideH,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    gap: 28,
                    fontFamily: FONT,
                    color: '#080706',
                    opacity: infoIn ? 1 : 0,
                    transition: 'opacity 400ms ease',
                    boxSizing: 'border-box',
                    overflowY: 'auto',
                  }}>
                    {/* 타이틀 + LOCATION — 한 세트 */}
                    <div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 500,
                        lineHeight: 1.3,
                        letterSpacing: '-0.01em',
                        wordBreak: 'keep-all',
                      }}>
                        {project.title}
                      </div>
                      {project.location && (
                        <div style={{
                          marginTop: 8,
                          fontSize: 11,
                          fontWeight: 300,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          opacity: 0.6,
                        }}>
                          {project.location}
                        </div>
                      )}
                    </div>

                    {/* 1블록 — CLIENT */}
                    <MetaField label="CLIENT" value={project.client} />

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

                    {/* 3블록 — ROLE. 직위 + 업무 2단 */}
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 300, letterSpacing: '0.1em', opacity: 0.45 }}>
                        ROLE
                      </div>
                      {project.role ? (() => {
                        const { position, tasks } = splitRole(project.role)
                        return (
                          <>
                            <div style={{
                              fontSize: 11,
                              fontWeight: 400,
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              marginTop: 3,
                            }}>
                              {position}
                            </div>
                            {tasks && (
                              <div style={{
                                fontSize: 9,
                                fontWeight: 300,
                                lineHeight: 1.6,
                                opacity: 0.5,
                                marginTop: 4,
                                wordBreak: 'keep-all',
                              }}>
                                {tasks}
                              </div>
                            )}
                          </>
                        )
                      })() : (
                        <div style={{ fontSize: 11, fontWeight: 400, marginTop: 3, opacity: 0.25 }}>—</div>
                      )}
                    </div>
                  </div>
```

### 5-4. `MetaField` 컴포넌트 신설

`SlideContent` 정의 **앞에** 추가한다.

```tsx
// ── 메타 필드 — 라벨 + 값. 값이 없으면 em dash 자리표시 (공란 유지 요건) ──
function MetaField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div style={{
        fontSize: 9,
        fontWeight: 300,
        letterSpacing: '0.1em',
        opacity: 0.45,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 11,
        fontWeight: 400,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        marginTop: 3,
        lineHeight: 1.4,
        wordBreak: 'keep-all',
        opacity: value ? 1 : 0.25,
      }}>
        {value || '—'}
      </div>
    </div>
  )
}
```

**공란 처리:** 사용자 요건은 "공란은 놔두세요". 필드를 숨기지 않고 라벨은 유지하되, 값 자리에 em dash(`—`)를 opacity 0.25로 둔다. 4열 수평 배열에서 필드를 숨기면 열 정렬이 무너지므로, 자리표시가 필수다.

### 5-5. 좌상단 오버레이 — 타이틀 제거

현행 798–836행의 오버레이에서 **타이틀 `<div>`만 제거**한다. BACK 버튼은 현 위치·현 스타일 그대로 유지한다.

**삭제 대상:**
```tsx
            {/* 프로젝트 타이틀 — 항상 한 줄 */}
            <div style={{
              marginTop: 12,
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.35,
              whiteSpace: 'nowrap',
            }}>
              {project.title}
            </div>
```

오버레이 래퍼 `<div>`(`position: absolute; top: 32; left: 24; zIndex: 6`)는 BACK 버튼을 담기 위해 **유지**한다.

**주의:** idle 모드의 하단 타이틀 오버레이(현행 627–644행, `bottom: 24`)는 **손대지 않는다**. 이것은 idle 상태의 커버 위 타이틀이며, active 진입 후의 좌상단 타이틀과 별개다.

---

## 6. 작업 B-3 — 모바일 정보 슬라이드

### 6-1. `MobileInfoSlide` 재편 — `MobileProjectWall.tsx` 231행 이하

모바일은 세로 스택이므로 **수평 4열을 적용하지 않는다**. 폭 100%에서 4열은 각 열이 25%가 되어 값이 전부 접힌다. 세로 스택 유지.

`MobileInfoSlide` 내부의 메타 렌더를 다음 순서로 재편한다. 타이틀은 모바일에서 이미 히어로 하단 확장 블록에 있으므로 **추가하지 않는다** (기존 구조 유지 — 확인 후 판단할 것).

```tsx
function MobileInfoSlide({ project }: { project: Project }) {
  const roleParts = project.role ? splitRole(project.role) : null
  return (
    <div style={{
      width: '100%',
      padding: '4px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      fontFamily: FONT,
      color: '#080706',
    }}>
      {project.location && (
        <div style={{
          fontSize: 10,
          fontWeight: 300,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          opacity: 0.6,
        }}>
          {project.location}
        </div>
      )}

      <MobileMetaField label="CLIENT" value={project.client} />

      {/* 모바일은 2×2 그리드 — 4열 수평은 폭이 부족하다 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <MobileMetaField label="TYPOLOGY" value={project.type} />
        <MobileMetaField
          label={project.size ? sizeLabel(project.size) : 'SIZE'}
          value={project.size}
        />
        <MobileMetaField label="STATUS" value={project.status} />
        <MobileMetaField label="YEAR" value={String(project.year)} />
      </div>

      <div>
        <div style={{ fontSize: 8, fontWeight: 300, letterSpacing: '0.1em', opacity: 0.45 }}>
          ROLE
        </div>
        {roleParts ? (
          <>
            <div style={{
              fontSize: 10,
              fontWeight: 400,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginTop: 3,
            }}>
              {roleParts.position}
            </div>
            {roleParts.tasks && (
              <div style={{
                fontSize: 9,
                fontWeight: 300,
                lineHeight: 1.6,
                opacity: 0.5,
                marginTop: 3,
                wordBreak: 'keep-all',
              }}>
                {roleParts.tasks}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 10, marginTop: 3, opacity: 0.25 }}>—</div>
        )}
      </div>
    </div>
  )
}

// ── 모바일 메타 필드 ──
function MobileMetaField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div style={{
        fontFamily: FONT,
        fontSize: 8,
        fontWeight: 300,
        letterSpacing: '0.1em',
        opacity: 0.45,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: 400,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        marginTop: 2,
        lineHeight: 1.4,
        wordBreak: 'keep-all',
        opacity: value ? 1 : 0.25,
      }}>
        {value || '—'}
      </div>
    </div>
  )
}
```

### 6-2. 헬퍼 공유

`sizeLabel`과 `splitRole`이 `ContentArea.tsx`와 `MobileProjectWall.tsx` 양쪽에서 필요하다. **중복 정의하지 말고** `src/lib/projectMeta.ts`를 신설해 두 함수를 export하고, 양쪽에서 import한다.

```ts
// src/lib/projectMeta.ts

/** SIZE 라벨 파생 — 값의 순수 함수. Career 엑셀 Size 열은 면적·러닝타임·판형을 모두 담는다 */
export function sizeLabel(size: string): string {
  if (/\d\s*(min|sec)\b/i.test(size)) return 'LENGTH'
  if (/㎡|m²|sqm/i.test(size)) return 'AREA'
  return 'SIZE'
}

/** ROLE 분해 — "직위 (업무1, 업무2)" → { position, tasks }. 괄호 없으면 전체를 직위로 */
export function splitRole(role: string): { position: string; tasks: string } {
  const m = role.match(/^([^(]+)\((.+)\)\s*$/)
  if (!m) return { position: role.trim(), tasks: '' }
  return { position: m[1].trim(), tasks: m[2].trim() }
}
```

**5-2절의 지시를 이것으로 대체한다.** `ContentArea.tsx`에는 정의하지 말고 import만 한다.

---

## 7. 검증

**허용된 검증 수단:**
```
npx tsc --noEmit
```

`npm run dev` / `npm run build`는 실행하지 않는다.

**단계적 절차:**
1. 2-1절(`ProjectStatus` 유니온 교체)만 먼저 적용 → `npx tsc --noEmit`
2. 구 리터럴(`'Competition'`, `'In Progress'`, `'Under Construction'`)을 참조하는 모든 지점이 오류로 드러난다. **오류 지점을 전부 목록으로 보고할 것.** 스키마의 `options.list`는 문자열 배열이라 타입 체크에 걸리지 않을 수 있으므로, grep으로 별도 확인한다
3. 나머지 절 적용 → `npx tsc --noEmit` 통과 확인
4. 마이그레이션 스크립트는 **실행하지 않는다** — 파일만 생성한다. 사용자가 토큰과 함께 직접 실행한다

---

## 8. 체크리스트

- [ ] `types/index.ts`: `ProjectStatus` 유니온 5종 교체, `Project.role?` 추가, `size` 주석 갱신
- [ ] 구 status 리터럴 참조 지점 grep 전수 확인 및 보고
- [ ] `sanity/schemas/`: `status` 필드 `options.list` 5종 교체, `role` 필드 신설, `size` description 갱신
- [ ] `scripts/migrate-status.ts` 신설 (실행하지 않음)
- [ ] `queries.ts`: `role` 3지점 추가 (GROQ / RawProject / 매핑)
- [ ] `src/lib/projectMeta.ts` 신설 — `sizeLabel`, `splitRole`
- [ ] `ContentArea.tsx`: `INFO_SLIDE_W` 480, `MORPH_HOLD_MS`/`MORPH_FADE_MS` 상수, `morphVisible` 상태, 모프 시퀀스 교체, 트랙 마운트 조건 제거, 모프 레이어 조건·opacity 교체, `MetaField` 신설, 정보 슬라이드 전면 교체, 좌상단 타이틀 제거
- [ ] `MobileProjectWall.tsx`: `MobileInfoSlide` 재편, `MobileMetaField` 신설
- [ ] `npx tsc --noEmit` 통과
