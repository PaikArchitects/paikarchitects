# WORK_SECTION_SPEC.md
## Paik Architecture — Work Section 레이아웃 재설계
**버전:** v1  
**적용 파일:** `src/app/page.tsx` (work section 부분만 수정)  
**실행 방법:** `WORK_SECTION_SPEC.md 파일을 읽고 명세대로 구현해줘`

---

## 목표

현재 50:50 sticky split을 **20:80 (텍스트:이미지)** 비율로 전환한다.
이미지가 화면의 80%를 점유하고, 텍스트는 좁은 스트립으로 배치되어
이미지 중심의 어두운 composition을 구현한다.

---

## 1. 변경 전 / 후 비교

| 항목 | 현재 | 변경 후 |
|---|---|---|
| 텍스트 패널 width | 50% | **20%** |
| 이미지 패널 width | 50% | **80%** |
| 행 height | `height: '100vh'` | **이미지 aspectRatio가 결정** |
| 이미지 비율 (데스크톱) | 100vh (가변) | **3:4 portrait** |
| 이미지 비율 (모바일) | 60vw height | **9:16 portrait** |
| 모바일 텍스트 카드 | 가변 높이 | **1:1 정방형** |
| 텍스트 수직 위치 | flex-start (top 48px) | **flex-end (bottom 48px)** |
| 프로젝트명 크기 | 26px w600 | **18px w700** |
| alignItems | stretch | **flex-start** |

---

## 2. 데스크톱 레이아웃 (≥768px)

### 2-1. 행(row) 컨테이너

현재:
```jsx
<div key={p.id} style={{ display: 'flex', height: '100vh' }}>
```

변경 후:
```jsx
<div key={p.id} style={{ display: 'flex', alignItems: 'flex-start' }}>
```

`height: '100vh'` **삭제**, `alignItems: 'flex-start'` **추가**.
행의 높이는 이미지 패널의 aspectRatio가 결정한다.

---

### 2-2. 텍스트 패널

현재:
```jsx
<div
  className={textOnLeft ? 'light-panel' : undefined}
  style={{
    width: '50%',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: '48px',
    paddingLeft: '40px',
    paddingRight: '40px',
    background: textBg,
    color: textColor,
    fontFamily: FONT,
  }}
>
```

변경 후:
```jsx
<div
  className={textOnLeft ? 'light-panel' : undefined}
  style={{
    width: '20%',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingTop: 96,
    paddingBottom: 48,
    paddingLeft: 24,
    paddingRight: 16,
    background: textBg,
    color: textColor,
    fontFamily: FONT,
    boxSizing: 'border-box' as const,
  }}
>
```

**변경 요약:**
- `width`: 50% → **20%**
- `justifyContent`: flex-start → **flex-end** (텍스트 하단 배치)
- `paddingTop`: 48px → **96px** (ACP 모노그램 영역 클리어, top:16px + height:56px + 여백)
- `paddingBottom`: 없음 → **48px**
- `paddingLeft`: 40px → **24px** (ACP left:20px와 근접 정렬)
- `paddingRight`: 40px → **16px**
- `boxSizing: 'border-box'` 추가

---

### 2-3. 이미지 패널

현재:
```jsx
<div style={{ width: '50%', flexShrink: 0, minHeight: '100vh', overflow: 'hidden' }}>
```

변경 후:
```jsx
<div style={{
  width: '80%',
  flexShrink: 0,
  aspectRatio: '3/4',
  overflow: 'hidden',
}}>
```

**변경 요약:**
- `width`: 50% → **80%**
- `minHeight: '100vh'` → **삭제**
- `aspectRatio: '3/4'` **추가** (세로로 긴 portrait 비율, height = width × 4/3)

이미지/플레이스홀더 자식 요소(`imgEl`)의 인라인 스타일은 기존 그대로 유지:
```jsx
style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
```

---

### 2-4. textContent 타이포그래피

현재:
```jsx
const textContent = (
  <div>
    <div style={{ fontSize: 11, fontWeight: 300, color: gray, marginBottom: 8 }}>
      {p.year}
    </div>
    <div style={{ fontSize: 26, fontWeight: 600, marginBottom: 8 }}>
      <Link ...>{p.title}</Link>
    </div>
    <div style={{ fontSize: 12, fontWeight: 300, color: gray }}>
      {p.type} · {p.status}
    </div>
  </div>
)
```

