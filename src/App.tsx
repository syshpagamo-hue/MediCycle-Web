import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import './App.css'
import { DetectionPreview } from './DetectionPreview'
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
  fixedDemoCase,
  pageHash,
  type AnalysisResult,
  type LocatorState,
  type PageName,
  type Pharmacy,
} from './data'

const DEMO_PROGRESS_KEY = 'medicycle-demo-recycled-count'
const LEGACY_PROGRESS_KEY = 'medicine-recycled'

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
  try {
    const storedValue =
      window.localStorage.getItem(DEMO_PROGRESS_KEY) ??
      window.localStorage.getItem(LEGACY_PROGRESS_KEY) ??
      '0'
    const stored = Number(storedValue)
    return Number.isFinite(stored)
      ? Math.min(Math.max(Math.floor(stored), 0), marineCards.length)
      : 0
  } catch {
    return 0
  }
}

function App() {
  const cameraRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const [page, setPage] = useState<PageName>('home')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [captureSource, setCaptureSource] = useState<'camera' | 'upload' | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [locatorState, setLocatorState] = useState<LocatorState>('idle')
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [toast, setToast] = useState('')
  const [unlockedCard, setUnlockedCard] = useState<(typeof marineCards)[number] | null>(null)
  const [recycledCount, setRecycledCount] = useState(getStoredProgress)
  const [recycledForResult, setRecycledForResult] = useState(false)
  const [returnPlanConfirmed, setReturnPlanConfirmed] = useState(false)
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
    setReturnPlanConfirmed(false)
  }

  const acceptFile = (selected: File | undefined, source: 'camera' | 'upload') => {
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
    setCaptureSource(source)
    resetAnalysisState()
  }

  const selectFile = (source: 'camera' | 'upload') => (event: ChangeEvent<HTMLInputElement>) => {
    acceptFile(event.target.files?.[0], source)
  }

  const dropFile = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    acceptFile(event.dataTransfer.files?.[0], 'upload')
  }

  const removeFile = () => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    setCaptureSource(null)
    resetAnalysisState()
    if (cameraRef.current) cameraRef.current.value = ''
    if (uploadRef.current) uploadRef.current.value = ''
  }

  const openFixedDemoCase = async () => {
    setIsAnalyzing(true)
    await new Promise((resolve) => window.setTimeout(resolve, 450))
    const demoResult = { ...fixedDemoCase, steps: [...fixedDemoCase.steps] }
    setResult(demoResult)
    setRecycledForResult(false)
    setQuizAnswers({ disposal: '', consequence: '' })
    setQuizSubmitted(false)
    setIsAnalyzing(false)
    window.history.pushState({ page: 'result' }, '', pageHash.result)
    setPage('result')
  }

  const showFallbackLocation = (lat = 24.1795, lon = 120.6465) => {
    setReturnPlanConfirmed(false)
    setPharmacies(sortByDistance(fallbackPharmacies, lat, lon))
    setLocatorState('fallback')
  }

  const locatePharmacies = () => {
    setReturnPlanConfirmed(false)
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
                takeBackStatus: 'unverified',
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
    if (recycledForResult || !returnPlanConfirmed) return
    const next = Math.min(recycledCount + 1, marineCards.length)
    setRecycledCount(next)
    setRecycledForResult(true)
    try {
      window.localStorage.setItem(DEMO_PROGRESS_KEY, String(next))
      window.localStorage.removeItem(LEGACY_PROGRESS_KEY)
    } catch {
      showToast('Progress could not be saved on this device.')
    }
    setUnlockedCard(marineCards[Math.max(0, next - 1)])
  }

  const resetDemoProgress = () => {
    const confirmed = window.confirm(
      'Reset MediCycle demo progress? This only removes MediCycle demo collection data from this browser.',
    )
    if (!confirmed) return
    try {
      window.localStorage.removeItem(DEMO_PROGRESS_KEY)
      window.localStorage.removeItem(LEGACY_PROGRESS_KEY)
    } catch {
      showToast('Demo progress could not be cleared on this device.')
      return
    }
    setRecycledCount(0)
    setRecycledForResult(false)
    setReturnPlanConfirmed(false)
    setUnlockedCard(null)
    setQuizAnswers({ disposal: '', consequence: '' })
    setQuizSubmitted(false)
    showToast('MediCycle demo progress has been reset.')
  }

  const quizScore =
    Number(quizAnswers.disposal === 'return') +
    Number(quizAnswers.consequence === 'waterways')

  const pharmacySection = (
    <section className="pharmacy-section" id="nearest-pharmacy" aria-label="Nearby pharmacies">
      <div className="pharmacy-heading-row">
        <SectionHeading
          eyebrow="ACTION SUPPORT · PLAN A RETURN OPTION"
          title="Nearby pharmacies."
          text="These are nearby pharmacies, not verified medication return points. Contact the pharmacy to confirm medication take-back availability before visiting."
        />
        <div className="privacy-chip"><span aria-hidden="true" /> Location stays in your browser</div>
      </div>
      <div className="pharmacy-entry-actions">
        <button
          type="button"
          className="figma-button black"
          onClick={locatePharmacies}
          disabled={locatorState === 'locating'}
        >
          {locatorState === 'locating' ? 'FINDING PHARMACIES…' : 'USE MY CURRENT LOCATION'}
        </button>
        <button type="button" className="figma-button outline" onClick={() => showFallbackLocation()}>
          VIEW SAMPLE PHARMACIES
        </button>
      </div>
      {locatorState === 'locating' && (
        <p className="location-note" role="status">Allow location access when your browser asks. This usually takes a few seconds.</p>
      )}
      {locatorState === 'ready' && (
        <p className="location-note" role="status">Live pharmacy results · take-back availability is not verified</p>
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
                <small className={`verification-label is-${pharmacy.takeBackStatus}`}>
                  {pharmacy.takeBackStatus === 'verified'
                    ? 'VERIFIED RETURN POINT'
                    : 'UNVERIFIED · CONTACT THE PHARMACY TO CONFIRM MEDICATION TAKE-BACK AVAILABILITY'}
                </small>
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
          <p className="data-source">Locations come from open map data. This version does not yet include a verified return-point data source.</p>
          {page === 'result' && (
            <div className="return-plan-action">
              <div>
                <b>{returnPlanConfirmed ? 'Return option planned' : 'Next: make a contact plan'}</b>
                <p>Choose a pharmacy you can contact to confirm medication take-back availability.</p>
              </div>
              <button
                type="button"
                className={`figma-button ${returnPlanConfirmed ? 'gray' : 'black'}`}
                onClick={() => setReturnPlanConfirmed(true)}
                disabled={returnPlanConfirmed}
              >
                {returnPlanConfirmed ? '✓ PLAN RECORDED' : 'I WILL CONTACT A PHARMACY'}
              </button>
            </div>
          )}
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
            <div><span>1</span><p><b>Fixed demo case</b><small>Ethinyl estradiol disposal journey</small></p></div>
            <div><span>LOCAL</span><p><b>Private preview</b><small>Selected photos stay on this device</small></p></div>
            <div><span>4</span><p><b>Guided steps</b><small>Guidance, planning, simulation, reward</small></p></div>
            <div><span>6</span><p><b>Marine stories</b><small>Ocean impact collection</small></p></div>
          </section>

          <section className="scan-section" id="scan" aria-labelledby="scan-title">
            <div className="scan-intro">
              <SectionHeading
                id="scan-title"
                eyebrow="START HERE"
                title="Preview a photo. Explore one fixed case."
                text="Take or upload a photo to try the mobile-first preview. This prototype does not identify the photo; the next screen always uses the clearly labeled Ethinyl Estradiol demonstration case."
              />
              <ProcessSteps active={0} />
              <div className="prototype-note">
                <b>Demo Mode · No live AI recognition</b>
                <p>Your photo is only previewed locally and never changes the fixed demonstration result. A validated model can be connected in a future version.</p>
              </div>
            </div>

            <div className="upload-panel">
              <div className="upload-panel-head">
                <div><span className="status-dot" aria-hidden="true" /> DEMO MODE · PREVIEW ONLY</div>
                <small>JPG · PNG · HEIC · MAX 10 MB</small>
              </div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={selectFile('camera')} />
              <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/heic,image/heif" hidden onChange={selectFile('upload')} />
              <div className="photo-entry-actions" aria-label="Choose how to add a photo">
                <button type="button" className="figma-button black" onClick={() => cameraRef.current?.click()}>
                  {captureSource === 'camera' && file ? 'RETAKE PHOTO' : 'TAKE A PHOTO'}
                </button>
                <button type="button" className="figma-button outline" onClick={() => uploadRef.current?.click()}>
                  {captureSource === 'upload' && file ? 'REPLACE PHOTO' : 'UPLOAD FROM DEVICE'}
                </button>
              </div>
              <p className="camera-fallback-note">Camera unavailable or permission declined? Use <b>Upload from device</b> instead.</p>
              <div
                className={`photo-picker${isDragging ? ' is-dragging' : ''}${preview ? ' has-photo' : ''}`}
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={dropFile}
              >
                {preview ? <DetectionPreview src={preview} alt="Selected medicine preview" detections={[]} /> : (
                  <div className="upload-empty">
                    <span aria-hidden="true">+</span>
                    <p>Photo preview</p>
                    <small>Use Take a photo or Upload from device above. Desktop users can also drop an image here.</small>
                  </div>
                )}
              </div>
              {file && (
                <div className="file-summary" aria-live="polite">
                  <div><span aria-hidden="true">✓</span><p><b>Preview ready · not analyzed</b><small>{file.name}</small></p></div>
                  <button type="button" className="text-button" onClick={removeFile}>CANCEL</button>
                </div>
              )}
              <button type="button" className="figma-button black analyze-button" onClick={openFixedDemoCase} disabled={isAnalyzing}>
                {isAnalyzing ? <><span className="spinner" aria-hidden="true" /> OPENING DEMO CASE…</> : 'CONTINUE WITH FIXED DEMO CASE →'}
              </button>
              <p className="privacy-note">Demo Mode: photos are previewed locally, are not uploaded or stored, and do not affect the fixed result.</p>
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
            <SectionHeading id="learn-title" eyebrow="THE OCEAN CONNECTION" title="Small residues. System-wide effects." text="Explore how pharmaceutical pollution can affect marine life across species, habitats, and generations." />
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
          <div className="result-topbar"><button className="back-link" type="button" onClick={() => navigate('home')}>← BACK TO PREVIEW</button><span>DEMO MODE · FIXED CASE · NOT LIVE AI</span></div>
          <ProcessSteps active={recycledForResult ? 4 : returnPlanConfirmed ? 2 : 1} />
          <section className="result-hero" aria-live="polite">
            <div className="result-image">
              {preview ? <DetectionPreview src={preview} alt="User-selected preview, not analyzed" detections={[]} /> : (
                <div className="demo-case-card"><span>FIXED DEMONSTRATION CASE</span><b>Ethinyl Estradiol<br />0.03 mg</b><small>No photo identification is performed in Demo Mode.</small></div>
              )}
              {preview && <div className="preview-disclaimer">PREVIEW ONLY · THIS PHOTO WAS NOT ANALYZED</div>}
            </div>
            <div className="result-summary">
              <p className="eyebrow">FIXED CASE · NOT AN IMAGE RECOGNITION RESULT</p>
              <h1>{result.drugName}</h1><p className="category-line">{result.category}</p>
              <div className={`action-badge ${result.action}`}><span aria-hidden="true">{result.action === 'return' ? '↗' : '✓'}</span>{result.action === 'return' ? 'RETURN TO A PROFESSIONAL COLLECTION POINT' : 'FOLLOW LOCAL HOUSEHOLD DISPOSAL GUIDANCE'}</div>
              <div className="demo-result-notice"><b>Demo Mode</b><span>This guidance belongs to the fixed Ethinyl Estradiol case, not to your selected photo.</span></div>
              <p className="medical-disclaimer">Prototype guidance is not medical advice. Confirm the medicine and local disposal requirements with a qualified professional.</p>
            </div>
          </section>

          <section className="disposal-plan">
            <SectionHeading eyebrow="YOUR DISPOSAL PLAN" title="A safe hand-off, step by step." text={result.reason} />
            <ol>{result.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol>
          </section>
          {pharmacySection}

          <div className="result-action-panel">
            <div><p className="eyebrow">STEP 03 · DEMO COMPLETION</p><h2>{recycledForResult ? 'Demo completion recorded. Marine life unlocked.' : returnPlanConfirmed ? 'Return plan ready. Simulate the hand-off to unlock a card.' : 'Find and plan a return option before simulating completion.'}</h2></div>
            <button
              type="button"
              className={`figma-button blue${recycledForResult ? ' completed' : ''}`}
              onClick={() => returnPlanConfirmed ? markAsRecycled() : document.getElementById('nearest-pharmacy')?.scrollIntoView({ behavior: 'smooth' })}
              disabled={recycledForResult}
            >
              {recycledForResult ? '✓ MARINE LIFE UNLOCKED' : returnPlanConfirmed ? 'SIMULATE COMPLETION & UNLOCK' : 'FIND / PLAN A RETURN OPTION'}
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
              <button type="button" className="text-button reset-demo-button" onClick={resetDemoProgress}>RESET DEMO PROGRESS</button>
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
