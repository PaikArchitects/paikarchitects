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