변경 후:
```jsx
const textContent = (
  <div>
    <div style={{ fontSize: 11, fontWeight: 300, color: gray, marginBottom: 6 }}>
      {p.year}
    </div>
    <div style={{
      fontSize: 18,
      fontWeight: 700,
      lineHeight: 1.2,
      marginBottom: 8,
      wordBreak: 'keep-all' as const,
    }}>
      <Link href={`/work/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
        {p.title}
      </Link>
    </div>
    <div style={{ fontSize: 12, fontWeight: 300, color: gray }}>
      {p.type} · {p.status}
    </div>
  </div>
)
```

**변경 요약:**
- 프로젝트명 `fontSize`: 26px → **18px**
- 프로젝트명 `fontWeight`: 600 → **700**
- `lineHeight: 1.2` **추가** (좁은 컬럼에서 2줄 줄간격)
- `wordBreak: 'keep-all'` **추가** (한국어 단어 단위 줄바꿈)
- year `marginBottom`: 8 → **6** (소폭 압축)

---

## 3. 모바일 레이아웃 (<768px)

`if (mobile)` 분기 내부 전체를 아래로 교체한다.

현재:
```jsx
if (mobile) {
  return (
    <div key={p.id}>
      <div style={{ width: '100%', height: '60vw', overflow: 'hidden' }}>
        {imgEl}
      </div>
      <div style={{ padding: 24, background: textBg, color: textColor, fontFamily: FONT }}>
        <div style={{ fontSize: 11, fontWeight: 300, color: gray, marginBottom: 8 }}>
          {p.year}
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          <Link ...>{p.title}</Link>
        </div>
        <div style={{ fontSize: 12, fontWeight: 300, color: gray }}>
          {p.type} · {p.status}
        </div>
      </div>
    </div>
  )
}
```

변경 후:
```jsx
if (mobile) {
  return (
    <div key={p.id}>
      {/* 이미지 블록: 9:16 portrait */}
      <div style={{ width: '100%', aspectRatio: '9/16', overflow: 'hidden' }}>
        {imgEl}
      </div>
      {/* 텍스트 카드: 1:1 정방형, 텍스트 하단 배치 */}
      <div style={{
        width: '100%',
        aspectRatio: '1/1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 24,
        background: textBg,
        color: textColor,
        fontFamily: FONT,
        boxSizing: 'border-box' as const,
      }}>
        <div style={{ fontSize: 11, fontWeight: 300, color: gray, marginBottom: 6 }}>
          {p.year}
        </div>
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1.2,
          marginBottom: 8,
          wordBreak: 'keep-all' as const,
        }}>
          <Link href={`/work/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            {p.title}
          </Link>
        </div>
        <div style={{ fontSize: 12, fontWeight: 300, color: gray }}>
          {p.type} · {p.status}
        </div>
      </div>
    </div>
  )
}
```

**변경 요약:**
- 이미지: `height: '60vw'` → `aspectRatio: '9/16'`
- 텍스트 카드: `padding: 24` → `aspectRatio: '1/1'` + `justifyContent: 'flex-end'` + `boxSizing: 'border-box'`
- 프로젝트명: `fontSize: 20 / fontWeight: 600` → **fontSize: 16 / fontWeight: 700**
- `wordBreak: 'keep-all'` 추가

---

## 4. 변경하지 않는 항목

아래는 이 스펙의 범위 밖이므로 **수정하지 않는다.**

- `workProjects` 필터·정렬 로직
- `textOnLeft`, `textBg`, `textColor`, `gray` 색상 변수 계산 로직
- `imgEl` 정의 (이미지 / 플레이스홀더 분기)
- `.light-panel` className 적용 조건 (`textOnLeft` 기준)
- 좌우 교번 렌더링: `{textOnLeft ? <>{textPanel}{imagePanel}</> : <>{imagePanel}{textPanel}</>}`

---

## 5. 전체 데스크톱 행 구조 (변경 후 최종)

```jsx
return (
  <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start' }}>
    {textOnLeft
      ? <>{textPanel}{imagePanel}</>
      : <>{imagePanel}{textPanel}</>
    }
  </div>
)
```

---

## 6. 구현 후 확인 사항

1. 데스크톱: 이미지 패널이 세로로 긴 3:4 비율로 렌더링되는지 확인
2. 데스크톱: 스크롤 시 텍스트 패널이 100vh 영역 내에서 하단에 고정(sticky)되는지 확인
3. 데스크톱: ACP 모노그램(top:16px, left:20px)과 프로젝트명이 겹치지 않는지 확인
4. 모바일: 이미지가 9:16 세로 비율로, 텍스트 카드가 1:1 정방형으로 렌더링되는지 확인
5. 모바일: 텍스트가 카드 하단에 배치되는지 확인

---

*v1 — 2026.06.09*
