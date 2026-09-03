import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react'
import './App.css'
import {
  ActivityBanner,
  HeroArtwork,
  ProcessSteps,
  SectionHeading,
  SiteHeader,
} from './components'
import {
  fallbackPharmacies,
  marineCards,
  marineFacts,
  mockAnalysis,
  pageHash,
  type AnalysisResult,
  type LocatorState,
  type PageName,
  type Pharmacy,
} from './data'

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const earthRadius = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function sortByDistance(
  items: Omit<Pharmacy, 'distance'>[],
  lat: number,
  lon: number,
) {
  return items
    .map((item) => ({ ...item, distance: haversine(lat, lon, item.lat, item.lon) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5)
}

function addressFromTags(tags: Record<string, string>) {
  if (tags['addr:full:en']) return tags['addr:full:en']
  if (tags['addr:full']) return tags['addr:full']
  return (
    [
      tags['addr:housenumber'],
      tags['addr:street:en'] || tags['addr:street'],
      tags['addr:district:en'] || tags['addr:district'],
      tags['addr:city:en'] || tags['addr:city'],
    ]
      .filter(Boolean)
      .join(', ') || 'Address not listed'
  )
}

function getStoredProgress() {
  const stored = Number(window.localStorage.getItem('medicine-recycled') || 0)
  return Number.isFinite(stored)
    ? Math.min(Math.max(Math.floor(stored), 0), marineCards.length)
    : 0
}

function App() {
  const fileRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const [page, setPage] = useState<PageName>('home')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [locatorState, setLocatorState] = useState<LocatorState>('idle')
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [toast, setToast] = useState('')
  const [unlockedCard, setUnlockedCard] = useState<(typeof marineCards)[number] | null>(null)
  const [recycledCount, setRecycledCount] = useState(getStoredProgress)
  const [recycledForResult, setRecycledForResult] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState({ disposal: '', consequence: '' })
  const [quizSubmitted, setQuizSubmitted] = useState(false)

  useEffect(() => {
    const onPopState = () => {
      const hash = window.location.hash
      if (hash === pageHash.activity) setPage('activity')
      else if (hash === pageHash.result && result) setPage('result')
      else setPage('home')
    }
    onPopState()
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [result])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page])

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  useEffect(() => {
    if (!unlockedCard) return
    dialogRef.current?.focus()
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setUnlockedCard(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [unlockedCard])

  const navigate = (nextPage: PageName) => {
    if (nextPage === 'result' && !result) return
    window.history.pushState({ page: nextPage }, '', pageHash[nextPage])
    setPage(nextPage)
  }

  const goToSection = (id: string) => {
    if (page !== 'home') {
      navigate('home')
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
      return
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3400)
  }

  const resetAnalysisState = () => {
    setResult(null)
    setRecycledForResult(false)
    setQuizAnswers({ disposal: '', consequence: '' })
    setQuizSubmitted(false)
    setLocatorState('idle')
    setPharmacies([])
  }

  const acceptFile = (selected?: File) => {
    if (!selected || !selected.type.startsWith('image/')) {
      showToast('Please choose a JPG, PNG, or HEIC medicine photo.')
      return
    }
    if (selected.size > 10 * 1024 * 1024) {
      showToast('The photo must be smaller than 10 MB.')
      return
    }
    if (preview) URL.revokeObjectURL(preview)
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    resetAnalysisState()
  }

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    acceptFile(event.target.files?.[0])
  }

  const dropFile = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    acceptFile(event.dataTransfer.files?.[0])
  }

  const openFilePickerFromKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      fileRef.current?.click()
    }
  }

  const removeFile = () => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    resetAnalysisState()
    if (fileRef.current) fileRef.current.value = ''
  }

  const analyze = async () => {
    if (!file) {
      fileRef.current?.click()
      return
    }
    setIsAnalyzing(true)
    await new Promise((resolve) => window.setTimeout(resolve, 900))
    const mockResult = { ...mockAnalysis, steps: [...mockAnalysis.steps] }
    setResult(mockResult)
    setRecycledForResult(false)
    setQuizAnswers({ disposal: '', consequence: '' })
    setQuizSubmitted(false)
    setIsAnalyzing(false)
    window.history.pushState({ page: 'result' }, '', pageHash.result)
    setPage('result')
  }

  const showFallbackLocation = (lat = 24.1795, lon = 120.6465) => {
    setPharmacies(sortByDistance(fallbackPharmacies, lat, lon))
    setLocatorState('fallback')
  }

  const locatePharmacies = () => {
    if (!navigator.geolocation) {
      showFallbackLocation()
      return
    }
    setLocatorState('locating')
    setPharmacies([])
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords
        try {
          const query = `[out:json][timeout:12];(node["amenity"="pharmacy"](around:3500,${latitude},${longitude});way["amenity"="pharmacy"](around:3500,${latitude},${longitude}););out center tags;`
          const response = await fetch(
            `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
          )
          if (!response.ok) throw new Error('Map service failed')
          const data = (await response.json()) as {
            elements: Array<{
              id: number
              lat?: number
              lon?: number
              center?: { lat: number; lon: number }
              tags?: Record<string, string>
            }>
          }
          const nearby = data.elements
            .map((element): Omit<Pharmacy, 'distance'> | null => {
              const lat = element.lat ?? element.center?.lat
              const lon = element.lon ?? element.center?.lon
              if (lat === undefined || lon === undefined) return null
              const tags = element.tags ?? {}
              return {
                id: String(element.id),
                name: tags['name:en'] || tags.name || 'Community Pharmacy',
                lat,
                lon,
                address: addressFromTags(tags),
                phone: tags.phone,
              }
            })
            .filter((item): item is Omit<Pharmacy, 'distance'> => item !== null)
          if (!nearby.length) throw new Error('No pharmacy found')
          setPharmacies(sortByDistance(nearby, latitude, longitude))
          setLocatorState('ready')
        } catch {
          showFallbackLocation(latitude, longitude)
        }
      },
      () => {
        setLocatorState('error')
        setPharmacies([])
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    )
  }

  const markAsRecycled = () => {
    if (recycledForResult) return
    const next = Math.min(recycledCount + 1, marineCards.length)
    setRecycledCount(next)
    setRecycledForResult(true)
    window.localStorage.setItem('medicine-recycled', String(next))
    setUnlockedCard(marineCards[Math.max(0, next - 1)])
  }

  const quizScore =
    Number(quizAnswers.disposal === 'return') +
    Number(quizAnswers.consequence === 'waterways')

  const pharmacySection = (
    <section className="pharmacy-section" id="nearest-pharmacy" aria-label="Nearest medicine return options">
      <div className="pharmacy-heading-row">
        <SectionHeading
          eyebrow="ACTION SUPPORT · NEAREST RETURN OPTION"
          title="Complete the journey nearby."
          text="Find pharmacies within approximately 3.5 km, sorted by distance. Call before visiting to confirm that the location accepts returned medication."
        />
        <div className="privacy-chip"><span aria-hidden="true" /> Location stays in your browser</div>
      </div>
      <button
        type="button"
        className="figma-button black"
        onClick={locatePharmacies}
        disabled={locatorState === 'locating'}
      >
        {locatorState === 'locating' ? 'FINDING PHARMACIES…' : 'USE MY CURRENT LOCATION'}
      </button>
      {locatorState === 'locating' && (
        <p className="location-note" role="status">Allow location access when your browser asks. This usually takes a few seconds.</p>
      )}
      {locatorState === 'ready' && (
        <p className="location-note" role="status">Live map results · sorted by straight-line distance</p>
      )}
      {locatorState === 'fallback' && (
        <p className="location-note demo-note" role="status"><b>DEMO DATA</b> Showing sample pharmacies near Xitun District, Taichung.</p>
      )}
      {locatorState === 'error' && (
        <div className="location-error" role="alert">
          <p>We could not access your location. Enable Location Services for your browser, then try again.</p>
          <button type="button" className="text-button" onClick={() => showFallbackLocation()}>VIEW SAMPLE RESULTS INSTEAD</button>
        </div>
      )}
      {pharmacies.length > 0 && (
        <div className="pharmacy-list" aria-live="polite">
          {pharmacies.slice(0, 3).map((pharmacy, index) => (
            <article className="pharmacy-row" key={pharmacy.id}>
              <div className="pharmacy-number">{String(index + 1).padStart(2, '0')}</div>
              <div className="pharmacy-copy">
                <h3>{pharmacy.name}</h3>
                <p>{pharmacy.address}</p>
                <small>Confirm medication-return service before your visit.</small>
              </div>
              <div className="pharmacy-actions">
                <strong>{pharmacy.distance < 1 ? `${Math.round(pharmacy.distance * 1000)} m` : `${pharmacy.distance.toFixed(1)} km`}</strong>
                <div>
                  {pharmacy.phone && <a className="phone-link" href={`tel:${pharmacy.phone}`}>CALL</a>}
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lon}`} target="_blank" rel="noreferrer">DIRECTIONS</a>
                </div>
              </div>
            </article>
          ))}
          <p className="data-source">Pharmacy locations are retrieved from open map data. Acceptance of returned medicine is not guaranteed.</p>
        </div>
      )}
    </section>
  )

  return (
    <main className="figma-site">
      <SiteHeader page={page} recycledCount={recycledCount} onNavigate={navigate} onSection={goToSection} />

      {page === 'home' && (
        <div className="page-shell landing-page">
          <HeroArtwork onScan={() => goToSection('scan')} />

          <section className="value-strip" aria-label="Product value">
            <div><span>26</span><p><b>Medicine classes</b><small>In the team&apos;s current image database</small></p></div>
            <div><span>93.5%+</span><p><b>Test accuracy</b><small>Reported for the trained classification model</small></p></div>
            <div><span>≈4K</span><p><b>Scale-up vision</b><small>Future expansion using NLM RxIMAGE</small></p></div>
            <div><span>500</span><p><b>Interaction goal</b><small>Valid identification journeys targeted</small></p></div>
          </section>

          <section className="scan-section" id="scan" aria-labelledby="scan-title">
            <div className="scan-intro">
              <SectionHeading
                eyebrow="START HERE"
                title="One photo. A clearer next step."
                text="Photograph the medicine or packaging in good light. MediCycle AI uses visual recognition to lower the knowledge barrier that often prevents people from disposing of medicine correctly."
              />
              <ProcessSteps active={file ? 2 : 1} />
              <div className="prototype-note">
                <b>Transparent prototype scope</b>
                <p>This static demo simulates AI analysis with front-end mock data. Your photo stays on this device and is not uploaded or stored.</p>
              </div>
            </div>

            <div className="upload-panel">
              <div className="upload-panel-head">
                <div><span className="status-dot" aria-hidden="true" /> MOCK IMAGE ANALYSIS</div>
                <small>JPG · PNG · HEIC · MAX 10 MB</small>
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/heic,image/heif" capture="environment" hidden onChange={selectFile} />
              <div
                className={`photo-picker${isDragging ? ' is-dragging' : ''}${preview ? ' has-photo' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={file ? 'Change selected medicine photo' : 'Choose a medicine photo'}
                onClick={() => fileRef.current?.click()}
                onKeyDown={openFilePickerFromKeyboard}
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={dropFile}
              >
                {preview ? <img src={preview} alt="Selected medicine preview" /> : (
                  <div className="upload-empty">
                    <span aria-hidden="true">+</span>
                    <p>Drop a medicine photo here</p>
                    <small>or click to choose one from your device</small>
                  </div>
                )}
              </div>
              {file && (
                <div className="file-summary" aria-live="polite">
                  <div><span aria-hidden="true">✓</span><p><b>Photo ready</b><small>{file.name}</small></p></div>
                  <button type="button" className="text-button" onClick={(event) => { event.stopPropagation(); removeFile() }}>REMOVE</button>
                </div>
              )}
              <button type="button" className="figma-button black analyze-button" onClick={analyze} disabled={isAnalyzing}>
                {isAnalyzing ? <><span className="spinner" aria-hidden="true" /> ANALYZING IMAGE…</> : file ? 'START IMAGE RECOGNITION →' : 'CHOOSE A PHOTO →'}
              </button>
              <p className="privacy-note">Your image is previewed locally for this mock analysis and is not uploaded or stored.</p>
            </div>
          </section>

          <section className="impact-section" id="impact">
            <div className="impact-statement">
              <p className="eyebrow">WHY IT MATTERS</p>
              <h2>Knowledge is not the finish line.<br />Behavior change is.</h2>
              <p>MediCycle AI combines artificial intelligence with behavioral science. Recognition lowers the cognitive barrier, instant rewards sustain participation, and marine stories awaken awareness of environmental consequences.</p>
              <div className="sdg-row" aria-label="United Nations Sustainable Development Goals addressed">
                <span>SDG 3 · GOOD HEALTH</span><span>SDG 6 · CLEAN WATER</span><span>SDG 14 · LIFE BELOW WATER</span>
              </div>
            </div>
            <div className="solution-grid">
              <article><span>01 · TPB</span><h3>Build perceived behavioral control</h3><p>AI identification and standardized guidance help users feel capable of completing the right disposal action.</p></article>
              <article><span>02 · REINFORCEMENT</span><h3>Reward the action instantly</h3><p>Marine life cards transform a routine disposal task into a collection journey with visible achievement.</p></article>
              <article><span>03 · NAM</span><h3>Awaken awareness of consequences</h3><p>Species stories and a post-interaction quiz connect pharmaceutical pollution to personal environmental responsibility.</p></article>
            </div>
            <div className="research-foundation">
              <span>RESEARCH-INFORMED DESIGN</span>
              <p>Theory of Planned Behavior · Ajzen (1991) &nbsp; / &nbsp; Norm Activation Model · Schwartz (1977) &nbsp; / &nbsp; Household medicine disposal · Chen, Chiang &amp; Chen (2012)</p>
            </div>
          </section>

          <section className="learn-section" aria-labelledby="learn-title">
            <SectionHeading eyebrow="THE OCEAN CONNECTION" title="Small residues. System-wide effects." text="Explore how pharmaceutical pollution can affect marine life across species, habitats, and generations." />
            <div className="marine-grid">
              {marineFacts.map((fact) => (
                <article key={fact.name}>
                  <div className="marine-image-wrap"><img src={fact.image} alt="" width={420} height={420} /></div>
                  <p className="fact-label">{fact.label}</p><h3>{fact.name}</h3><p>{fact.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="activity-section">
            <div className="activity-heading">
              <SectionHeading eyebrow="POSITIVE REINFORCEMENT" title="Turn responsible disposal into an ocean collection." />
              <p><b>{recycledCount} of {marineCards.length}</b> cards unlocked on this device</p>
            </div>
            <ActivityBanner onOpen={() => navigate('activity')} />
          </section>
          {pharmacySection}
        </div>
      )}

      {page === 'result' && result && (
        <div className="page-shell result-page">
          <div className="result-topbar"><button className="back-link" type="button" onClick={() => navigate('home')}>← NEW SCAN</button><span>ANALYSIS COMPLETE · MOCK RESULT</span></div>
          <ProcessSteps active={recycledForResult ? 4 : 2} />
          <section className="result-hero" aria-live="polite">
            <div className="result-image">{preview && <img src={preview} alt="Analyzed medicine" />}</div>
            <div className="result-summary">
              <p className="eyebrow">AI-ASSISTED DEMO MATCH</p>
              <h1>{result.drugName}</h1><p className="category-line">{result.category}</p>
              <div className={`action-badge ${result.action}`}><span aria-hidden="true">{result.action === 'return' ? '↗' : '✓'}</span>{result.action === 'return' ? 'RETURN TO A PROFESSIONAL COLLECTION POINT' : 'FOLLOW LOCAL HOUSEHOLD DISPOSAL GUIDANCE'}</div>
              <div className="confidence-meter" aria-label={`Image recognition confidence ${Math.round(result.confidence * 100)} percent`}>
                <div><span>Mock recognition confidence</span><b>{Math.round(result.confidence * 100)}%</b></div>
                <i><span style={{ width: `${Math.round(result.confidence * 100)}%` }} /></i>
              </div>
              <p className="medical-disclaimer">Demo output is guidance, not medical advice. Do not change how you take a medicine without consulting a qualified professional.</p>
            </div>
          </section>

          <section className="disposal-plan">
            <SectionHeading eyebrow="YOUR DISPOSAL PLAN" title="A safe hand-off, step by step." text={result.reason} />
            <ol>{result.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol>
          </section>
          {pharmacySection}

          <div className="result-action-panel">
            <div><p className="eyebrow">STEP 03 · POSITIVE REINFORCEMENT</p><h2>{recycledForResult ? 'This disposal has been recorded.' : 'Confirm after the medicine is safely handed over.'}</h2></div>
            <button type="button" className={`figma-button blue${recycledForResult ? ' completed' : ''}`} onClick={markAsRecycled} disabled={recycledForResult}>
              {recycledForResult ? '✓ RECORDED IN MY OCEAN' : 'I RECYCLED IT PROPERLY'}
            </button>
          </div>

          {recycledForResult && (
            <section className="knowledge-check" id="impact-check" aria-labelledby="quiz-title">
              <div className="knowledge-intro">
                <p className="eyebrow">STEP 04 · EMPATHY-BASED LEARNING</p><h2 id="quiz-title">Turn awareness into knowledge.</h2>
                <p>This two-question impact check measures whether the journey improved understanding of safe disposal and ecological consequences.</p>
                <div className="theory-note"><b>NAM · Awareness of Consequences</b><span>Understanding impact can activate a personal norm for pro-environmental action.</span></div>
              </div>
              <form onSubmit={(event) => { event.preventDefault(); setQuizSubmitted(true) }}>
                <fieldset>
                  <legend>01 · What is the safest next step for unused hormone medication?</legend>
                  <label><input type="radio" name="disposal" value="trash" checked={quizAnswers.disposal === 'trash'} onChange={(event) => { setQuizAnswers({ ...quizAnswers, disposal: event.target.value }); setQuizSubmitted(false) }} /> Put it directly in household trash</label>
                  <label><input type="radio" name="disposal" value="flush" checked={quizAnswers.disposal === 'flush'} onChange={(event) => { setQuizAnswers({ ...quizAnswers, disposal: event.target.value }); setQuizSubmitted(false) }} /> Flush it down a sink or toilet</label>
                  <label><input type="radio" name="disposal" value="return" checked={quizAnswers.disposal === 'return'} onChange={(event) => { setQuizAnswers({ ...quizAnswers, disposal: event.target.value }); setQuizSubmitted(false) }} /> Return it to a medical institution or confirmed collection point</label>
                </fieldset>
                <fieldset>
                  <legend>02 · Why should medicine never be flushed?</legend>
                  <label><input type="radio" name="consequence" value="appearance" checked={quizAnswers.consequence === 'appearance'} onChange={(event) => { setQuizAnswers({ ...quizAnswers, consequence: event.target.value }); setQuizSubmitted(false) }} /> It may change the color of the packaging</label>
                  <label><input type="radio" name="consequence" value="waterways" checked={quizAnswers.consequence === 'waterways'} onChange={(event) => { setQuizAnswers({ ...quizAnswers, consequence: event.target.value }); setQuizSubmitted(false) }} /> Active ingredients can enter waterways and affect aquatic life</label>
                  <label><input type="radio" name="consequence" value="cost" checked={quizAnswers.consequence === 'cost'} onChange={(event) => { setQuizAnswers({ ...quizAnswers, consequence: event.target.value }); setQuizSubmitted(false) }} /> It makes future medicine more expensive</label>
                </fieldset>
                <button className="figma-button black" type="submit" disabled={!quizAnswers.disposal || !quizAnswers.consequence}>CHECK MY UNDERSTANDING</button>
                {quizSubmitted && (
                  <div className={`quiz-feedback${quizScore === 2 ? ' is-correct' : ''}`} role="status">
                    <b>{quizScore === 2 ? '2 / 2 · Knowledge activated' : `${quizScore} / 2 · Review and try again`}</b>
                    <p>{quizScore === 2 ? 'You connected the disposal action with its environmental consequence.' : 'Look again at the disposal plan and the ocean impact explanation above.'}</p>
                  </div>
                )}
              </form>
            </section>
          )}
        </div>
      )}

      {page === 'activity' && (
        <div className="page-shell activity-page">
          <div className="result-topbar"><button className="back-link" type="button" onClick={() => navigate('home')}>← BACK HOME</button><span>MY OCEAN</span></div>
          <ActivityBanner />
          <section className="activity-copy">
            <p className="eyebrow">BEHAVIOR → IMPACT → STORY</p><h1>Build an ocean worth protecting.</h1>
            <p>{recycledCount === marineCards.length ? 'Six responsible disposal actions have revealed the complete marine collection. Every card makes an invisible environmental choice visible—and turns repeated action into a lasting habit.' : 'Each responsible disposal action reveals a marine life card. Return to the scanner to keep building your collection and connect everyday choices with ocean health.'}</p>
            <div className={`collection-progress${recycledCount === marineCards.length ? ' is-complete' : ''}`}>
              <i><span style={{ width: `${(recycledCount / marineCards.length) * 100}%` }} /></i>
              <p><b>{recycledCount}</b> of {marineCards.length} cards unlocked{recycledCount === marineCards.length ? ' · Collection complete' : ''}</p>
            </div>
          </section>
          <section className="collection-grid" aria-label="Marine life card collection">
            {marineCards.map((card, index) => {
              const unlocked = index < recycledCount
              return (
                <article key={card.name} className={unlocked ? 'is-unlocked' : 'is-locked'}>
                  <div>{unlocked ? <img src={card.image} alt={`${card.name} marine life card`} /> : <span aria-hidden="true">?</span>}</div>
                  <p>{String(index + 1).padStart(2, '0')} / {String(marineCards.length).padStart(2, '0')}</p>
                  <h2>{unlocked ? card.name : 'Secret species'}</h2>
                  <small>{unlocked ? 'UNLOCKED' : 'COMPLETE A SAFE DISPOSAL TO REVEAL'}</small>
                </article>
              )
            })}
          </section>
          <div className="collection-cta">
            <div><p className="eyebrow">{recycledCount === marineCards.length ? 'OCEAN COLLECTION COMPLETE' : 'KEEP THE OCEAN GROWING'}</p><h2>{recycledCount === marineCards.length ? 'Six safer choices. One ocean worth protecting.' : 'Your next safe return reveals another species.'}</h2></div>
            <button type="button" className="figma-button black" onClick={() => { navigate('home'); window.setTimeout(() => document.getElementById('scan')?.scrollIntoView({ behavior: 'smooth' }), 80) }}>CONTINUE THE IMPACT</button>
          </div>
        </div>
      )}

      <footer className="site-footer">
        <div><b>MEDICYCLE AI</b><p>Smart hormone medication recycling through AI, behavioral science, and ocean empathy.</p></div>
        <div><span>STATIC COMPETITION PROTOTYPE · 2026</span><span>BUILT FOR RESPONSIBLE ACTION</span></div>
      </footer>

      {unlockedCard && (
        <div className="card-dialog-backdrop" role="presentation" onMouseDown={() => setUnlockedCard(null)}>
          <section className="card-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="card-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="dialog-close" type="button" onClick={() => setUnlockedCard(null)} aria-label="Close card">×</button>
            <p>SECRET MARINE LIFE CARD</p><h2 id="card-title">You unlocked {unlockedCard.name}!</h2>
            <img src={unlockedCard.image} alt={`${unlockedCard.name} marine life card`} width={440} height={590} />
            <button type="button" className="figma-button black" onClick={() => { setUnlockedCard(null); window.setTimeout(() => document.getElementById('impact-check')?.scrollIntoView({ behavior: 'smooth' }), 80) }}>CONTINUE TO IMPACT CHECK</button>
          </section>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  )
}

export default App
