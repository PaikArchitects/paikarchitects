# DESIGN_SYSTEM_SPEC.md
## Paik Architecture — 색상 시스템 · 네비게이션 · 프로젝트 섹션 기반 수정
**버전:** v2 | **기준일:** 2026.06.08
**이 파일은 향후 동일 항목 변경 시 덮어씌워 재사용한다.**

---

## v1 → v2 변경 내용

- 네비게이션 폰트 크기: 15px → **18px**
- 네비게이션 항목 재구성: WORK/ABOUT/CONTACT → **ABOUT / WORKS / ESSAYS / CONTACTS**
- Essays 페이지 스텁 신규 생성

---

## 사전 작업

아래 파일의 현재 코드를 GitHub raw URL로 fetch한 뒤 시작한다.

```
https://raw.githubusercontent.com/PaikArchitects/paikarchitects/main/src/app/globals.css
https://raw.githubusercontent.com/PaikArchitects/paikarchitects/main/src/app/page.tsx
https://raw.githubusercontent.com/PaikArchitects/paikarchitects/main/src/app/work/page.tsx
https://raw.githubusercontent.com/PaikArchitects/paikarchitects/main/src/data/projects.ts
```

---

## 1. 색상 시스템 (v1과 동일, 확인만)

v1에서 이미 적용된 항목이다. 재적용하지 않되, 누락된 경우에만 처리한다.

- 배경색: `#080706` + `#FFFFFF` 두 가지만 허용, `#F8F6F2` 완전 제거
- PALETTE 폴백: 모든 값 `#080706`
- work/page.tsx, about/page.tsx: `#F8F6F2` → `#FFFFFF`
- globals.css: Pretendard CDN import 존재 확인

---

## 2. ACP 모노그램 + 네비게이션 색상 자동 전환 (v1과 동일, 확인만)

v1에서 이미 적용됨. 누락 시만 처리한다.

- `mix-blend-mode: difference` 방식은 **사용하지 않는다**
- `.light-panel` 클래스 기반 색상 전환 방식 사용
- 어두운 배경: `#FFFFFF`, 밝은 배경: `#080706` — 회색 없음

---

## 3. 플로팅 네비게이션 — 항목·폰트 수정 (v2 신규)

### 3-A. 항목 재구성

기존 Work / About / Contact 를 제거하고 아래 순서로 교체한다.

```
ABOUT      → /about
WORKS      → /work
ESSAYS     → /essays
CONTACTS   → /contact
```

링크 경로: `/about`, `/work`, `/essays`, `/contact`

### 3-B. 폰트 크기

```tsx
fontSize: '18px',      // 15px → 18px
fontWeight: 300,       // 유지
lineHeight: '1.8',     // 유지
textAlign: 'right',    // 유지
```

---

## 4. Essays 페이지 스텁 생성 (v2 신규)

`src/app/essays/page.tsx` 파일을 신규 생성한다.
내용은 최소한의 스텁으로 충분하다.

```tsx
// src/app/essays/page.tsx
export default function EssaysPage() {
  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#080706',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <p style={{
        color: '#ffffff',
        fontFamily: 'sans-serif',
        fontSize: '14px',
        fontWeight: 300,
        letterSpacing: '0.1em',
        opacity: 0.4,
      }}>
        Essays — Coming Soon
      </p>
    </main>
  );
}
```

---

## 5. 프로젝트 섹션 텍스트 패널 수직 정렬 (v1과 동일, 확인만)

v1에서 적용됨. 누락 시만 처리한다.

```tsx
justifyContent: 'flex-start',
alignItems: 'flex-start',
paddingTop: '48px',
paddingLeft: '40px',
```

---

## 6. 검증 체크리스트

- [ ] 플로팅 nav 항목이 ABOUT / WORKS / ESSAYS / CONTACTS 순서로 표시됨
- [ ] 폰트 크기가 이전보다 명확히 크게 보임 (18px)
- [ ] /essays 페이지가 404 없이 접근됨
- [ ] #F8F6F2 잔존 여부 없음
- [ ] PALETTE 폴백 컬러 없음 (모두 #080706)

---

*v2 — 2026.06.08 | 네비게이션 폰트 18px, 항목 재구성(ABOUT/WORKS/ESSAYS/CONTACTS), Essays 스텁 추가*
