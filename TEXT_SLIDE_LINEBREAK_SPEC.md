# 본문 텍스트 줄바꿈·행간 수정 명세

작성일 260720. 대상: `src/components/ContentArea.tsx`, `src/components/MobileProjectWall.tsx`.

본 명세는 실제 소스 감사(260720) 위에 작성되었다. 아래 「현황」은 확인된 사실이며 추정이 아니다.

---

## 0. 현황 (감사 확인 사항)

- 데스크톱 `renderBlocks` (ContentArea.tsx L268~297): `<p>` 스타일에 `fontSize:14`, `lineHeight:1.75`, `whiteSpace: 'normal'` **명시**.
- 모바일 `renderMobileBlocks` (MobileProjectWall.tsx L226~254): `<p>` 스타일에 `fontSize:12`, `lineHeight:1.75`. `whiteSpace` **미지정**(브라우저 기본값 `normal`).
- 데스크톱 `TextSlideView` (L299~325): 영문 래퍼 `gap:18`, 한글 래퍼 `gap:18`, 영문↔한글 바깥 래퍼 `gap:24`.
- 모바일 `MobileTextSlide` (L256~267): 영문 래퍼 `gap:14`, 한글 래퍼 `gap:14`, 바깥 래퍼 `gap:20`.
- 두 렌더러 모두 `block.children[].text`를 그대로 출력한다. 텍스트 안의 `\n`(소프트 줄바꿈)은 별도 처리 없이 넘어간다.

## 0-A. 문제 원인

`localePortableText`는 문단(block) 배열이다. Studio 에디터에서:
- `Enter` → 새 block 생성 (문단 분리)
- `Shift+Enter` → 같은 block 안에 `\n` 삽입 (소프트 줄바꿈)

현재 렌더러는 `whiteSpace: normal`이므로 `\n`이 공백으로 접힌다. 따라서 `Shift+Enter`로 입력된 줄바꿈이 화면에서 사라지고 한 줄로 이어 붙는다.

The Whale 프로젝트의 영문 본문은 `Shift+Enter`로, 한글 본문은 `Enter`로 입력되어 있어 두 언어의 렌더 결과가 달랐다. **코드는 한글 쪽 동작이 정상이며, 영문은 데이터 입력 방식이 렌더러 설정과 맞지 않았던 것이다.**

---

## 1. 소프트 줄바꿈 존중 — `pre-line` 적용

### 1-A. 데스크톱

`ContentArea.tsx` `renderBlocks`의 `<p>` 스타일에서

```
whiteSpace: 'normal',
```

를 다음으로 교체한다.

```
whiteSpace: 'pre-line',
```

### 1-B. 모바일

`MobileProjectWall.tsx` `renderMobileBlocks`의 `<p>` 스타일에 다음을 **추가**한다(현재 `whiteSpace` 속성이 없다).

```
whiteSpace: 'pre-line',
```

`wordBreak: 'keep-all'` 바로 다음 줄에 넣어 데스크톱과 속성 순서를 맞춘다.

### 1-C. `pre-line` 선택 근거

| 값 | 연속 공백 | 개행(`\n`) | 자동 줄바꿈 |
|---|---|---|---|
| `normal` (현행) | 접음 | 공백으로 접음 | 함 |
| `pre-wrap` | **보존** | 보존 | 함 |
| `pre-line` | 접음 | **보존** | 함 |

`pre-wrap`은 연속 공백·들여쓰기까지 보존해 CMS 입력의 우발적 공백이 그대로 드러난다. `pre-line`은 개행만 살리고 공백은 접으므로 부작용이 없다. 자동 줄바꿈은 유지되므로 폭 제약(`TEXT_SLIDE_W=560`, 모바일 100%) 안에서 정상 동작한다.

### 1-D. 데이터 교정 불필요

`pre-line` 적용 후 `Shift+Enter`(소프트 줄바꿈)와 `Enter`(문단 분리)가 각각 다른 위계로 렌더된다:
- 소프트 줄바꿈 → `lineHeight`(1.75) 간격
- 문단 분리 → 래퍼 `gap`(데스크톱 18 / 모바일 14) 간격

