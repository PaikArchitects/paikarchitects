# 슬라이드 필드 로케일 마이그레이션 명세 — 260716

## 0. 배경과 목적

i18n 커밋(9ee768c) 배포가 빌드 실패로 라이브에 오르지 못하고 있다. 원인은 확정됨:

```
Error occurred prerendering page "/work/orion-new-office"
TypeError: Cannot read properties of undefined (reading 'map')
    at LandingExperience.tsx
```

스키마·타입·렌더러는 슬라이드 필드(caption/label/description/body)를 `{ en, ko }` 로케일 오브젝트로 기대하도록 바뀌었으나, **production 데이터의 해당 필드는 아직 구형(문자열/블록배열)** 이다. 렌더러가 `slide.body.en.map(...)` 등 `.en` 경로를 읽는데 구형 데이터엔 `.en`이 없어 `undefined.map()`으로 터진다.

title은 앞서 migrate-title.ts로 이전 완료됨. 이 명세는 **나머지 슬라이드 로케일 필드를 구형 → 신형으로 이전**해 데이터를 스키마와 일치시킨다. 이전 후 빌드가 통과하고 라이브가 정상화된다.

## 0-A. 확정된 마이그레이션 대상 (production 전수 집계 근거)

| 필드 | 구형 잔존 | 비고 |
|---|---|---|
| imageSlide.caption | 2건 | 나머지 76건은 빈 값(대상 아님) |
| diagramItem.label | 15건 | |
| diagramItem.description | 15건 | |
| textSlide.body | 1건 | 블록 배열 |
| quoteSlide.text | 0건 | 인스턴스 없음 — 대상 아님 |

**대상 프로젝트 3개**: National Medical Administration Complex(8건), Orion New Office(13건), The-K Yedaham(12건). 총 33건.

> 신형({en,ko})은 현재 0건이므로, "이미 오브젝트인 것 건너뛰기" 분기가 반드시 필요하다(재실행 안전성). 아래 §2 판별 참조.

---

## 1. 변환 규칙 — 필드별 래핑

모든 변환은 **구형 값을 `en`에 넣고 `ko`는 설정하지 않는다**(undefined로 둔다 — 한글은 이후 Studio에서 수동 입력). `ko`를 빈 문자열이나 빈 배열로 넣지 말 것(en 필수·ko 선택 계약 위반, 렌더러의 `slide.x.ko &&` 가드가 빈 값을 렌더하려 시도할 수 있음).

### 1-A. caption (imageSlide) — 문자열 → localeString
```
구형: caption: "THREE PROGRAMS — Office, amenity, and parking"
신형: caption: { _type: 'localeString', en: "THREE PROGRAMS — Office, amenity, and parking" }
```

### 1-B. label (diagramItem) — 문자열 → localeString
```
구형: label: "MASS 01"
신형: label: { _type: 'localeString', en: "MASS 01" }
```

### 1-C. description (diagramItem) — 문자열 → localeText
```
구형: description: "Description to be added."
신형: description: { _type: 'localeText', en: "Description to be added." }
```

### 1-D. body (textSlide) — Portable Text 배열 → localePortableText
```
구형: body: [ { _type: 'block', _key: '...', children: [...], ... }, ... ]
신형: body: { _type: 'localePortableText', en: [ {block}, {block}, ... ] }
```
> body는 en이 **배열**이다(caption/label/description은 en이 문자열). 구형 블록 배열을 통째로 en에 넣는다. **블록 내부의 _key는 보존**한다(Sanity가 배열 항목 식별에 사용).

> `_type` 명시: Sanity object 필드는 patch 시 `_type`을 넣어주는 것이 안전하다. 스키마 타입명(localeString/localeText/localePortableText)과 일치시킨다.

---

## 2. 스크립트 — `scripts/migrate-slide-locales.ts`

migrate-title.ts의 관례를 승계한다. 토큰은 `.env.local`의 `SANITY_API_TOKEN`(SANITY_WRITE_TOKEN 아님). 실행: `npx tsx --env-file=.env.local scripts/migrate-slide-locales.ts [--dry-run]`.

### 처리 로직

1. 전체 project 문서를 fetch (slides 포함). **드래프트 포함** 여부는 migrate-title.ts와 동일하게 맞춘다(라이브 데이터셋 대상).
2. 각 문서의 `slides[]`를 순회하며, 슬라이드 `_type`별로 대상 필드를 판별·변환.
3. **판별(재실행 안전)**: 각 필드가 이미 신형인지 확인. 판별 기준은 **값이 객체이고 `en` 키를 가지는지**.
   - caption/label/description: `typeof value === 'object' && value !== null && 'en' in value` → 이미 신형, 건너뜀.
   - body: `Array.isArray(value)` → 구형(배열). `typeof value === 'object' && !Array.isArray(value) && 'en' in value` → 신형, 건너뜀. **주의**: body는 구형이 배열, 신형이 객체이므로 판별이 반대다.
