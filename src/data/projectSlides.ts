import type { ProjectSlide } from '@/types'

/**
 * 프로젝트별 상세 슬라이드 데이터.
 * key = Project.id (slug)
 * 등록되지 않은 프로젝트는 ContentArea가 coverImage 1장 fallback으로 동작.
 * 캡션/설명 텍스트는 직접 수정 가능. 형식: "LABEL — description"
 */
export const projectSlides: Record<string, ProjectSlide[]> = {
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
      src: 'https://res.cloudinary.com/drsybwqg0/image/upload/v1781127828/DJI_0361_ju2cjq.jpg',
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
