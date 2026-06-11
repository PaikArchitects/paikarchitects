# CONTENT_FLOW_SPEC — 화이트 셸 + BIG식 연속 슬라이드 트랙 전면 개편

## 범위
1. 화이트 셸 (검은 배경 제거)
2. 프로젝트 월 너비 축소
3. Idle→Active 부드러운 모프 전환 + 좌측 정보 컬럼
4. 연속 트랙 (스냅 제거, 자유 드래그)
5. 커서 추적 화살표 (외부 + 다이어그램 내부)
6. 슬라이드 높이 통일 (이미지 90% / 다이어그램 60%)

수정 파일: `src/app/page.tsx`, `src/components/ProjectWall.tsx`, `src/components/ContentArea.tsx`
검증: `npx tsc --noEmit`

---

## 1. 화이트 셸 (page.tsx)

```typescript
// 루트 컨테이너: BEFORE
background: '#080706',
// AFTER
background: '#FFFFFF',
```

헤더 존(상단 64px)과 월-콘텐츠 갭(16px)이 모두 흰색이 된다.

색상 로직 복원 — 헤더 존이 흰 배경이 되므로:
```typescript
// BEFORE
setWordmarkOnLight(false)
setNavOnLight(false)
// AFTER — 랜딩 헤더는 항상 흰 배경 위
setWordmarkOnLight(layoutVisible)
setNavOnLight(layoutVisible)
```

Idle 셔플 암전(블랙 오버레이)은 이미지 위 연출이므로 유지한다.

## 2. 프로젝트 월 너비 (ProjectWall.tsx)

```typescript
// BEFORE
width: '33.333vw',
// AFTER
width: '28vw',
```

카드 내부 구조·타이포는 수정하지 않는다 (디자인 디벨롭은 별도 단계).

## 3. Idle→Active 모프 전환 + 좌측 정보 컬럼 (ContentArea.tsx + page.tsx)

### 3-A. Active 레이아웃 구조

Active 모드의 ContentArea를 가로 2분할로 재구성:

```
[ 정보 컬럼 200px ][ 슬라이드 뷰포트 (나머지 전체, overflow hidden) ]
```

**정보 컬럼** (배경 흰색, padding '32px 24px', 고정 — 트랙과 무관하게 항상 표시):
```tsx
<div style={{ width: 200, flexShrink: 0, boxSizing: 'border-box', padding: '32px 24px',
              display: 'flex', flexDirection: 'column', gap: 24 }}>
  {/* Back 컨트롤 — 기존 Back 버튼을 이곳 최상단으로 이동 */}
  <button ...>← Back</button>

  {/* 프로젝트명 + 위치 */}
  <div>
    <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.35, wordBreak: 'keep-all' }}>{project.title}</div>
    <div style={{ fontSize: 11, fontWeight: 300, letterSpacing: '0.08em', textTransform: 'uppercase',
                  opacity: 0.6, marginTop: 6 }}>{project.location ?? ''}</div>
  </div>

  {/* 메타 스택 — BIG 형식: 라벨(소문자 캡션) + 값 */}
  {/* 항목: TYPOLOGY=project.type, STATUS=project.status, YEAR=project.year */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    {[['TYPOLOGY', project.type], ['STATUS', project.status], ['YEAR', String(project.year)]].map(([l, v]) => (
      <div key={l}>
        <div style={{ fontSize: 9, fontWeight: 300, letterSpacing: '0.1em', opacity: 0.45 }}>{l}</div>
        <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>{v}</div>
      </div>
    ))}
  </div>
</div>
```
색상은 전부 #080706 계열. CLIENT/SIZE는 데이터 필드 부재로 이번에 넣지 않는다 (Sanity 단계에서 추가).

### 3-B. 모프 전환 (갑작스러운 축소 제거)

Idle(풀블리드 커버) → Active(트랙 첫 슬라이드) 전환을 단일 이미지 레이어의
rect 애니메이션으로 구현한다:

1. select 시점에 `transitioning` 상태 진입. 커버 이미지를 absolute 레이어로 유지
   (`inset: 0`, objectFit cover)
2. 다음 프레임에 목표 rect로 전환:
   - 목표 높이 = 슬라이드 뷰포트 높이의 90%
   - 목표 너비 = 이미지 naturalAspect × 목표 높이 (img.naturalWidth/naturalHeight 사용,
     로드 전이면 4:3 가정)
   - 목표 위치 = 슬라이드 뷰포트 내 중앙 (정보 컬럼 200px 우측 기준)
   - objectFit: cover → 유지 (rect가 natural aspect이므로 왜곡 없음)
   - `transition: all 700ms cubic-bezier(0.7, 0, 0.3, 1)`
3. 700ms 후 `transitioning` 해제 → 모프 레이어 언마운트, 연속 트랙 마운트
   (초기 스크롤 = 슬라이드 0 중앙 정렬 → 시각적으로 끊김 없이 이어짐)
