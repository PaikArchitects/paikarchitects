# ARCHIVE_SLIDES_SPEC — 전체 프로젝트 커버/슬라이드 데이터 일괄 반영

## 목적
ORION_SLIDES_SPEC으로 구축된 슬라이드 시스템 위에, 나머지 프로젝트들의
커버 이미지와 상세 슬라이드 데이터를 일괄 등록한다.
**컴포넌트 코드는 수정하지 않는다. 데이터 파일 2개만 수정한다.**

## 수정 파일
1. `src/data/projects.ts` — 11개 항목에 coverImage 필드 추가
2. `src/data/projectSlides.ts` — 12개 프로젝트 슬라이드 세트 추가

변경 없는 프로젝트: cloud-tectonic(커버 기존과 동일), wonju-innovation-complex,
kb-kookmin-bank-hq, yeongduk-goraebul-hotel, the-whale (데이터 미보유 — coverColor 유지)

검증: `npx tsc --noEmit`

---

## 1. projects.ts — coverImage 추가 (11개 항목)

각 항목에서 **coverImage 필드만 추가**한다. 다른 필드는 수정하지 않는다.

| id | coverImage |
|---|---|
| `gwacheon-12th-apartment` | `https://res.cloudinary.com/drsybwqg0/image/upload/v1781137003/Perspective_view_01_resize_fz5hhk.jpg` |
| `garak-wholesale-market` | `https://res.cloudinary.com/drsybwqg0/image/upload/v1781135250/02_%EC%88%98%EC%82%B0%EB%8F%99___%ED%88%AC%EC%8B%9C%EB%8F%84_02_ilx2n3.jpg` |
| `the-k-yedaham` | `https://res.cloudinary.com/drsybwqg0/image/upload/v1781135012/Seq_A_002_skqmbz.jpg` |
| `arario-gallery` | `https://res.cloudinary.com/drsybwqg0/image/upload/v1781134896/Temp_1_uyvkvj.png` |
| `jinju-sports-cloud` | `https://res.cloudinary.com/drsybwqg0/image/upload/v1781134846/Aerial_Ortho_rev_resize_twqkf2.jpg` |
| `orion-new-factory` | `https://res.cloudinary.com/drsybwqg0/image/upload/v1781133745/1_scene_9_resize_scixqu.jpg` |
| `chungnam-convention-center` | `https://res.cloudinary.com/drsybwqg0/image/upload/v1781133662/31_Conference_Hall_resize_nrwztx.jpg` |
| `national-medical-complex` | `https://res.cloudinary.com/drsybwqg0/image/upload/v1781133071/CG_Aerial_view_03_oignve.jpg` |
| `space-group-new-office` | `https://res.cloudinary.com/drsybwqg0/image/upload/v1781132868/Axono_khy2rn.png` |
| `seongnae-complex` | `https://res.cloudinary.com/drsybwqg0/image/upload/v1781132512/%EC%82%B0%EC%88%98%ED%99%94_%EC%B5%9C%EC%A2%85_nyzj28.png` |
| `unprecedented-resort` | `https://res.cloudinary.com/drsybwqg0/image/upload/v1781131979/Siteplan_Partial_resize_qdr3cg.jpg` |

> URL의 퍼센트 인코딩(%EC%88%98... 등)은 그대로 복사할 것. 디코딩하지 않는다.

---

## 2. projectSlides.ts — 슬라이드 세트 추가 (12개)

기존 `'orion-new-office'` 항목은 그대로 두고, 같은 Record 안에 아래 항목들을 추가한다.

슬라이드 순서 원칙 (기존 합의): Hero → 다이어그램(개념/매스) → 나머지 CG/사진.
다이어그램 description은 추후 직접 수정 예정인 placeholder임 — 그대로 입력할 것.

