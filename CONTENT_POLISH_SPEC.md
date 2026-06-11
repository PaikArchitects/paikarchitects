# CONTENT_POLISH_SPEC — CONTENT_FLOW 검증 후 수정 4건

## 범위
1. 인트로 워드마크 비가시 (흰 배경 위 흰 글자)
2. 슬라이드 높이 80%로 축소 (이미지·다이어그램·크레딧 동일 비율)
3. 슬라이드 간격 1.5배
4. 커서 → 화살표 치환 + 가독성 개선

수정 파일: `src/app/page.tsx`, `src/components/ContentArea.tsx`
검증: `npx tsc --noEmit`

---

## 1. 인트로 워드마크 비가시 수정 (page.tsx)

원인: 색상 effect가 `layoutVisible`(intro 완료 후 true)로 게이트되어,
인트로 재생 중 wordmarkOnLight=false → 워드마크가 흰 배경 위 #FFFFFF로 렌더됨.

```typescript
// BEFORE
setWordmarkOnLight(layoutVisible)
setNavOnLight(layoutVisible)
// AFTER — 랜딩은 셸이 항상 흰색이므로 인트로 중에도 다크 워드마크
setWordmarkOnLight(true)
setNavOnLight(true)
```

effect 의존성 배열에서 더 이상 불필요한 값 정리. 결과: 흰 화면 중앙에
#080706 워드마크로 인트로 재생 → 좌상단 collapse. 비랜딩 경로의 색상 로직
(SiteHeader의 STATIC_LIGHT_PATHS)은 건드리지 않는다.

## 2. 슬라이드 높이 — 현재의 80% (ContentArea.tsx)

| 항목 | BEFORE | AFTER |
|---|---|---|
| image 슬라이드 높이 | 뷰포트의 90% | **72%** |
| diagramSet 이미지 영역 높이 | 뷰포트의 60% | **48%** |
| credits 블록 높이 | 90% | **72%** |

모프 전환(3-B)의 목표 rect 높이 계산도 0.9 → **0.72**로 동일하게 변경
(모프 종착 크기와 트랙 첫 슬라이드 크기가 일치해야 끊김이 없음).

## 3. 슬라이드 간격 (ContentArea.tsx)

```typescript
// 트랙: BEFORE
gap: 16,
// AFTER
gap: 24,
```
slideRects 측정 로직은 offsetLeft 기반이므로 자동 반영됨 — 별도 수정 불필요 확인만 할 것.

## 4. 커서 치환 + 가독성 (ContentArea.tsx)

### 4-A. 네이티브 커서 숨김
글리프가 표시되는 동안 네이티브 커서를 제거한다:

```typescript
// 슬라이드 뷰포트 컨테이너
cursor: isDragging ? 'grabbing' : glyphVisible ? 'none' : 'default',
```

- `glyphVisible` = 커서가 뷰포트 안 + 드래그 중 아님 + 해당 방향 이동 가능
  (첫 슬라이드 중앙에서 좌측 글리프 숨김 시 커서도 복원)
- 다이어그램 내부 영역도 동일 원리: 내부 글리프 표시 중이면 그 영역 cursor: 'none'

### 4-B. 글리프 위치 — 커서 지점에 정확히 치환
```typescript
// BEFORE: 커서에서 (x+20, y) 오프셋
// AFTER: 커서 좌표에 글리프 중심 정렬
left: cursorX, top: cursorY,
transform: 'translate(-50%, -50%)',
```

### 4-C. 가독성
외부 트랙 글리프:
```typescript
fontSize: 64,           // BEFORE 40
fontWeight: 300,        // BEFORE 200
color: '#080706',
// 어두운 사진 위 대비 확보용 흰 헤일로
textShadow: '0 0 10px rgba(255,255,255,0.95), 0 0 3px rgba(255,255,255,0.95)',
```

다이어그램 내부 글리프: fontSize 28, fontWeight 300, 동일 textShadow.
글리프 전환(‹↔›) 시 위치 점프가 없도록 두 방향 모두 동일 anchor 사용.

---

## 검증
```bash
npx tsc --noEmit
```
배포 후: 인트로 다크 워드마크 / 슬라이드 높이 72% / 간격 24px /
커서 자리에 글리프 단독 표시 + 어두운 이미지 위 가독성 확인.
