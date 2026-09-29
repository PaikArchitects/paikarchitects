# IDENTITY P3 — ACP 워드마크 복원 (260929)

근거: `AUDIT_REPORT_identity_seo_260929.md` §3·§4·§9, 부록 A11·A13
목표: 헤더 워드마크를 "Architect Chang-hyun Paik"으로 바꾸고, 최초 진입 인트로에서 이동과 동시에 **ACP**로 축약되는 애니메이션을 복원한다.
복원 기반: 제거 커밋 `7ef6670`의 직전 상태 `7ef6670^` (감사 보고서 §4-3 원문).

---

## 0. 절대 제약

- `npm run dev` / `npm run build` 금지. 검증은 `npx tsc --noEmit`.
- 수정 허용 파일: `src/components/SiteHeader.tsx`(55-70행 및 §3-4 해당 줄), `src/app/globals.css`(워드마크 블록 42-109행, 모바일 오버라이드 162-180행, 신규 reduced-motion 블록), `src/components/SiteChromeContext.tsx`(§3-4·§3-5 한정), `CLAUDE.md`(워드마크 표), `src/app/icon.png`·`src/app/apple-icon.png`(신설), `src/app/favicon.ico`(삭제). 그 외 금지.
- **측정 금지**: 폭 애니메이션에 `getBoundingClientRect`·`ResizeObserver`·JS 폭 계산을 쓰지 않는다. 축약은 순수 CSS(`max-width` + `opacity`) 클래스 토글로만.
- **Safari 제약 준수**: 모바일 수평 중앙은 기존 auto margin 방식(`globals.css:165-172`) 유지. transform 퍼센트로 되돌리지 않는다.
- 트랜지션 곡선·시간은 기존 값 유지: `1600ms cubic-bezier(0.7, 0, 0.3, 1)` — 이동과 축약이 동일 소스로 동시 진행해야 한다.

## 1. 사전 확인 (불일치 시 중단·보고)

1. `SiteHeader.tsx:55-70`, `globals.css:42-109`, `globals.css:162-180`이 감사 보고서 §3-1 원문과 동일.
2. `git show 7ef6670^:src/app/globals.css`의 `.rest`/`.spacer`/`.collapsed` 4개 룰이 보고서 §4-3 원문과 동일.
3. `SiteChromeContext.tsx` **전문**을 읽고 보고:
   (a) `introPhase`의 전이 순서와 각 전이를 일으키는 주체,
   (b) `introSkipped`가 true가 되는 조건 — 특히 **같은 탭에서 `/`를 새로고침할 때 인트로가 다시 재생되는지**, sessionStorage 등 세션 기억 장치가 이미 있는지,
   (c) `'collapsed'` 값이 대입·비교되는 곳이 있는지.
4. `src/app/favicon.ico`가 25,931 bytes인지 확인(create-next-app 기본 파비콘 여부 판단용).
5. 저장소 루트에 `icon.png`(512×512)·`apple-icon.png`(180×180)가 있다 — 사용자가 이 명세와 함께 넣은 파일. 없으면 §3-6만 건너뛰고 나머지 진행.

## 2. 동작 사양

| 상황 | 표시 |
|---|---|
| 세션 최초 진입(인트로 재생 조건 충족) | 화면 중앙 "**Architect** Chang-hyun Paik" 페이드인 → 인트로 종료 시 헤더 위치로 이동하며 동시에 **ACP**로 축약 (1600ms) |
| 같은 세션에서 재진입·새로고침·다른 페이지 직접 진입 | 헤더 위치에 **ACP** 즉시 표시 (`instant`) |
| OS 동작 줄이기(`prefers-reduced-motion: reduce`) | 이동·축약 트랜지션 없이 최종 상태(헤더 ACP)로 즉시 전환. 0.3s 페이드인만 유지 |

글자 구성·웨이트: A**rchitect**(900) / C**hang-hyun**(500) / P**aik**(100) — 사용자 확정 C안(2026-09-29). 대문자 A·C·P는 `.initial`로 항상 표시, 나머지는 `.rest`로 축약.

## 3. 구현

### 3-1. `SiteHeader.tsx:55-70` 교체

`7ef6670^` 구조를 복원하되 세 곳을 바꾼다: 웨이트 400·300 → **500·100**, 텍스트 `hanghyun` → **`hang-hyun`**, `aria-label` → **`"Architect Chang-hyun Paik — Home"`**.

```tsx
      {/* ── ACP WORDMARK — "Architect Chang-hyun Paik" → 인트로 종료 시 ACP로 축약. 홈 링크 ── */}
      <Link
        href="/"
        aria-label="Architect Chang-hyun Paik — Home"
        className={[
          'wordmark-intro',
          wordmarkMoved ? 'collapsed moved' : '',
          wordmarkOnLight ? 'on-light' : '',
          introSkipped ? 'instant' : '',
          !isLanding ? 'no-color-transition' : '',
        ].filter(Boolean).join(' ')}
      >
        <span className="word" style={{ fontWeight: 900 }}>
          <span className="initial">A</span>
          <span className="rest">rchitect</span>
        </span>
        <span className="spacer">&nbsp;</span>
        <span className="word" style={{ fontWeight: 500 }}>
          <span className="initial">C</span>
          <span className="rest">hang-hyun</span>
        </span>
        <span className="spacer">&nbsp;</span>
        <span className="word" style={{ fontWeight: 100 }}>
          <span className="initial">P</span>
          <span className="rest">aik</span>
        </span>
      </Link>
```

`wordmarkMoved` 판정(`:41`)은 변경하지 않는다 — 이동과 축약이 같은 조건으로 동시에 걸리게 하는 것이 목적이다(애니메이션 소스 통일).