4. 정보 컬럼 텍스트는 400ms 지연 후 400ms 페이드인
5. Back(Active→Idle)은 역방향 모프 없이 기존 방식대로 즉시 전환 (범위 축소)

## 4. 연속 트랙 — 스냅 제거 (ContentArea.tsx 슬라이드 시스템 재작성)

인덱스 스냅 모델을 폐기하고 **픽셀 스크롤 모델**로 교체한다.

```typescript
const [scrollPos, setScrollPos] = useState(0)        // px, 0 = 첫 슬라이드 중앙
const slideRects = useRef<{ x: number; w: number }[]>([])  // 각 슬라이드의 트랙 내 위치/폭
```

- 트랙: `display: flex, gap: 16px, alignItems: center, height: 100%`,
  `transform: translateX(${-scrollPos}px)`
- 슬라이드 폭은 콘텐츠가 결정 (4-B의 높이 기반 사이징). 마운트/리사이즈 시
  각 슬라이드의 offsetLeft/offsetWidth를 측정해 slideRects에 저장
- **드래그**: pointerdown 기준 이동량을 scrollPos에 직접 반영. **놓아도 스냅하지 않는다.**
  범위 클램프: [첫 슬라이드 중앙 위치, 마지막 슬라이드 중앙 위치]
- 드래그 중 transition: none / 화살표 클릭 시 transition: `transform 600ms cubic-bezier(0.7, 0, 0.3, 1)`
- **화살표 클릭 동작**: 현재 뷰포트 중앙에 가장 가까운 슬라이드 기준으로
  다음/이전 슬라이드의 중앙 위치로 scrollPos 애니메이션
- 클릭 vs 드래그 판별: pointerup까지 이동량 < 5px이면 클릭으로 처리
- 비활성 슬라이드 dimming(opacity 0.4) **제거** — 전 슬라이드 opacity 1
- 키보드 ←/→: 화살표 클릭과 동일 동작 (유지)
- 슬라이드 카운터: 중앙 최근접 슬라이드 인덱스로 표시 (유지)

## 5. 커서 추적 화살표

### 5-A. 외부 트랙 화살표
고정 화살표를 폐기하고 커서 추적 글리프로 교체:

- 슬라이드 뷰포트에서 onMouseMove로 커서 좌표 추적
- 커서 X가 뷰포트의 우측 50% 영역 → `›`, 좌측 50% → `‹`
- 글리프는 커서 위치에서 (x+20, y) 지점에 absolute 배치, pointerEvents: none,
  fontSize 40, fontWeight 200, color #080706
- 첫 슬라이드 중앙 상태에서 `‹` 미표시, 마지막에서 `›` 미표시
- 뷰포트 클릭(이동량 < 5px) 시: 커서가 우측 반 → 다음, 좌측 반 → 이전
- 드래그 중에는 글리프 숨김. 뷰포트에 `cursor: none`은 적용하지 않는다 (기본 커서 유지)

### 5-B. 다이어그램 내부 화살표
고정 소형 화살표를 폐기하고 동일 패턴 적용:

- diagramSet 슬라이드의 이미지 영역 위에서만 작동
- 커서가 이미지 영역 좌/우 반에 따라 `‹` / `›` 글리프가 커서를 추적 (fontSize 20)
- 클릭 시 subIdx 전환 + `e.stopPropagation()` (외부 트랙 이동 차단)
- 외부 글리프와 동시 표시 방지: 커서가 diagramSet 이미지 영역 안에 있으면
  외부 글리프 숨김
- 자동 진행(3초)·호버 일시정지·crossfade·캡션·카운터는 기존 유지

## 6. 슬라이드 높이 통일

모든 슬라이드를 `alignItems: center` 트랙 안에서 다음 높이로 고정:

| kind | 높이 | 폭 | 비고 |
|---|---|---|---|
| `image` | 뷰포트 높이의 **90%** | 이미지 비율에 따라 자동 | `<img>` height 100%, width auto, objectFit cover, 슬라이드에 내부 패딩 없음 |
| `diagramSet` | 뷰포트 높이의 **60%** (이미지 영역 기준) | 다이어그램 비율에 따라 자동 | 캡션+카운터는 이미지 영역 하단 외부에 표시 |
| `credits` | 90% 높이의 흰 블록 | 고정 420px | 기존 2열 텍스트 유지, 수직 중앙 |

기존 contain + 64px 내부 패딩 방식 폐기 — 이미지가 슬라이드 rect를 정확히 채운다.
이로써 인접 슬라이드들의 상하 라인이 일치하고 16px 갭으로만 분리된다 (BIG 동일).
캡션이 있는 image 슬라이드는 캡션을 이미지 하단 외부(마진 12px)에 표시한다.

---

## 검증
```bash
npx tsc --noEmit
```
배포 후: 모프 전환 부드러움 / 자유 드래그 멈춤 / 커서 화살표 추적 /
다이어그램 내부 화살표 / 슬라이드 상하 라인 일치 / 흰 셸 확인.
