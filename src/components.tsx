import type { PageName } from './data'
import { marineCards } from './data'

export function SiteHeader({
  page,
  recycledCount,
  onNavigate,
  onSection,
}: {
  page: PageName
  recycledCount: number
  onNavigate: (page: PageName) => void
  onSection: (id: string) => void
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
      <div className="hero-status"><span aria-hidden="true" /> Static prototype · Mock analysis</div>
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

export function ProcessSteps({ active = 1 }: { active?: 1 | 2 | 3 | 4 }) {
  const steps = [
    ['01', 'Detect', 'Upload a medicine photo for visual analysis'],
    ['02', 'Guide', 'Build confidence with disposal guidance'],
    ['03', 'Reward', 'Unlock a marine life card'],
    ['04', 'Learn', 'Complete an empathy-based impact check'],
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
  eyebrow,
  title,
  text,
}: {
  eyebrow: string
  title: string
  text?: string
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {text && <p className="section-intro">{text}</p>}
    </div>
  )
}
