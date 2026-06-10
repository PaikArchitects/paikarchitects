# ORION_SLIDES_SPEC — 프로젝트 상세 슬라이드 시스템 (오리온 신사옥 1호 적용)

## 목적
Active 상태(`/work/[slug]`)의 ContentArea를 단일 coverImage 표시에서
**BIG.dk 방식의 다중 슬라이드 시스템**으로 확장한다.
오리온 신사옥(`orion-new-office`)을 첫 적용 프로젝트로 한다.
slides 데이터가 없는 나머지 프로젝트는 기존 동작(coverImage 1장)을 그대로 유지한다.

## 수정/생성 파일
1. `src/types.ts` — 슬라이드 타입 추가
2. `src/data/projectSlides.ts` — **신규** 슬라이드 데이터 파일
3. `src/data/projects.ts` — orion-new-office 항목 갱신 (2개 필드)
4. `src/components/ContentArea.tsx` — Active 모드 슬라이드 시스템 재작성

검증: `npx tsc --noEmit` (npm run dev / build 금지 — CLAUDE.md 준수)

---

## 1. 타입 추가 — `src/types.ts`

기존 코드 끝에 아래를 추가한다. 기존 Project 인터페이스는 수정하지 않는다.

```typescript
// ── 프로젝트 상세 슬라이드 ──

export interface ImageSlide {
  kind: 'image'
  src: string
  /** BIG 형식 캡션: "LABEL — description". 없으면 캡션 미표시 */
  caption?: string
}

export interface DiagramItem {
  src: string
  /** 대문자 라벨, 예: "MASS 01" */
  label: string
  /** 한 문장 설명 */
  description: string
}

export interface DiagramSetSlide {
  kind: 'diagramSet'
  items: DiagramItem[]
  /** 자동 진행 간격(ms). 기본 3000 */
  autoAdvanceMs?: number
}

export interface CreditsSlide {
  kind: 'credits'
  rows: { label: string; value: string }[]
}

export type ProjectSlide = ImageSlide | DiagramSetSlide | CreditsSlide
```

---

## 2. 신규 데이터 파일 — `src/data/projectSlides.ts`

```typescript
import type { ProjectSlide } from '@/types'

/**
 * 프로젝트별 상세 슬라이드 데이터.
 * key = Project.id (slug)
 * 등록되지 않은 프로젝트는 ContentArea가 coverImage 1장 fallback으로 동작.
 * 캡션/설명 텍스트는 직접 수정 가능. 형식: "LABEL — description"
 */
export const projectSlides: Record<string, ProjectSlide[]> = {
  'orion-new-office': [
    // 1. HERO — 황혼 루버 파사드
    {
      kind: 'image',
      src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781127827/_DSF3363_booefz.jpg',
    },
    // 2. 컨셉 다이어그램 A — 3 프로그램
    {
      kind: 'image',
      src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781128102/Diagram___3_Programs_1_e4g6ej.png',
      caption: 'THREE PROGRAMS — Office, amenity, and parking organized as three stacked volumes.',
    },
    // 3. 컨셉 다이어그램 B — 단면 조닝
    {
      kind: 'image',
      src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781128109/%EB%8B%A8%EB%A9%B4%EC%A1%B0%EB%8B%9D%EB%8B%A4%EC%9D%B4%EC%96%B4%EA%B7%B8%EB%9E%A8-01_rqmjyk.png',
      caption: 'SECTIONAL ZONING — Vertical organization of programs across the section.',
    },
    // 4. 매스 프로세스 — 서브슬라이드 5장, 자동진행
    {
      kind: 'diagramSet',
      autoAdvanceMs: 3000,
      items: [
        {
          src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781128090/Diagram___Mass_01_ltgnu8.png',
          label: 'MASS 01',
          description: 'Site and maximum envelope.',
        },
        {
          src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781128091/Diagram___Mass_02-1_z6b4z8.png',
          label: 'MASS 02',
          description: 'Volume split by program.',
        },
        {
          src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781128091/Diagram___Mass_02-2_zfnhv9.png',
          label: 'MASS 03',
          description: 'Shifting volumes for terraces and daylight.',
        },
        {
          src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781128092/Diagram___Mass_03_zajhtj.png',
          label: 'MASS 04',
          description: 'Facade differentiation per volume.',
        },
        {
          src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781128093/Diagram___Mass_04_lf4xmg.png',
          label: 'MASS 05',
          description: 'Final massing.',
        },
      ],
    },
    // 5. 외부 전경 — 드론
    {
      kind: 'image',
      src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781127828/DJI_0212_yvyetb.jpg',
    },
    // 6. 외부 디테일 — 루버+커튼월 접합
    {
      kind: 'image',
      src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781127829/DSC_8147_resize_tgu0s2.jpg',
    },
    // 7. 야경
    {
      kind: 'image',
      src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781127827/_DSF3517_uzzfcf.jpg',
    },
    // 8. 로비
    {
      kind: 'image',
      src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781127829/DSC_8743-2_resize_zllyn6.jpg',
    },
    // 9. 아트리움 — 다층 계단
    {
      kind: 'image',
      src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781127829/AB005_lit9mc.jpg',
    },
    // 10. 라운지
    {
      kind: 'image',
      src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781127827/_DSF8074_brgr4t.jpg',
    },
    // 11. 업무공간 — 더블하이트 보이드
    {
      kind: 'image',
      src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781127828/_DSF8475_yythgn.jpg',
    },
    // 12. 옥상 테라스
    {
      kind: 'image',
      src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781127827/_DSF8664_llq61o.jpg',
    },
    // 13. 크레딧
    {
      kind: 'credits',
      rows: [
        { label: 'Client', value: 'Orion Corporation' },
        { label: 'Location', value: 'Seoul, KR' },
        { label: 'Typology', value: 'Office' },
        { label: 'Status', value: 'Completed' },
        { label: 'Design', value: 'SPACE GROUP' },
        { label: 'Photography', value: 'Namgoong Sun' },
      ],
    },
  ],
}
```

