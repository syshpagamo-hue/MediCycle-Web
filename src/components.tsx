import type { PageName } from './data'
import { marineCards } from './data'
import { useI18n } from './i18n'

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
  const { t, toggleLanguage } = useI18n()
  return (
    <header className="site-header">
      <div className="header-inner">
        <button
          className="wordmark"
          type="button"
          onClick={() => onNavigate('home')}
          aria-label={t('headerHome')}
        >
          <span className="wordmark-symbol" aria-hidden="true"><i /><i /></span>
          <span>MEDICYCLE AI</span>
        </button>
        <nav aria-label="Primary navigation">
          <button type="button" onClick={() => onSection('scan')}>{t('navScan')}</button>
          <button type="button" onClick={() => onSection('impact')}>{t('navWhy')}</button>
          <button type="button" onClick={() => onSection('nearest-pharmacy')}>{t('navPharmacy')}</button>
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className={`account-pill${accountStatus === 'signed-in' ? ' is-signed-in' : ''}`}
            onClick={onAccount}
            aria-label={accountStatus === 'signed-in' ? t('headerAccountSigned') : t('headerAccountGuest')}
          >
            <i aria-hidden="true" />
            <span>{accountStatus === 'signed-in' ? t('synced') : t('account')}</span>
          </button>
          <button type="button" className="language-toggle" onClick={toggleLanguage} aria-label={t('languageAria')}><span aria-hidden="true">◎</span>{t('language')}</button>
          <button
            type="button"
            className={`collection-pill${page === 'activity' ? ' is-active' : ''}`}
            onClick={() => onNavigate('activity')}
            aria-label={`Open ocean collection, ${recycledCount} of ${marineCards.length} cards unlocked`}
          >
            <span>{t('myOcean')}</span>
            <b>{recycledCount}/{marineCards.length}</b>
          </button>
        </div>
      </div>
    </header>
  )
}

export function HeroArtwork({ onScan }: { onScan: () => void }) {
  const { t } = useI18n()
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
        <p className="eyebrow">{t('heroEyebrow')}</p>
        <h1 id="hero-title">{t('heroTitle').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h1>
        <p>{t('heroText')}</p>
        <button className="figma-button black" type="button" onClick={onScan}>{t('heroCta')}</button>
      </div>
      <div className="hero-status"><span aria-hidden="true" /> {t('demoFixed')}</div>
    </section>
  )
}

export function ActivityBanner({ onOpen }: { onOpen?: () => void }) {
  const { t } = useI18n()
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
          {t('exploreCollection')}
        </button>
      )}
    </div>
  )
}

export function ProcessSteps({ active = 0 }: { active?: 0 | 1 | 2 | 3 | 4 }) {
  const { t } = useI18n()
  const steps = [
    ['01', t('step1'), t('step1Text')],
    ['02', t('step2'), t('step2Text')],
    ['03', t('step3'), t('step3Text')],
    ['04', t('step4'), t('step4Text')],
  ]

  return (
    <ol className="process-steps" aria-label={t('stepsAria')}>
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