```typescript
'independence-memorial-hall': [
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1780299792/01_THRESHOLD_amtokp.png' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781131281/CG_Aerial_View_resize_v5cxwe.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781131284/Isometric_resize_h6k6vk.jpg' },
],

'gwacheon-12th-apartment': [
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781137003/Perspective_view_01_resize_fz5hhk.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781137009/Perspective_view_03_resize_ispzrg.jpg' },
],

'garak-wholesale-market': [
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781135250/02_%EC%88%98%EC%82%B0%EB%8F%99___%ED%88%AC%EC%8B%9C%EB%8F%84_02_ilx2n3.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781136755/22_%EC%88%98%EC%82%B0%EB%8F%99___%EB%8B%A8%EB%A9%B4%ED%88%AC%EC%8B%9C%EB%8F%84_01_ymyurt.png' },
],

'the-k-yedaham': [
  // Hero
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781135012/Seq_A_002_skqmbz.jpg' },
  // 매스 프로세스 (라벨 번호순 01→06. 업로드 순서와 다름 — 아래 순서를 따를 것)
  {
    kind: 'diagramSet',
    autoAdvanceMs: 3000,
    items: [
      { src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781135048/Diagram_Mass_A_01_yvfhiu.png', label: 'MASS 01', description: 'Description to be added.' },
      { src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781135052/Diagram_Mass_A_02_a6alja.png', label: 'MASS 02', description: 'Description to be added.' },
      { src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781135056/Diagram_Mass_A_03_qtujyv.png', label: 'MASS 03', description: 'Description to be added.' },
      { src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781135061/Diagram_Mass_A_04_cyjwmh.png', label: 'MASS 04', description: 'Description to be added.' },
      { src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781135069/Diagram_Mass_A_05_qzrnlx.png', label: 'MASS 05', description: 'Description to be added.' },
      { src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781135065/Diagram_Mass_A_06_lxetjc.png', label: 'MASS 06', description: 'Description to be added.' },
    ],
  },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781135033/Aerial_001_resize_yfxibz.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781135114/Pers_A_001_hexgyp.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781135110/Pers_B_001_wvxaab.jpg' },
],

'arario-gallery': [
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781134896/Temp_1_uyvkvj.png' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781134901/Temp_2_olhf8q.png' },
],

'jinju-sports-cloud': [
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781134846/Aerial_Ortho_rev_resize_twqkf2.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781134843/Aerial_002_resize_ynwtkf.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781134841/Inner_Pool_001_resize_u38qan.jpg' },
],

'orion-new-factory': [
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781133745/1_scene_9_resize_scixqu.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781133750/%EC%98%A4%EB%A6%AC%EC%98%A8_%EA%B8%80%EB%A1%9C%EB%B8%8C_fggsdm.jpg' },
],

'chungnam-convention-center': [
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781133662/31_Conference_Hall_resize_nrwztx.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781133667/23_Outer_East_resize_t8izcp.jpg' },
],

'national-medical-complex': [
  // Hero
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781133071/CG_Aerial_view_03_oignve.jpg' },
  // 아이디어 다이어그램 4단계
  {
    kind: 'diagramSet',
    autoAdvanceMs: 3000,
    items: [
      { src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781133245/Idea-01_trmf56.png', label: 'IDEA 01', description: 'Description to be added.' },
      { src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781133248/Idea-02_ao8ago.png', label: 'IDEA 02', description: 'Description to be added.' },
      { src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781133251/Idea-03_q6jgv3.png', label: 'IDEA 03', description: 'Description to be added.' },
      { src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781133255/Idea-04_rtkuud.png', label: 'IDEA 04', description: 'Description to be added.' },
    ],
  },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781133088/CG_Aerial_view_02_viwawu.jpg' },
],

'space-group-new-office': [
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781132868/Axono_khy2rn.png' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781132865/Axono_D_fbf7iv.png' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781132846/Aerial_008_resize_sxsfra.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781132983/Section_pers_Mark_resize_utafde.jpg' },
],

'seongnae-complex': [
  // Hero — 산수화 컨셉 이미지
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781132512/%EC%82%B0%EC%88%98%ED%99%94_%EC%B5%9C%EC%A2%85_nyzj28.png' },
  // 조감/투시
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781132651/0522_%EC%A1%B0%EA%B0%90%EB%8F%841_002_emechm.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781132653/0522_%ED%88%AC%EC%8B%9C%EB%8F%841_001_eo4tct.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781132649/0522_%EC%A1%B0%EA%B0%90%EB%8F%842_001_anqcvb.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781132646/0522_%ED%88%AC%EC%8B%9C%EB%8F%842_001_csurr1.jpg' },
  // 시퀀스 SQ1→SQ9 (번호순. 업로드 순서와 다름 — 아래 순서를 따를 것)
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781132622/0522-SQ1_001_wcbkmr.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781132640/0522-SQ2_001_dldmfw.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781132643/0522-SQ3_001_w9olqb.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781132625/0522-SQ4_001_rk5zrg.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781132627/0522-SQ5_001_addmlz.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781132630/0522-SQ6_002_kvczqi.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781132632/0522-SQ7_002_zygs1d.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781132635/0522-SQ8_001_wo7u06.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781132637/0522-SQ9_001_yc7h1x.jpg' },
],

'unprecedented-resort': [
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781131979/Siteplan_Partial_resize_qdr3cg.jpg' },
  { kind: 'image', src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781131855/03_Aerial_02_xqkjys.jpg' },
],
```

---

## 3. 구현 시 주의사항

1. **URL 검증**: 모든 URL은 위 표·코드에서 그대로 복사한다. 퍼센트 인코딩 유지.
2. **순서 재배열 2건**: The-K 매스 다이어그램(05/06)과 성내동 SQ 시퀀스는
   업로드 순서가 아닌 **위 명세의 번호순**을 따른다.
3. cloud-tectonic은 수정하지 않는다 (기존 coverImage가 제공 이미지와 동일).
4. 슬라이드 데이터가 없는 프로젝트(wonju, kb-kookmin, yeongduk, the-whale)는
   기존 fallback(coverColor)으로 동작 — 수정 불필요.
5. 'Description to be added.' placeholder는 의도된 값임. 임의로 채우지 말 것.

## 4. 검증

```bash
npx tsc --noEmit
```
