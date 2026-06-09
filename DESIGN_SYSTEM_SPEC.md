# DESIGN_SYSTEM_SPEC.md
## Paik Architecture — globals.css 전면 정리
**버전:** v2  
**적용 파일:** `src/app/globals.css` (전체 교체)  
**실행 방법:** `DESIGN_SYSTEM_SPEC.md 파일을 읽고 명세대로 구현해줘`

---

## 목표

1. 파손된 중복 Pretendard import 제거 (두 번째 `@import` 라인의 URL이 `@` 누락으로 파손됨)
2. 현재 코드베이스에서 사용되지 않는 레거시 CSS 클래스 전면 삭제
3. `@theme` 블록을 현행 색상 시스템으로 업데이트 (DM Sans / Cormorant Garamond / #F0EBE2 제거)
4. `body` 기본 폰트를 Pretendard로 통일

---

## 삭제 대상 확인

아래 클래스·keyframe은 현재 모든 컴포넌트(page.tsx / work/page.tsx / SiteHeader.tsx / about/page.tsx)에서 인라인 스타일로 대체되어 CSS 클래스를 전혀 참조하지 않음. 전면 삭제.

| 대상 | 비고 |
|---|---|
| `.project-card` 및 하위 modifier 전체 | work/page.tsx에서 인라인 스타일로 재구현됨 |
| `.grid-row`, `.grid-row-2-wide` 등 전체 | 미사용 |
| `.site-header`, `.site-header-name` 등 전체 | SiteHeader.tsx가 인라인 스타일 사용 |
| `.site-footer`, `.site-footer-left/right` | 미사용 |
| `@keyframes kenBurns` | 미사용 |
| `@keyframes fadeUp` | 미사용 |
| `@theme` 내 `--font-display`, `--font-ui`, `--color-site-dim`, `--color-site-muted` | 미사용 |

**유지 대상:** `.entry-spinner`, `.wordmark-container` 및 하위 전체, `@keyframes spin`, `@keyframes shimmerReveal` — page.tsx에서 className으로 직접 참조.

---

## 최종 globals.css 전체 내용

아래 내용으로 `src/app/globals.css`를 **전체 교체**한다. 기존 내용 삭제 후 아래로 덮어쓴다.

```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');

/* ── ENTRY SPINNER ── */
.entry-spinner {
  width: 32px;
  height: 32px;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  border-top-color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── SHIMMER REVEAL ── */
.wordmark-container.shimmer-active {
  -webkit-mask-image: linear-gradient(
    90deg,
    transparent 0%,
    black 30%,
    black 70%,
    transparent 100%
  );
  -webkit-mask-size: 200% 100%;
  mask-image: linear-gradient(
    90deg,
    transparent 0%,
    black 30%,
    black 70%,
    transparent 100%
  );
  mask-size: 200% 100%;
  animation: shimmerReveal 1.2s ease-out forwards;
}

@keyframes shimmerReveal {
  0%   { -webkit-mask-position: -100% center; mask-position: -100% center; }
  100% { -webkit-mask-position: 100% center;  mask-position: 100% center; }
}

/* ── WORDMARK ── */
.wordmark-container {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  font-size: 56px;
  line-height: 1;
  letter-spacing: -0.01em;
  white-space: nowrap;
  user-select: none;
  cursor: default;
}

.wordmark-container .word {
  display: inline-flex;
  align-items: baseline;
  overflow: hidden;
}

.wordmark-container .rest {
  display: inline-block;
  max-width: 400px;
  overflow: hidden;
  opacity: 1;
  white-space: nowrap;
  vertical-align: baseline;
  transition:
    max-width 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    opacity   0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.wordmark-container .word-space {
  display: inline-block;
  width: 0.3em;
  max-width: 0.3em;
  overflow: hidden;
  opacity: 1;
  transition:
    max-width 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    opacity   0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.wordmark-container.collapsed .rest,
.wordmark-container.collapsed .word-space {
  max-width: 0;
  opacity: 0;
}

@media (max-width: 768px) {
  .wordmark-container {
    font-size: 28px;
  }
}

/* ── Design Tokens ── */
@theme {
  --color-site-bg:   #080706;
  --color-site-text: #FFFFFF;
}

/* ── Base ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { height: 100%; }

body {
  background-color: #080706;
  color: #FFFFFF;
  font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100%;
}

::selection {
  background: rgba(255, 255, 255, 0.15);
  color: #FFFFFF;
}
```

---

## 주의사항

- `src/app/work/[slug]/page.tsx` 스텁 파일이 `var(--font-dm-sans)`를 참조하고 있으나, 이는 `next/font/google`이 layout.tsx에서 주입하는 CSS 변수이므로 globals.css 수정과 무관하다. 건드리지 않는다.
- `@import url(...)` 라인은 반드시 파일 최상단(1번째 라인)이어야 한다.
- 교체 후 `next build` 없이 dev 서버에서 즉시 확인 가능하다.

---

*v2 — 2026.06.09*
