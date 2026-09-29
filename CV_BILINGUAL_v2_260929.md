# CV 국영문 병기 v2 — 좌우 2열 (260929)

근거: 사용자 지적(2026-09-29) — v1(`CV_BILINGUAL_260929.md`)의 "영문 아래 작은 국문 줄" 방식 폐기.
목표: CV를 **Position·Preoccupations와 같은 좌우 2열**(라벨 | EN | KO)로 렌더. 국문 열은 영문 열과 **같은 크기·같은 색**의 온전한 국문 CV.
전제: v1 데이터 변환 완료(CV 이름 필드 63건이 `{en, ko}`), v1 코드 배포 완료.

---

## 0. 절대 제약

- `npm run dev` / `npm run build` 금지. 검증은 `npx tsc --noEmit`.
- 수정 허용: `sanity/schemaTypes/about.ts`(cv* 타입), `src/types/index.ts`(Cv* 타입), `src/app/about/page.tsx`(CV 섹션만), `globals.css`(CV 관련 룰만), 신설 `scripts/cv-bilingual-v2-260929.ts`.
- Position·Preoccupations 렌더와 그 CSS는 수정 금지 — **재사용만** 한다.

## 1. 사전 확인 (불일치 시 중단·보고)

1. `git status` 추적 파일 변경 없음. HEAD에 v1 커밋(`about: CV bilingual`) 존재.
2. `about/page.tsx`에서 Preoccupations의 **라벨 | EN | KO 3열 행 구조**(클래스명, 예: `.about-row--wide` 등)와 모바일에서의 배치 방식(세로 쌓임 여부)을 원문으로 보고. CV는 이 구조를 그대로 쓴다.
3. Sanity about 문서에서 아래 필드의 **현재 영문 값 전체**를 중복 제거한 목록으로 보고(사용자가 Studio에서 수정했을 수 있음):
   - 모든 CV 항목의 `result`, exhibitions의 `venue`, education·employment의 `period`
4. §4의 매핑표에 없는 값이 하나라도 있으면 스크립트를 실행하지 말고 그 값을 보고.

## 2. v1 렌더 제거 (참조 지점 전수)

| # | 위치 | 조치 |
|---|---|---|
| 1 | `about/page.tsx` CV 렌더부의 `BilingualText` 7곳 | §3 구조로 교체 |
| 2 | 국문 줄 인라인 스타일 `fontSize: '0.82em'`, `rgba(8,7,6,0.45)`(CV 부분) | 삭제 |
| 3 | `globals.css` `.about-cv-name-row` | 삭제 |

grep 확인: `about-cv-name-row` 0건, CV 렌더부 안의 `0.82em` 0건.

## 3. 새 렌더 — 좌우 2열

- CV 섹션 전체(Education · Professional Experience · Awards · Exhibitions and Publications)를 Preoccupations와 **같은 행 구조**에 넣는다: 라벨 열(“Curriculum Vitae”) | EN 열 | KO 열.
- EN 열: 현재 CV 그대로(`.en` 값).
- KO 열: EN 열과 **항목 순서·줄 구조를 1:1로 대응**시킨 국문판. 글자 크기·색·줄간격은 EN 열과 동일(Preoccupations의 KO 열과 같은 규칙).
- 소제목 국문: Education → **학력**, Professional Experience → **경력**, Awards → **수상**, Exhibitions and Publications → **전시 및 출판**. (코드 상수)
- 두 열의 같은 항목이 **같은 높이에서 시작**하도록, 항목 단위로 EN/KO를 한 행(2칸 그리드)에 배치하는 방식을 우선 검토하라. 그 방식이 기존 행 구조와 충돌하면 열 단위 배치로 하고, 어긋남 가능성을 보고.
- 모바일: §1-2에서 보고된 Preoccupations의 모바일 규칙을 그대로 따른다.
- 국문 값이 비어 있으면 KO 열에 EN 값을 표시(빈칸 금지).

## 4. 스키마·데이터

### 4-1. 스키마

| 타입 | 필드 | 변경 |
|---|---|---|
| `cvSimpleEntry` | `period` | `string` → `localeString` |
| `cvEmployment` | `period` | `string` → `localeString` |
| `cvProjectEntry` | `result` | `string` → `localeString` |
| `cvRankedEntry` | `result` | `string` → `localeString` |
| `cvVenueEntry` | `venue` | `string` → `localeString` |

`year`는 문자열 유지(양 열 동일 표시). 타입 변경 후 `npx tsc --noEmit`으로 잔존 참조를 전부 드러낸 뒤 수정.

### 4-2. 스크립트 `scripts/cv-bilingual-v2-260929.ts`

기존 패턴(`--dry-run`) 준수. 위 필드의 문자열 값을 `{ en: <기존값 그대로>, ko: <매핑> }`으로 변환. 매핑은 **대소문자 무시 정확 일치**. 표에 없는 값이 있으면 쓰기 전 중단. 이미 객체인 값이 있으면 중단. drafts.about이 있으면 함께 변환. 실행 후 재조회로 전 필드 `{en, ko}` 확인.

**result**

| EN | KO |
|---|---|
| Winner | 당선 |
| 2nd Prize | 2등 |
| 3rd Prize | 3등 |
| 4th Prize | 4등 |
| Selected, Seoul Creative Innovation Architecture Design Project | 서울시 창의혁신 건축디자인 선정 |
| Honorable Mention | 가작 |
| Excellence Prize | 우수상 |
| Selected Prize | 입선 |
| Special Prize | 특별상 |
| Silver Prize | 은상 |

**venue**

| EN | KO |
|---|---|
| Jeongdong 1928 Art Center, Seoul | 정동1928 아트센터, 서울 |
| Seoul Hall of Urbanism and Architecture, Seoul | 서울도시건축전시관, 서울 |
| YouTube | 유튜브 |
| Published | 출판 |
| Dongdaemun Design Plaza, Seoul | 동대문디자인플라자, 서울 |
| POSCO Center, Seoul | 포스코센터, 서울 |
| Chonnam National University, Gwangju | 전남대학교, 광주 |

**period**: `ko` = `en`에서 `Present` → `현재` 치환(그 외 동일).

## 5. 실행 순서

1. 구현 → `npx tsc --noEmit`
2. 스크립트 `--dry-run` → 변환 요약 보고 → **중단**(사용자 지시 대기)
3. (지시 후) 실제 실행 → 재조회
4. 즉시 커밋·푸시

## 6. 보고 (커밋 전)

§1 결과(특히 §1-3 값 목록, 매핑 누락 여부), §2 grep 결과, 파일별 변경, 두 열 정렬 방식(항목 단위 / 열 단위) 선택과 근거, dry-run 요약.
