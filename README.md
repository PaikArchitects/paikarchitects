# paikarchitects.com — Test Landing Page

## 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 로컬 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:3000 열기

## 프로젝트 구조

```
src/
├── app/
│   ├── globals.css          ← 디자인 토큰 + 모든 컴포넌트 스타일
│   ├── layout.tsx           ← 루트 레이아웃 (폰트, 메타데이터)
│   ├── page.tsx             ← 홈페이지
│   ├── about/page.tsx       ← About 페이지 (스텁)
│   └── work/[slug]/page.tsx ← 개별 프로젝트 페이지 (스텁)
├── components/
│   ├── Header.tsx           ← 고정 헤더 내비게이션
│   ├── ProjectCard.tsx      ← 개별 프로젝트 카드 (hover 인터랙션)
│   └── ProjectGrid.tsx      ← 비대칭 그리드 레이아웃
├── data/
│   └── projects.ts          ← 23개 프로젝트 데이터 (여기만 수정)
└── types/
    └── index.ts             ← Project 타입 정의
```

## 프로젝트 이미지 교체

`src/data/projects.ts`에서 각 프로젝트의 `coverImage` 필드에 경로를 추가:

```typescript
// 로컬 이미지: public/ 폴더에 이미지 파일 저장 후
coverImage: '/images/independence-memorial-hall.jpg',

// 외부 URL (향후 Cloudinary)
coverImage: 'https://res.cloudinary.com/paikarchitects/...',
```

## GitHub → Vercel 배포

1. https://github.com 에서 계정 생성
2. 새 레포지토리 생성 (예: `paikarchitects`)
3. 이 폴더에서:
   ```bash
   git init
   git add .
   git commit -m "initial"
   git remote add origin https://github.com/YOUR_USERNAME/paikarchitects.git
   git push -u origin main
   ```
4. https://vercel.com → GitHub 연동 → 레포지토리 선택 → Deploy

## 디자인 수정

- **배경색**: `globals.css` → `--color-site-bg` 값 변경
- **그리드 행 비율**: `globals.css` → `.grid-row-2-wide` 등의 `grid-template-columns` 수정
- **카드 높이**: `globals.css` → `.grid-row-2-wide .project-card { height: ... }`
- **정렬 순서**: `projects.ts` → 각 프로젝트의 `displayOrder` 값 수정
- **대형 카드**: `projects.ts` → `featured: true` 설정 (현재 비사용, 향후 확장용)