> DJI_0361은 Cloudinary 목록에 v1781127828/DJI_0361_ju2cjq.jpg 로 존재함 —
> 5번 슬라이드는 DJI_0212가 아니라 **DJI_0361**을 사용한다:
> `https://res.cloudinary.com/drsybwqg0/image/upload/v1781127828/DJI_0361_ju2cjq.jpg`
> (위 코드 블록의 5번 src를 이 URL로 작성할 것. DJI_0212는 사용하지 않음)

---

## 3. projects.ts — orion-new-office 항목 갱신

해당 항목에서 **2개 필드만** 수정한다. 다른 항목·필드는 건드리지 않는다.

```typescript
// BEFORE
status: 'Under Construction',
// coverImage 없음

// AFTER
status: 'Completed',
coverImage: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781127827/_DSF3363_booefz.jpg',
```

---

## 4. ContentArea.tsx — Active 모드 재작성

### 4-A. 데이터 연결

```typescript
import { projectSlides } from '@/data/projectSlides'

// 컴포넌트 내부
const slides: ProjectSlide[] = projectSlides[project.id]
  ?? (project.coverImage
    ? [{ kind: 'image', src: project.coverImage }]
    : [])
```

- Idle 모드는 **기존 그대로** (coverImage 풀블리드 + 셔플 blackout). 수정하지 않는다.
- Active 모드만 아래 명세로 재작성한다.

### 4-B. BIG 방식 peek 레이아웃 (Active 모드)

현재 구현(슬라이드 100% 폭)을 폐기하고 아래로 교체:

- 슬라이드 폭: **컨테이너의 78%**, 슬라이드 간 간격: **24px**
- 현재 슬라이드가 컨테이너 정중앙, 전/후 슬라이드가 좌우에 부분 노출
- 트랙 transform 공식:
  ```
  translateX(calc(50% - 39% - ${idx} * (78% + 24px) + ${dragOffset}px))
  ```
  (50% − 슬라이드폭/2 = 현재 슬라이드 중앙 정렬, idx만큼 좌측 이동)
- 슬라이드 전환: `transform 500ms cubic-bezier(0.7, 0, 0.3, 1)` (드래그 중에는 none)
- 첫/마지막 슬라이드에서 루프 없음 (BIG 방식). 첫 슬라이드에서 prev 화살표 미표시, 마지막에서 next 미표시
- 기존 드래그 스와이프 로직(±80px 임계값)은 유지하되 루프 제거:
  `goNext = () => setSlideIdx(i => Math.min(i + 1, slides.length - 1))`
  `goPrev = () => setSlideIdx(i => Math.max(i - 1, 0))`
