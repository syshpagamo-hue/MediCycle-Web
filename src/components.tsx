import type { PageName } from './data'
import { marineCards } from './data'

export function SiteHeader({
  page,
  recycledCount,
  accountStatus,
  onNavigate,
  onSection,
  onAccount,
}: {
  page: PageName
  recycledCount: number
  accountStatus: 'checking' | 'guest' | 'signed-in'
  onNavigate: (page: PageName) => void
  onSection: (id: string) => void
  onAccount: () => void
}) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <button
          className="wordmark"
          type="button"
          onClick={() => onNavigate('home')}
          aria-label="MediCycle AI home"
        >
          <span className="wordmark-symbol" aria-hidden="true"><i /><i /></span>
          <span>MEDICYCLE AI</span>
        </button>
        <nav aria-label="Primary navigation">
          <button type="button" onClick={() => onSection('scan')}>Scan medicine</button>
          <button type="button" onClick={() => onSection('impact')}>Why it matters</button>
          <button type="button" onClick={() => onSection('nearest-pharmacy')}>Find a pharmacy</button>
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className={`account-pill${accountStatus === 'signed-in' ? ' is-signed-in' : ''}`}
            onClick={onAccount}
            aria-label={accountStatus === 'signed-in' ? 'Open MediCycle account, signed in' : 'Open MediCycle prototype account'}
          >
            <i aria-hidden="true" />
            <span>{accountStatus === 'signed-in' ? 'Synced' : 'Account'}</span>
          </button>
          <button
            type="button"
            className={`collection-pill${page === 'activity' ? ' is-active' : ''}`}
            onClick={() => onNavigate('activity')}
            aria-label={`Open ocean collection, ${recycledCount} of ${marineCards.length} cards unlocked`}
          >
            <span>My Ocean</span>
            <b>{recycledCount}/{marineCards.length}</b>
          </button>
        </div>
      </div>
    </header>
  )
}

export function HeroArtwork({ onScan }: { onScan: () => void }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <img
        className="hero-artwork"
        src="/figma-original/hormone-disposal.png"
        alt=""
        width={1920}
        height={1080}
      />
      <div className="hero-caption">
        <p className="eyebrow">AI × BEHAVIORAL SCIENCE × OCEAN CONSERVATION</p>
        <h1 id="hero-title">Recognize the medicine.<br />Activate better choices.</h1>
        <p>Turn one photo into disposal confidence, a safer next step, and an engaging journey toward ocean responsibility.</p>
        <button className="figma-button black" type="button" onClick={onScan}>SCAN A MEDICINE</button>
      </div>
      <div className="hero-status"><span aria-hidden="true" /> Demo mode · Fixed case</div>
    </section>
  )
}

export function ActivityBanner({ onOpen }: { onOpen?: () => void }) {
  return (
    <div className="activity-banner">
      <img
        src="/figma-original/activity-banner.png"
        alt="Track your health, build your aquarium"
        width={1646}
        height={475}
      />
      {onOpen && (
        <button type="button" className="banner-button" onClick={onOpen}>
          EXPLORE THE COLLECTION
        </button>
      )}
    </div>
  )
}

export function ProcessSteps({ active = 0 }: { active?: 0 | 1 | 2 | 3 | 4 }) {
  const steps = [
    ['01', 'View guidance', 'Open the fixed demonstration case'],
    ['02', 'Plan a return', 'Find and contact a nearby pharmacy'],
    ['03', 'Demo completion', 'Simulate the real-world hand-off'],
    ['04', 'Unlock', 'Reveal a marine life card'],
  ]

  return (
    <ol className="process-steps" aria-label="Four-step disposal journey">
      {steps.map(([number, title, description], index) => (
        <li key={number} className={index + 1 <= active ? 'is-active' : ''}>
          <span>{number}</span>
          <div><b>{title}</b><small>{description}</small></div>
        </li>
      ))}
    </ol>
  )
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  text,
}: {
  id?: string
  eyebrow: string
  title: string
  text?: string
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id}>{title}</h2>
      {text && <p className="section-intro">{text}</p>}
    </div>
  )
}
