# WALL_TRACK_REFINE_SPEC.md (v2)
## 트랙 좌측 클립 경계 + 월 성능 최적화 + 전환 동기화 + 호버 확대

> 기준: 2026.06.12 / v1 실행·배포본에 대한 후속 수정 4건
> 본 파일은 동일명 v1 스펙을 대체한다 (v1은 실행 완료 — 그 결과 코드 위에 적용).
> 검증: 모든 수정 후 `npx tsc --noEmit` 만 실행. `npm run dev`/`npm run build` 금지.

---

## 0. 수정 파일

| 파일 | 작업 |
|---|---|
| `src/lib/cloudinary.ts` | **신규** — 썸네일 변환 URL 헬퍼 |
| `src/components/ProjectWall.tsx` | 썸네일 경량화, 호버 기반 크기 위계 |
| `src/components/ContentArea.tsx` | 트랙 좌측 클립 경계, 트랙 페이드 인 |

다른 파일은 건드리지 않는다.

---

## 1. 트랙 좌측 클립 경계 = 타이틀 좌측 라인 (스크린샷 피드백)

**문제:** 슬라이드가 콘텐츠 영역 좌측 끝(0px)까지 도달해, 좌상단 타이틀의 좌측 라인(24px)을 넘어선다.

**수정:**
- 트랙 뷰포트(overflow hidden 컨테이너)를 콘텐츠 영역 좌측에서 **24px 안쪽**에서 시작시킨다:
  `marginLeft: 24` (또는 width `calc(100% - 24px)` 등가 처리).
- v1에서 트랙에 부여한 `paddingLeft: 24` (leading inset)는 **제거**한다 — 뷰포트 좌측 모서리가 곧 클립 라인이며, scrollPos 0에서 정보 슬라이드가 이 라인(= Back/타이틀 좌측 라인)에 정렬된다.
- 결과: 드래그 시 슬라이드는 24px 라인에서 잘려 나가고, 그 좌측으로는 절대 그려지지 않는다.
- **모프 타깃 rect 확인:** 루트 좌표 기준 히어로 left = 24(뷰포트 오프셋) + INFO_SLIDE_W(200) + SLIDE_GAP_PX(24) = 248. v1과 동일 값이므로 모프 계산식은 변경 불필요 — 단, 계산이 뷰포트 내부 좌표를 쓰고 있다면 248이 되도록 정합만 확인.

---

## 2. 월 썸네일 경량화 — 랙의 근본 원인 제거 (영상 피드백 ①)

**진단:** WallCard가 변환 파라미터 없는 Cloudinary 원본 URL(수 MB, 4000px급)을 로드한다. 높이 transition 동안 매 프레임 대형 비트맵 리스케일이 발생해 랙이 생긴다. CSS 최적화 이전에 이미지 자체를 경량화해야 한다.

### 2-A. 헬퍼 신규 — `src/lib/cloudinary.ts`

```ts
/** Cloudinary 전송 URL에 on-the-fly 변환 파라미터 삽입. 비-Cloudinary 경로는 원본 반환 */
export function cldThumb(src: string, width = 480): string {
  return src.includes('/upload/')
    ? src.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
    : src
}
```

### 2-B. ProjectWall 적용

- WallCard의 `<img src={project.coverImage}>` → `<img src={cldThumb(project.coverImage, 480)}>`.
- `loading="lazy"` 속성 추가 (23장 초기 로드 분산).
- **적용 범위는 월 썸네일만.** ContentArea의 Idle 풀블리드·트랙 슬라이드는 원본 유지 (별도 이미지 파이프라인 결정 사항 — 이번 스펙 범위 밖).

---

## 3. 호버 확대 — 크기 위계의 중심을 호버가 우선 점유 (영상 피드백 ②)

**현재:** 크기 위계(150/120/96)의 중심이 `activeSlug ?? highlightSlug`(셔플)로만 결정되고, 호버는 불투명도만 바꾼다.

