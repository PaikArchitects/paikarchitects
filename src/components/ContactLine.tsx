import type { CSSProperties, ReactNode } from 'react'
import type { Contact } from '@/types'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

const LIST_LINK: CSSProperties = { color: 'inherit', textDecoration: 'none' }

interface ContactLineProps {
  contact: Contact
  variant: 'inline' | 'list'
}

/** https://www.instagram.com/archipaik/ → @archipaik. 파싱 실패 시 원문 */
function instagramHandle(url: string): string {
  try {
    const handle = new URL(url).pathname.split('/').filter(Boolean)[0]
    return handle ? `@${handle}` : url
  } catch {
    return url
  }
}

/** tel: 링크용 — 공백·하이픈 제거 */
function telHref(phone: string): string {
  return `tel:${phone.replace(/[\s-]/g, '')}`
}

interface Entry {
  key: string
  label: string
  value: ReactNode
}

// 표시 순서: location · email · phone · instagram. 값이 있는 항목만 모은다
function entries(contact: Contact, linkStyle?: CSSProperties): Entry[] {
  const out: Entry[] = []
  if (contact.location) out.push({ key: 'location', label: 'LOCATION', value: contact.location })
  if (contact.email) {
    out.push({ key: 'email', label: 'EMAIL', value: <a href={`mailto:${contact.email}`} style={linkStyle}>{contact.email}</a> })
  }
  if (contact.phone) {
    out.push({ key: 'phone', label: 'PHONE', value: <a href={telHref(contact.phone)} style={linkStyle}>{contact.phone}</a> })
  }
  if (contact.instagram) {
    out.push({
      key: 'instagram',
      label: 'INSTAGRAM',
      value: (
        <a href={contact.instagram} target="_blank" rel="noopener noreferrer" style={linkStyle}>
          {instagramHandle(contact.instagram)}
        </a>
      ),
    })
  }
  return out
}

/**
 * 연락처 공용 렌더 — /about 하단(inline)과 /contact 본문(list)이 같은 데이터·같은 규칙을 쓴다.
 * inline: 존재하는 값만 배열로 모아 ' · '로 잇는다 → 선행·중복 구분자가 구조적으로 생기지 않는다.
 *         .about-contact 래퍼(라벨 열 빈칸 + 본문 열)를 그대로 유지해 About 스타일 변화 없음.
 * list:   라벨-값 행. 값 없는 행은 렌더하지 않는다.
 */
export function ContactLine({ contact, variant }: ContactLineProps) {
  // inline은 .about-contact a 규칙(hover 밑줄)을 따르므로 인라인 링크 스타일을 주지 않는다
  const items = entries(contact, variant === 'list' ? LIST_LINK : undefined)
  if (items.length === 0) return null

  if (variant === 'inline') {
    return (
      <div className="about-contact" style={{ fontFamily: FONT }}>
        <div />
        <div>
          {items.map((it, i) => (
            <span key={it.key}>
              {i > 0 && ' · '}
              {it.value}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <dl style={{ fontFamily: FONT, margin: 0 }}>
      {items.map((it) => (
        <div
          key={it.key}
          style={{
            display: 'grid',
            gridTemplateColumns: '112px 1fr',
            columnGap: 24,
            padding: '12px 0',
            borderTop: '0.5px solid rgba(8, 7, 6, 0.10)',
          }}
        >
          <dt style={{
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: '0.08em',
            lineHeight: '22px',
            color: 'rgba(8, 7, 6, 0.45)',
          }}>
            {it.label}
          </dt>
          <dd style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 300,
            lineHeight: '22px',
            color: '#080706',
          }}>
            {it.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
