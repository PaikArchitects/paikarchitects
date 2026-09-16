# AUDIT_landing_switch_260916 — 대표 모드 전환 착수 전 현황 감사

대상: paikarchitects.com (저장소 루트 `D:\00 Web\paikarchitects`)
목적: 그리드 모드를 대표 모드로 승격하고 링월↔그리드 전환 체계를 구현하기 전에,
**실제 코드 상태**를 수집한다. 설계 문서·메모리 기록과 코드가 어긋난 전례가 있으므로
본 감사 결과를 기준으로 후속 명세를 작성한다.

---

## 0. 절대 제약 (위반 시 감사 무효)

1. **읽기 전용.** 어떤 소스 파일도 수정·삭제·이동·포맷하지 않는다.
   생성 허용 파일은 보고서 `AUDIT_REPORT_landing_260916.md` 단 하나(저장소 루트).
2. `npm run dev` / `npm run build` / `npm install` **실행 금지.** 허용 명령: 파일 읽기, `grep`/`rg`,
   디렉터리 나열, `git status`, `git log`, `npx tsc --noEmit`.
3. **추정 금지.** 파일이 없거나 검색 결과가 0건이면 "없음(0건)"이라고 적는다.
   의미 해석·개선 제안은 쓰지 않는다. 사실(원문 발췌·경로·줄 번호·건수)만 기록한다.
4. 코드 발췌는 **줄 번호를 포함한 원문 그대로** 싣는다. 요약·생략(`...`) 금지.
   단, 지정한 파일이 300줄을 넘으면 전체 대신 각 항목에서 지정한 검색 결과 주변 ±15줄만 싣는다.
5. 검색은 `node_modules`, `.next`, `.git`을 제외한다.

---

## 1. 라우팅 현황

1-1. `src/app` 디렉터리 트리 전체를 나열한다(파일명 포함).

1-2. 아래 파일이 **존재하면 전문**을 싣는다(없으면 "없음").
- `src/app/page.tsx`
- `src/app/work/page.tsx`
- `src/app/work/[slug]/page.tsx`
- `src/app/work-grid/page.tsx`
- `src/app/work-grid/[slug]/page.tsx`
- `src/app/works/page.tsx`
- `src/app/layout.tsx`

1-3. 위 각 파일에서 다음 export의 유무와 값을 표로 정리한다:
`dynamic`, `revalidate`, `generateStaticParams`, `metadata`, `generateMetadata`.

---

## 2. 대표 모드 토글(landingMode) 구현 여부

2-1. 전수 검색 후 파일·줄 번호·해당 줄을 모두 싣는다.
- `landingMode`
- `siteSettings`
- `landing_mode`

2-2. `sanity/schemaTypes/` 디렉터리의 파일 목록과 `sanity/schemaTypes/index.ts` 전문.

2-3. Sanity Studio 구조 설정 파일을 찾아 싣는다.
대상은 `sanity.config.ts`, 그리고 `structure`를 포함하는 파일 전부다.
각 파일에서 싱글턴(About 등) 처리 부분을 발췌한다.

---

## 3. 뷰 전환 링크·URL 문자열 전수

문자열 기반 식별자는 타입 체커가 잡지 못하므로 전수 검색 결과를 그대로 싣는다.

3-1. `src/` 전체에서 아래 패턴을 검색해 파일·줄 번호·해당 줄을 모두 싣는다.
- `/work-grid`
- `'/work'` 및 `"/work"` 및 `` `/work `` (백틱 템플릿 포함)
- `/works`
- `router.push`
- `router.replace`
- `history.pushState`
- `history.replaceState`
- `usePathname`
- `href=`

3-2. 뷰 토글 UI(링월↔그리드 전환 링크 또는 버튼)가 렌더되는 컴포넌트를 3-1 결과에서 특정한다.
해당 JSX 블록을 ±15줄 발췌한다. 토글이 없으면 "없음"으로 적는다.

3-3. 헤더·워드마크·내비게이션의 WORKS 링크 대상 경로를 발췌한다.

---

## 4. SEO·정규 URL

4-1. 아래 파일의 존재 여부와 전문.
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `public/sitemap.xml`
- `public/robots.txt`

4-2. 전수 검색 결과(파일·줄·해당 줄).
- `canonical`
- `alternates`
- `metadataBase`
- `noindex`
- `robots:`

---

## 5. 딥링크 진입·복귀 동작

5-1. `GridExperience.tsx` 파일에서 다음 식별자의 모든 출현을 ±10줄 발췌한다.
- `initialSlug`
- `enterRect`
- 콘텐츠 닫기(close) 핸들러
- 닫을 때 URL을 되돌리는 코드

5-2. `LandingExperience.tsx` 파일에서도 같은 항목을 발췌한다.
- `initialSlug` 또는 그에 해당하는 prop
- close 시 URL 복원 코드

5-3. 그리드 콘텐츠 영역 파일(`GridContentArea.tsx`) 안에서 라우팅·URL 관련 코드를 발췌한다.

---

## 6. Sanity 변경 반영 경로 (재배포 없이 전환 가능한지)

6-1. 전수 검색 결과(파일·줄·해당 줄).
- `revalidatePath`
- `revalidateTag`
- `next: {` (fetch 캐시 옵션)
- `useCdn`

6-2. `src/app/api/` 디렉터리의 트리와, revalidate·webhook 관련 route 파일 전문. 없으면 "없음".

6-3. Sanity 클라이언트 생성 파일(`createClient` 검색) 전문.

---

## 7. 그리드 잔여 과제 관련 상수·레거시 실측

7-1. 아래 상수를 `src/` 전체에서 검색해 **정의 위치와 값**을 표로 정리한다.
같은 이름이 여러 파일에 있으면 전부 적는다.
- `INFO_SLIDE_W`
- `META_SLOT_W`
- `META_PAD_X`
- `TITLE_SET_MIN_H`
- `META_MARGIN`
- `KO_SCALE`
- `BELOW_TEXT_H`
- `GAP`
- `FULL_FADE_MS`

7-2. 그리드 열 수 상한·하한 정의를 발췌한다.
대상은 모바일·데스크톱 각각이며, `cols`, `minCols`, `maxCols` 또는 이에 준하는 식별자로 찾는다.

7-3. `ProjectCard.tsx`에 대해 다음을 기록한다.
- 존재 여부와 경로
- `ProjectCard` 문자열 전수 검색 결과(import·사용처 건수 포함)

7-4. 중앙정렬 산식 적용 여부를 확인한다.
- `targetScroll` 및 `centerScroll` 전수 검색 결과(파일·줄·해당 줄)
- `GridContentArea.tsx`에서 `clampScroll` 함수 전문

---

## 8. 저장소 상태

8-1. `git status` 출력 전문.

8-2. `git log --oneline -20` 출력 전문.

8-3. 저장소 루트의 `.md` 파일 목록(파일명·최종 수정일).

8-4. `npx tsc --noEmit` 실행 결과를 싣는다.
- 오류 0건이면 "통과".
- 오류가 있으면 출력 전문을 싣는다.

---

## 9. 보고서 형식

- 파일명: `AUDIT_REPORT_landing_260916.md` (저장소 루트)
- 본 명세의 절 번호(1-1, 1-2 …)를 그대로 제목으로 사용해 1:1 대응시킨다.
- 마지막에 "미확인 항목" 절을 두고, 실행 불가하거나 판단이 필요했던 항목을 사유와 함께 열거한다.