- 키보드: Active 모드에서 ←/→ 키로 슬라이드 이동 (window keydown, cleanup 필수)
- 비활성(중앙이 아닌) 슬라이드: `opacity: 0.4`, 클릭 시 해당 슬라이드로 이동
- 슬라이드 인덱스 카운터(기존 `01 / 13` 표시)와 Back 버튼은 유지

### 4-C. 좌우 대형 화살표 (외부 슬라이드 내비게이션)

기존의 "hovering 시 양쪽 모두 표시" 방식을 폐기하고 **마우스 위치 기반**으로 교체:

- ContentArea 내 `onMouseMove`로 커서 X 추적
- 커서가 컨테이너 좌측 25% 영역에 있으면 좌측 화살표만 표시, 우측 25% 영역이면 우측만 표시
- 화살표 스타일: 배경 없음, 순수 글리프. `‹` `›` 사용, fontSize 48, fontWeight 200,
  색상 `#0a0908`, opacity 0.7, hover 시 1
- 위치: 좌/우 가장자리에서 32px, 수직 중앙
- 모바일(mobile prop)에서는 화살표 미표시 (스와이프만)

### 4-D. 슬라이드 kind별 렌더링

**`image`:**
- 흰 배경, `object-fit: contain`, 내부 패딩 64px (peek 레이아웃이 추가 여백을 만들므로 기존 96px에서 축소)
- caption 있으면 이미지 하단에 표시:
  fontSize 12, fontWeight 300, color `#0a0908`, opacity 0.7, 중앙 정렬, max-width 70%,
  `LABEL — description` 형식 그대로 출력 (— 앞 라벨 부분만 fontWeight 500)

**`diagramSet` (매스 프로세스 서브슬라이드):**
- 슬라이드 내부에 자체 인덱스 상태(`subIdx`) 보유
- 현재 item 이미지를 contain으로 표시, 전환은 **crossfade 300ms** (translateX 아님)
- 하단 캡션: `MASS 01 — Site and maximum envelope.` 형식 + 그 아래 `01 / 05` 카운터
  (fontSize 11, opacity 0.5)
- **소형 화살표**: 다이어그램 영역 내부 좌/우에 마우스 진입 시에만 표시.
  fontSize 24, fontWeight 200, color `#0a0908`, opacity 0.5 → hover 1.
  외부 대형 화살표(4-C)와 시각적으로 명확히 구분되어야 함
- 서브슬라이드는 **루프함** (마지막 → 첫번째)
- **자동 진행**: `autoAdvanceMs`(기본 3000ms) 간격으로 다음 item으로 자동 전환
  - 해당 diagramSet 슬라이드가 **현재 중앙 슬라이드일 때만** 타이머 가동
  - 마우스가 다이어그램 영역 위에 있으면 일시정지
  - 수동 화살표 클릭 시 타이머 리셋
  - setInterval cleanup 필수
- 소형 화살표 클릭이 외부 슬라이드 이동을 트리거하지 않도록 `e.stopPropagation()` 처리

**`credits`:**
- 흰 배경 중앙에 2열 텍스트 블록
- label: fontSize 11, uppercase, letterSpacing 0.08em, opacity 0.5, 우측 정렬, 너비 120px
- value: fontSize 14, fontWeight 400, 좌측 정렬
- 행 간격 16px, label-value 간격 24px

### 4-E. 슬라이드 전환 시 상태 관리

- 프로젝트 변경 또는 mode 변경 시 `slideIdx` 0으로 리셋 (기존 로직 유지)
- diagramSet의 `subIdx`는 외부 슬라이드가 이동해 비활성화되면 0으로 리셋

---

## 5. 검증

```bash
npx tsc --noEmit
```

에러 없으면 완료. 이후 GitHub Desktop commit/push → Vercel 배포 후
`/work/orion-new-office` 직접 진입 + 랜딩 Project Wall 클릭 진입 양쪽 확인.