**수정:**
- ProjectWall에 `hoveredId: string | null` state 추가. WallCard의 mouseEnter/Leave에서 갱신 (기존 onHover 콜백 흐름은 그대로 유지 — 부모 셔플 일시정지 로직이 이미 의존).
- 크기 위계 중심 산정:
  ```ts
  const tierCenter = activeSlug ?? hoveredId ?? highlightSlug
  ```
  d(거리) 계산과 150/120/96 매핑은 v1 그대로, 중심만 교체.
- **scrollIntoView는 호버에 반응하지 않는다.** 자동 센터링 기준은 기존대로 `activeSlug ?? highlightSlug` 유지 — 호버 중 리스트가 스스로 스크롤되면 포인터와 싸우게 된다.
- 불투명도 로직 변경 없음.
- 호버 해제 시 중심이 셔플 하이라이트로 복귀하며 400ms로 자연 수축 — 별도 처리 불필요.

---

## 4. 전환 동기화 — 콘텐츠 영역 페이드 인 (영상 피드백 ①)

**문제:** 월 카드를 클릭해 프로젝트를 전환하면 좌측 월은 400ms에 걸쳐 크기가 재배열되는데, 우측 트랙 콘텐츠는 즉시 교체되어 양측의 시간 감각이 상반된다.

**수정:**
- 트랙을 감싸는 **페이드 래퍼** 1겹 추가: `뷰포트 > 페이드 래퍼 > 트랙(trackRef)`.
  - 래퍼: `opacity: trackIn ? 1 : 0`, `transition: opacity 400ms ease`, `height: 100%`.
  - rect 측정(`trackRef.children`)·transform은 트랙에 그대로 있으므로 영향 없음.
- 상태 `trackIn: boolean`:
  ```
  mode !== 'active' 또는 morphing 중  → false
  active && !morphing               → project.id 기준으로 false 리셋 후
                                       더블 rAF로 true (페이드 시작)
  ```
  의존성: `[mode, morphing, project.id]` — 기존 `infoIn` 패턴과 동일한 구조.
- 효과 범위:
  1. **active 중 월에서 다른 프로젝트 클릭** → 월 크기 재배열(400ms)과 트랙 페이드 인(400ms)이 동시 진행.
  2. **Idle→Active 최초 진입** → 모프(700ms) 종료 직후 트랙이 컷 인 대신 400ms 페이드로 등장 (정보 슬라이드 infoIn과 자연 중첩 — infoIn은 유지).
- 슬라이드 카운터(`02 / 13`)도 래퍼 안으로 이동해 함께 페이드시킨다.

---

## 5. 명시적 비변경 항목

- 크기 3단 수치(150/120/96)·transition 400ms·2:1 비율·상단 정렬 — v1 그대로.
- 트랙 모델·드래그·글리프·다이어그램 게이팅·모프 타이밍 — 변경 없음.
- 데이터 파일·타입 — 변경 없음.
- Idle 셔플·필터 — 변경 없음.

---

## 6. 검증 체크리스트 (배포 후)

1. 트랙 드래그 시 슬라이드가 Back/타이틀 좌측 라인(24px)에서 정확히 잘리고, 그 너머로 그려지지 않음. scrollPos 0에서 정보 슬라이드 좌측이 타이틀 좌측과 수직 정렬.
2. 모프 착지 위치가 히어로 슬라이드 실제 위치와 일치 (어긋남 없음).
3. 월 카드 호버 → 해당 카드 150 + 인접 120으로 부드럽게 확대, 랙 없음. 호버 해제 → 셔플 하이라이트 중심으로 복귀. 호버로 인한 리스트 자동 스크롤 없음.
4. active 중 다른 프로젝트 클릭 → 월 재배열과 우측 트랙 페이드 인이 같은 시간폭(400ms)으로 동시 진행, 즉시 컷 없음.
5. Idle→Active 최초 진입: 모프 후 트랙이 페이드로 등장.
6. 네트워크 탭에서 월 썸네일 URL에 `f_auto,q_auto,w_480` 포함 확인, 개별 용량 수십 KB 수준.
7. 데스크톱 기존 동작(셔플·필터·키보드·다이어그램) 회귀 없음.
8. `npx tsc --noEmit` 무에러.