기존 데이터를 수정하지 않아도 The Whale 영문 본문이 의도대로 3줄로 표시된다. 다른 프로젝트의 기존 입력도 그대로 정상 렌더된다.

---

## 2. 행간 조정

### 2-A. 현상

한글 본문의 줄 사이가 넓어 보이는 것은 두 요인이 겹친 결과다.
1. 한글 본문이 줄마다 별개 문단(block)으로 입력되어 `lineHeight`가 아니라 문단 `gap`이 적용됨.
2. 영문이 한 덩어리로 붙어 있어 대비가 커 보임.

`pre-line` 적용으로 2번은 해소된다. 1번은 문단 `gap` 자체의 조정 문제다.

### 2-B. 조정

문단 `gap`을 축소해 본문이 하나의 덩어리로 읽히게 한다. `lineHeight`(1.75)는 **변경하지 않는다** — 가독성 기준값이다.

| 위치 | 파일 | 현행 | 변경 |
|---|---|---|---|
| 데스크톱 영문 래퍼 | ContentArea.tsx L318 | `gap: 18` | `gap: 12` |
| 데스크톱 한글 래퍼 | ContentArea.tsx L321 | `gap: 18` | `gap: 12` |
| 모바일 영문 래퍼 | MobileProjectWall.tsx L260 | `gap: 14` | `gap: 10` |
| 모바일 한글 래퍼 | MobileProjectWall.tsx L263 | `gap: 14` | `gap: 10` |

### 2-C. 영문↔한글 사이 간격은 유지

데스크톱 바깥 래퍼 `gap: 24`, 모바일 바깥 래퍼 `gap: 20`은 **변경하지 않는다.** 문단 간격이 좁아지면서 언어 블록 간 분리가 상대적으로 더 뚜렷해지며, 이는 의도한 위계다(문단 < 언어 블록).

---

## 3. 검증

`npx tsc --noEmit` 만 실행한다. `npm run dev` / `npm run build`는 실행하지 않는다.

스타일 값 변경이므로 `tsc`는 회귀를 잡지 못한다. 다음을 육안 확인한다.

- **The Whale** 본문: 영문이 3줄로 분리되는가 (`3110, Seoul` / `Cenozoic era...` / `Extinct Animal...`), 그 아래 `(to be updated)`가 별도 문단 간격으로 떨어지는가.
- 한글 본문 4줄의 간격이 이전보다 좁아졌는가.
- 데스크톱·모바일 양쪽 확인.
- 다른 프로젝트의 기존 본문 슬라이드가 깨지지 않았는가 (문단 입력이 정상인 프로젝트에서 간격만 좁아지고 구조는 불변이어야 한다).

---

## 4. 변경 파일 목록

| 파일 | 변경 |
|---|---|
| `src/components/ContentArea.tsx` | `renderBlocks`: `whiteSpace` `normal`→`pre-line`. `TextSlideView`: 영문·한글 래퍼 `gap` 18→12 |
| `src/components/MobileProjectWall.tsx` | `renderMobileBlocks`: `whiteSpace: 'pre-line'` 추가. `MobileTextSlide`: 영문·한글 래퍼 `gap` 14→10 |

스키마·타입·GROQ·데이터 변경 없음.

---

## 5. 제약

- `lineHeight: 1.75`는 변경하지 않는다.
- 영문↔한글 바깥 래퍼 `gap`(데스크톱 24 / 모바일 20)은 변경하지 않는다.
- `TEXT_SLIDE_W`(560), `QUOTE_SLIDE_W`(460), `INFO_SLIDE_W`(200) 상수 변경 금지.
- `useRingWall.ts` 수정 금지.
- Portable Text 파싱 로직(`block.children` 순회)은 변경하지 않는다. 본 수정은 CSS 속성 변경만으로 완결된다.
- 측정 반응형 패턴 금지 — `getBoundingClientRect`, 콘텐츠 측정용 `ResizeObserver`, `offsetWidth` 기반 레이아웃을 도입하지 않는다.
- `quoteSlide`·`creditsSlide`·`imageSlide` 캡션 렌더러는 건드리지 않는다.