4. 변환이 필요한 슬라이드가 하나라도 있으면 문서 전체 `slides` 배열을 새로 구성해 `patch(id).set({ slides: newSlides })`.
5. `--dry-run`이면 patch 대신 변환 예정 내역만 출력(문서 id, 슬라이드 인덱스, 필드, 구형 값 앞 40자).
6. 실행 후 검증: 전체 재조회해 대상 필드의 신형 건수를 집계 출력(33건이 신형이 됐는지, 구형 잔존 0인지).

### diagramSetSlide 주의
`diagramSetSlide`는 `items[]` 배열 안에 label·description이 있다. 슬라이드 순회 시 `_type === 'diagramSetSlide'`이면 `items`를 다시 순회해 각 item의 label·description을 변환한다. items 각 항목의 `_key`는 보존한다.

### 빈 값 처리
caption이 빈 값(null/undefined/빈 문자열)인 76건은 **건드리지 않는다**. 변환 대상은 "구형이면서 값이 있는" 것뿐이다. 빈 값을 `{ en: '' }`로 만들면 en 필수 계약을 값 없이 충족시키는 꼴이 되어 부적절하다.

---

## 3. 검증 및 배포 순서

**반드시 이 순서를 지킨다** (데이터가 코드보다 먼저).

1. `npx tsx --env-file=.env.local scripts/migrate-slide-locales.ts --dry-run` — 33건 변환 예정 확인, 오류 없음 확인.
2. `npx tsx --env-file=.env.local scripts/migrate-slide-locales.ts` — 실제 실행.
3. 스크립트 말미 검증 출력에서 **대상 필드 신형 33건 / 구형 잔존 0** 확인.
4. Vercel Deployments에서 **Redeploy** 트리거(9ee768c 커밋 그대로). 데이터가 이제 신형이므로 `/work/orion-new-office` prerender가 통과해야 한다.
5. 빌드 성공 확인 → 라이브에서 orion-new-office 열어 슬라이드(캡션·다이어그램·본문) 정상 렌더 확인.

> 코드는 이미 origin/main(9ee768c)에 있고 변경 없음. push할 것 없음. 데이터만 바꾸고 Vercel 재배포하면 된다. 재배포는 커밋 변경 없이 Vercel 대시보드에서 수동 트리거(가장 최근 실패 배포의 ⋯ → Redeploy).

---

## 4. 이번 마이그레이션 후에도 남는 것 (기록)

- **ko는 전부 비어 있다.** 이 스크립트는 구형 값을 en에만 넣는다. 한글 병기(ko)는 콘텐츠 작업으로 Studio에서 수동 입력. 즉 이전 직후 라이브는 슬라이드 텍스트가 영문만 표시된다(정상 — ko 없으면 영문만 렌더가 설계 의도).
- **"Description to be added." 같은 플레이스홀더**가 en에 그대로 들어간다(National Medical, The-K Yedaham의 다수). 이는 실제 콘텐츠로 교체 대상이나 마이그레이션 범위 아님.
- **명세 결함 교훈**: I18N_BILINGUAL_SPEC_260716 §9가 "슬라이드 필드는 대부분 비어 있어 마이그레이션 불요"라고 추정했으나 33건이 구형으로 존재했고, 이것이 빌드 실패를 유발했다. 검증하지 않은 추정을 마이그레이션 범위에서 제외한 것이 원인. 향후 마이그레이션 범위 결정은 반드시 데이터 전수 집계 후 확정한다.

---

## 실행 프롬프트 (Claude Code)

```
MIGRATE_SLIDE_LOCALE_SPEC_260716.md 파일을 읽고 scripts/migrate-slide-locales.ts를 작성해줘.
필드별 변환 규칙(§1)과 재실행 안전 판별(§2, 특히 body는 구형이 배열/신형이 객체라 판별이 반대인 점)을 정확히 지키고,
diagramSetSlide는 items 배열 안의 label·description을 변환하되 _key를 보존해줘.
먼저 --dry-run으로 33건 변환 예정을 보여주고, 내가 확인하면 실제 실행해줘.
토큰은 .env.local의 SANITY_API_TOKEN을 --env-file로 읽어.
```
