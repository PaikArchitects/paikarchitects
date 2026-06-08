# DESIGN_SYSTEM_SPEC.md
## Paik Architecture — 색상 시스템 · 네비게이션 · 프로젝트 섹션 기반 수정
**버전:** v1 | **기준일:** 2026.06.08
**적용 범위:** Phase 1 (색상) + Phase 5 (네비게이션) + Phase 6 (프로젝트 섹션 텍스트)
**이 파일은 향후 동일 항목 변경 시 덮어씌워 재사용한다.**

---

## 사전 작업

Claude Code는 작업 전 반드시 아래 파일들의 현재 코드를 GitHub raw URL로 fetch한 뒤 시작한다.

```
https://raw.githubusercontent.com/PaikArchitects/paikarchitects/main/src/app/globals.css
https://raw.githubusercontent.com/PaikArchitects/paikarchitects/main/src/app/page.tsx
https://raw.githubusercontent.com/PaikArchitects/paikarchitects/main/src/app/work/page.tsx
https://raw.githubusercontent.com/PaikArchitects/paikarchitects/main/src/data/projects.ts
```

---

## 1. 색상 시스템 통일

### 원칙
배경색은 `#080706` (near-black)과 `#FFFFFF` (pure white) **두 가지만** 허용한다.
`#F8F6F2` (웜 오프화이트)는 프로젝트 전체에서 **완전 제거**한다.

### 1-A. globals.css
- `#F8F6F2` 참조를 모두 `#FFFFFF`로 교체한다.
- CSS 변수로 선언된 경우 변수 값을 `#FFFFFF`로 수정한다.
- Pretendard CDN import가 존재하는지 확인한다. 없으면 파일 최상단에 추가한다:
```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendardv1.3.9/dist/web/variable/pretendardvariable.min.css');
```

### 1-B. projects.ts — PALETTE 폴백 색상
PALETTE 배열의 모든 색상값을 `#080706`으로 교체한다. 배열 길이는 유지한다.
```typescript
// 수정 후 예시 (실제 배열 길이에 맞게 적용)
const PALETTE = [
  '#080706', '#080706', '#080706', '#080706',
  '#080706', '#080706', '#080706', '#080706',
];
```

### 1-C. page.tsx — Work 섹션 배경
Work 섹션에서 교번 배경으로 사용된 색상을 확인한다.
- 어두운 카드 배경: `#080706` 유지
- 밝은 카드 배경: `#F8F6F2` → `#FFFFFF`로 교체

### 1-D. work/page.tsx, about/page.tsx
`#F8F6F2` 참조를 모두 `#FFFFFF`로 교체한다.

---

## 2. ACP 모노그램 + 플로팅 네비게이션 — 색상 자동 전환

### 원칙
- 어두운 배경(#080706, 이미지) 위: 흰색
- 밝은 배경(#FFFFFF) 위: 검정색
- 이 전환은 JS 없이 CSS만으로 구현한다.

### 구현 방법: mix-blend-mode: difference
collapsed 상태의 ACP 모노그램과 플로팅 네비게이션 컨테이너에 아래를 적용한다:

```css
/* 인라인 스타일 또는 CSS 클래스 */
mix-blend-mode: difference;
color: #FFFFFF;
```

`difference` blend mode의 작동 원리:
- 흰 텍스트(#FFFFFF)가 검정 배경(#080706) 위 → 결과: 흰색 (정상 표시)
- 흰 텍스트(#FFFFFF)가 흰 배경(#FFFFFF) 위 → 결과: 검정색 (자동 반전)

적용 대상:
1. collapsed 워드마크(ACP) 컨테이너: `style={{ mixBlendMode: 'difference', color: '#FFFFFF' }}`
2. 플로팅 nav 컨테이너 전체: 동일 적용

**주의:** mix-blend-mode가 적용된 요소는 `isolation: isolate`가 설정된 부모 안에 있으면 안 된다. 레이아웃 깨짐 발생 시 부모 요소의 isolation 설정을 확인한다.

---

## 3. 플로팅 네비게이션 타이포그래피

### 수정 대상
`src/app/page.tsx` 내 플로팅 우하단 네비게이션 (Work / About / Contact)

### 수정 내용
```tsx
// 현재값이 무엇이든 아래 값으로 교체
fontSize: '15px',
fontWeight: 300,
lineHeight: '1.8',
textAlign: 'right',
// position, bottom, right는 현재값 유지 (fixed, 24px, 24px)
```

항목 간 간격(gap 또는 marginBottom)은 현재값을 유지한다.

---

## 4. 프로젝트 섹션 텍스트 패널 수직 정렬

### 수정 대상
`src/app/page.tsx` 내 Work 섹션의 sticky 텍스트 패널

### 현재 문제
텍스트(연도 / 프로젝트명 / 카테고리·상태)가 100vh 패널의 수직 중앙(50%)에 위치하고 있어,
패널 대부분이 빈 void로 남아 있음.

### 수정 내용
```tsx
// 텍스트 패널 컨테이너 — 수정 전
// justifyContent: 'center' 또는 alignItems: 'center'

// 수정 후
display: 'flex',
flexDirection: 'column',
justifyContent: 'flex-start',
alignItems: 'flex-start',
paddingTop: '48px',
paddingLeft: '40px',
paddingRight: '40px',
```

텍스트 내부 항목 순서 및 스타일 (현재값 유지, 정렬만 변경):
- 연도: 상단 (11px, weight 300, gray)
- 프로젝트명: 그 아래 (24~28px, weight 700)
- 카테고리·상태: 그 아래 (12px, weight 300, gray)

---

## 5. 검증 체크리스트

수정 완료 후 Vercel 배포하여 아래 항목을 순서대로 확인한다.

- [ ] 히어로 배경: 이미지 없는 프로젝트에서 보라색·갈색·녹색 등 컬러 배경이 사라지고 `#080706`만 표시됨
- [ ] globals.css: Pretendard import 존재 확인
- [ ] Work 페이지: 카드 배경에 `#F8F6F2` 없음 (흰색 또는 `#080706`만)
- [ ] ACP 모노그램: Work 섹션 흰 배경 구간 진입 시 검정으로 전환됨
- [ ] 플로팅 nav: Work 섹션 흰 배경 구간 진입 시 검정으로 전환됨
- [ ] 플로팅 nav: 텍스트 크기가 이전보다 명확히 커 보임 (15px, weight 300)
- [ ] 프로젝트 섹션: 텍스트가 패널 상단 좌측에 위치하고, 아래쪽은 비어 있음

---

*v1 — 2026.06.08*
*다음 덮어씌우기 시: 버전 번호와 기준일만 수정*
