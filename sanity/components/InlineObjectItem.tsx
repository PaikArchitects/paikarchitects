'use client'

import type { ObjectItemProps } from 'sanity'

// 260930 STUDIO_REFINE v2 — 배열 항목을 모달 대신 목록 안에 펼쳐서 편집
// 기본 항목 행(드래그 핸들·메뉴)은 유지하되 클릭해도 모달이 열리지 않게 하고,
// 항목 입력 폼(children)을 행 아래에 항상 렌더한다.
const noop = () => {}

export function InlineObjectItem(props: ObjectItemProps) {
  return (
    <div
      style={{
        border: '1px solid var(--card-border-color, rgba(128,128,128,0.25))',
        borderRadius: 4,
        marginBottom: 12,
      }}
    >
      {props.renderDefault({ ...props, open: false, onOpen: noop })}
      <div style={{ padding: '4px 16px 16px' }}>{props.children}</div>
    </div>
  )
}
