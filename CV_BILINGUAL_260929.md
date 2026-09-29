# CV 국영문 병기 (260929)

근거: 사용자 결정(2026-09-29) — About의 CV 전 섹션(Education·Professional Experience·Awards·Exhibitions and Publications)을 영문 위·국문 아래로 병기. 국문명은 절차 용어를 뺀 간결한 형태.
전제: `CV_EMPLOYMENT_260929.md`의 46건이 Sanity에 입력되어 있음(`sg-XXX` key).

---

## 0. 절대 제약

- `npm run dev` / `npm run build` 금지. 검증은 `npx tsc --noEmit`.
- 수정 허용: `sanity/schemaTypes/about.ts`(cv* 타입 필드 타입·preview만), `src/types/index.ts`(Cv* 타입만), `src/app/about/page.tsx`(CV 렌더부만), `globals.css`(CV 국문 줄 스타일 추가만), 신설 `scripts/cv-bilingual-260929.ts`.
- 병기 대상은 **이름 필드만**: 결과(result)·연도(year)·기간(period)·장소(venue)는 영문 문자열 그대로.
- i18n 방식 B 준수: 병기 필드는 기존 `localeString`(`{ en, ko }`) 타입 사용. 렌더는 en-first.

## 1. 사전 확인 (불일치 시 중단·보고)

1. `git status` 추적 파일 변경 없음.
2. `about/page.tsx`의 CV 네 섹션 렌더 원문(행 구조·클래스명)과 관련 CSS 위치 보고.
3. 현재 Sanity about 문서의 education 1건, employment 1건(projects 46건), awards 7건, exhibitions 8건 — 각 항목의 `_key`와 영문 `title`(employment·education은 `detail`도)을 목록으로 보고. §4 표와 **영문 문자열이 정확히 일치하는지** 대조 결과를 함께. 불일치가 1건이라도 있으면 스크립트 실행 전 중단.

## 2. 스키마 (`about.ts`)

| 타입 | 필드 | 변경 |
|---|---|---|
| `cvSimpleEntry` | `title`, `detail` | `string` → `localeString` |
| `cvEmployment` | `title`, `detail` | `string` → `localeString` |
| `cvProjectEntry` | `title` | `string` → `localeString` |
| `cvRankedEntry` | `title` | `string` → `localeString` |
| `cvVenueEntry` | `title` | `string` → `localeString` |

각 타입 preview의 `select.title`을 `'title'` → `'title.en'`으로.

## 3. 타입·렌더

- `src/types/index.ts`: 위 필드들을 `LocaleString`으로. `npx tsc --noEmit`으로 렌더부의 잔존 문자열 참조를 전부 드러낸 뒤 수정.
- `about/page.tsx`: 병기 필드는 `BilingualText`(en-first)로 렌더. 국문 줄은 그리드 카드 타이틀과 같은 위계 — 크기 0.82배(`KO_SCALE`와 동일 값), 색은 영문보다 옅게(기존 CV 부제 색이 있으면 그것). 결과·연도 열의 위치는 **영문 줄 기준선**에 맞춘다(국문 줄 때문에 우측 열이 내려가지 않도록).
- 국문 값이 없는 항목은 영문 한 줄만 렌더(빈 줄 금지).

## 4. 데이터 — 스크립트 `scripts/cv-bilingual-260929.ts`

기존 스크립트 패턴(`--dry-run`) 준수. `_key`로 항목을 찾아 문자열 필드를 `{ en: <기존 문자열>, ko: <아래 국문> }`로 변환. 영문은 기존 값을 그대로 옮기며 새로 쓰지 않는다. 대상 수(1+1+46+7+8)와 다르면 중단. 실행 후 재조회로 전 항목이 `{en, ko}` 형태인지 확인.

### 4-1. Education

| EN title | KO title | EN detail | KO detail |
|---|---|---|---|
| Sejong University, Seoul | 세종대학교 | Bachelor of Architecture, Architectural Engineering Dept. | 건축공학과 건축학사 ※ |

### 4-2. Employment

| EN title | KO title | EN detail | KO detail |
|---|---|---|---|
| SPACE GROUP of Korea, Seoul | 공간종합건축사사무소 | Staff – Senior Associate | 사원 – 실장 |

### 4-3. Professional Experience projects (key = `sg-` + 연번)

