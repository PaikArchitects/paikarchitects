import Link from 'next/link'

export default function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="site-header-name">
        Chang Hyun Paik
      </Link>
      <nav className="site-header-nav">
        <Link href="/" className="site-header-link">Work</Link>
        <Link href="/about" className="site-header-link">About</Link>
        <Link href="/about#contact" className="site-header-link">Contact</Link>
      </nav>
    </header>
  )
}