### 3-2. `globals.css` 워드마크 블록

1. `:42` 주석 → `/* ── WORDMARK INTRO — "Architect Chang-hyun Paik" → ACP 모노그램 ── */`
2. `.wordmark-intro`의 `font-size: 32px` → **`font-size: min(32px, 7vw)`**
   이유: 풀네임은 32px에서 약 400px 폭이라 375px 폰 화면을 넘는다. 7vw는 375px에서 약 26px(폭 약 325px). 데스크톱(≥458px 폭)은 32px 그대로. 측정 없는 순수 CSS.
3. `letter-spacing: -0.02em` → `-0.01em` (ACP 시절 값 복원).
4. `.wordmark-intro .wordmark-gap { … }` 룰(`:106-109`) **삭제**하고 `7ef6670^`의 4개 룰을 그대로 복원:
   `.wordmark-intro .rest, .wordmark-intro .spacer {…}` / `.wordmark-intro .rest { max-width: 400px; }` / `.wordmark-intro .spacer { width: 0.3em; max-width: 0.3em; }` / `.wordmark-intro.collapsed .rest, .wordmark-intro.collapsed .spacer { max-width: 0; opacity: 0; }`
5. `.wordmark-intro.instant` 에 하위 요소 즉시 적용 추가:
   ```css
   .wordmark-intro.instant .rest,
   .wordmark-intro.instant .spacer { transition: none; }
   ```
   (재진입 시 ACP가 풀네임에서 줄어드는 모습이 보이지 않도록)

### 3-3. reduced-motion 블록 (globals.css 워드마크 블록 끝에 신설)

```css
@media (prefers-reduced-motion: reduce) {
  .wordmark-intro,
  .wordmark-intro.no-color-transition,
  .wordmark-intro .rest,
  .wordmark-intro .spacer {
    transition: none;
  }
}
```
`wordmarkFadeIn`(0.3s opacity)은 유지. 다른 애니메이션(nav 등)은 이번 범위 외.

### 3-4. 세션 1회 재생

§1-3(b) 결과에 따라 분기:
- **이미 세션 기억 장치가 있어 새로고침 시 인트로가 재생되지 않는 경우** → 변경 없음. 보고만.
- **새로고침마다 인트로가 재생되는 경우** → `SiteChromeContext.tsx`에서 `introSkipped`를 결정하는 지점에 sessionStorage 키 `acp-intro-played`를 추가:
  - 인트로가 `done`에 도달하면 `'1'` 기록.
  - 초기 판정 시 값이 `'1'`이면 기존 skip 경로와 동일하게 처리.
  - sessionStorage 접근은 전부 `try/catch`(사파리 개인정보 보호 모드 대응). 실패 시 인트로 재생(현행 동작).
  - 서버 렌더와 클라이언트 초기값이 달라지는 hydration 불일치가 생기지 않도록 기존 `introSkipped` 결정 타이밍(effect 내 판정 등)을 그대로 따를 것. 기존 구조상 불가능하면 구현하지 말고 중단·보고.

### 3-5. 잔존물 정리 (A11)

`SiteChromeContext.tsx:6` `IntroPhase`에서 `'collapsed'` 제거 → `npx tsc --noEmit`.
- 오류 0이면 확정.
- 오류가 나면 **원복하고** 참조 위치를 보고(추정으로 수정하지 않는다).

`LandingExperience.tsx:218` 주석("ACP 모노그램")은 이번 복원으로 사실과 일치하게 되므로 수정하지 않는다(파일도 수정 금지 대상).

### 3-6. 아이콘

1. 루트의 `icon.png` → `src/app/icon.png`, `apple-icon.png` → `src/app/apple-icon.png`.
2. §1-4에서 25,931 bytes(기본 파비콘)로 확인되면 `src/app/favicon.ico` 삭제. 크기가 다르면 삭제하지 말고 보고.

### 3-7. `CLAUDE.md` 워드마크 표 갱신 (A13)

텍스트 `Architect Chang-hyun Paik` / 웨이트 900·500·100 / 크기 `min(32px, 7vw)`, 헤더 종착 데스크톱 32px·모바일 22px / 모노그램 `ACP` / 축약 방식: `.collapsed` 클래스 토글, `max-width`+`opacity` 1600ms / 재생: 세션 최초 1회 / reduced-motion: 즉시 전환.
브랜드 표기 원칙 1줄 추가: "사이트 아이덴티티는 Architect Chang-hyun Paik. 'Paik Architects'는 도메인명으로만 사용."

## 4. 검증

1. `npx tsc --noEmit` 오류 0.
2. grep `wordmark-gap` → 0건. grep `hanghyun`(대소문자 무시) → 0건.
3. grep `Paik Architects`(대상 `src`) → 0건.
4. grep `prefers-reduced-motion` → `globals.css` 1건.

## 5. 보고 (커밋 전)

§1 사전 확인 결과(특히 §1-3 SiteChromeContext 분석과 §3-4 분기 선택), 파일별 변경 줄 범위, §4 원문, 커밋 메시지 제안 `identity P3: ACP wordmark restore`.

## 6. 배포 후 사용자 육안 확인

- 새 시크릿 창에서 `/` 진입 → 풀네임 → 이동+ACP 축약 1회
- 같은 탭 새로고침 → ACP 즉시
- iPhone 폭: 인트로 풀네임이 화면 안에 들어오는지, 종착 ACP가 중앙에 있는지
- iOS 설정 > 손쉬운 사용 > 동작 > 동작 줄이기 ON → 즉시 전환
- 브라우저 탭 아이콘 ACP
