import { ContactLine } from '@/components/ContactLine'
import { getContact } from '@/lib/sanity/queries'
import { pageMetadata } from '@/lib/seo'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

export const revalidate = 60

export const metadata = pageMetadata({ title: 'Contacts', path: '/contact' })

// About 본문 컨테이너(.about-page / .about-inner / .about-row)를 그대로 재사용 — 여백·오프셋·반응형 동일
export default async function ContactPage() {
  const contact = await getContact()

  return (
    <div className="about-page" style={{ fontFamily: FONT }}>
      <div className="about-header-shell" aria-hidden="true" />
      <div className="about-inner">
        <section className="about-row about-row--wide">
          <div className="about-label">
            <h1 className="about-label-text" style={{ margin: 0, fontSize: 'inherit', fontWeight: 'inherit' }}>
              Contacts
            </h1>
          </div>
          <div className="about-body-en">
            {contact
              ? <ContactLine contact={contact} variant="list" />
              : <p>Contacts — Coming soon</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