| key | KO title |
|---|---|
| sg-071 | 사직야구장 임시구장 |
| sg-070 | 초전면 어울림복합타운 |
| sg-064 | 성남시 야구전용구장 |
| sg-067 | 광주 수완지구 복합시설 |
| sg-066 | 대전서부새마을금고 회관 |
| sg-065 | 도산대로 229 개발 |
| sg-063 | 장흥면 복합청사 |
| sg-057 | 성내동 복합개발 |
| sg-053 | 화진포 관광지 마스터플랜 |
| sg-048 | 오리온 진천 신공장 |
| sg-047 | 더케이예다함 복합센터 |
| sg-051 | 하회과학자마을 |
| sg-045 | 현대자동차 인도 첸나이 기술학교 |
| sg-043 | 진주 신안동 복합스포츠타운 |
| sg-042 | 현대자동차 인도기술연구소 시험동 |
| sg-041 | 청주 농수산물 도매시장 |
| sg-040 | 하남 성원 스마트빌딩 |
| sg-039 | 평택시 서부청소년시설 |
| sg-038 | 가락시장 현대화 도매권역 2공구 |
| sg-037 | 오리온 도곡 사옥 |
| sg-034 | 하남 보바스재활병원 |
| sg-033 | 주인도대사관 청사 그린리모델링 |
| sg-031 | 한양대학교 박화영음악관 |
| sg-030 | 위례지구 신혼희망타운 |
| sg-029 | 성주군 도시재생뉴딜사업 |
| sg-028 | 충남 국제전시컨벤션센터 |
| sg-027 | 교원그룹 구몬빌딩 리모델링 |
| sg-025 | 서울법원 제2청사 |
| sg-024 | 구리 한강변 도시개발 |
| sg-022 | 강일 서울 컴팩트시티 |
| sg-020 | JB금융그룹 통합 연수원 |
| sg-018 | 화성새마을금고 회관 |
| sg-017 | 화성 독립운동 기념관 |
| sg-016 | 원주 혁신도시 복합혁신센터 |
| sg-015 | 서울애니메이션센터 재건축 |
| sg-014 | 천안 삼거리공원 |
| sg-013 | 시흥장현 A-12BL 공동주택 |
| sg-012 | 양주회천 A25BL 공동주택 |
| sg-010 | 청주 문화제조창 |
| sg-008 | 과천 주공12단지 재건축 |
| sg-007 | KB국민은행 통합사옥 |
| sg-006 | 종합의료복합단지 2단계 |
| sg-005 | 시몬스 팩토리움 |
| sg-004 | 웅부중학교 |
| sg-003 | 울릉중학교 |
| sg-001 | 인천터미널부지 복합시설 |

### 4-4. Awards (영문 title로 매칭)

| EN title | KO title |
|---|---|
| 37th SPACE GRAND PRIZE Poster Contest | 제37회 공간국제학생건축상 포스터 공모 |
| SPACE GROUP New Office Competition | 공간그룹 신사옥 사내공모 |
| Social Architecture, Young Architect Competition | 소셜 아키텍처 청년건축가 공모 ※ |
| The 32nd Korean Inst. of Arch. International Competition | 제32회 대한민국건축대전 |
| POSCO Steel Design Festa 2013 | 포스코 스틸디자인 페스타 2013 |
| Sejong Architecture Graduation Exhibition | 세종대 건축학과 졸업전시 |
| Urban Design Institute of Korea UCC Competition | 한국도시설계학회 UCC 공모전 |

### 4-5. Exhibitions and Publications (영문 title로 매칭)

| EN title | KO title |
|---|---|
| Social Architecture Symposium | 소셜 아키텍처 심포지엄 ※ |
| Social Architecture, Young Architect Competition Exhibition | 소셜 아키텍처 청년건축가 공모 전시 ※ |
| Young Architect Competition Winner Interview | 청년건축가 공모 수상자 인터뷰 ※ |
| KIA International Competition Winner Work Book | 대한민국건축대전 수상작품집 |
| Sejong News | 세종대학교 신문 ※ |
| The 32nd Korean Inst. of Arch. Int'l Competition Exhibition | 제32회 대한민국건축대전 전시 |
| POSCO Steel Design Festa 2013 Exhibition | 포스코 스틸디자인 페스타 2013 전시 |
| Screening Urban Design Inst. of Korea UCC Competition | 한국도시설계학회 UCC 공모전 상영 |

※ = 공식 국문 명칭 확인 권장. 배포 후 Studio에서 개별 수정 가능.

## 5. 실행 순서

1. 스키마·타입·렌더 구현 → `npx tsc --noEmit`
2. 스크립트 `--dry-run` → 대상 63건 변환 전/후 요약 보고 → **중단**(사용자 지시 대기)
3. (사용자 지시 후) 실제 실행 → 재조회 확인
4. 커밋·푸시 — 데이터 변환이 배포보다 먼저여야 한다(스키마가 localeString으로 바뀐 뒤 문자열 데이터가 남아 있으면 렌더가 깨짐)

## 6. 보고 (커밋 전)

§1 사전 확인 결과(특히 §1-3 대조), 파일별 변경, tsc 결과, dry-run 요약.
