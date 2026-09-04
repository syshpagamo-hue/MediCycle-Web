import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import './App.css'
import { DetectionPreview } from './DetectionPreview'
import { PharmacyMap } from './PharmacyMap'
import { Quiz } from './Quiz'
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
  type Coordinates,
  type LocatorState,
  type PageName,
  type Pharmacy,
} from './data'
import {
  buildOverpassQuery,
  pharmaciesFromOverpass,
  PHARMACY_RESULT_LIMIT,
  SEARCH_RADII_METERS,
  sortByDistance,
  type OverpassResponse,
} from './pharmacy'

const DEMO_PROGRESS_KEY = 'medicycle-demo-recycled-count'
const LEGACY_PROGRESS_KEY = 'medicine-recycled'
const OVERPASS_TIMEOUT_MS = 10_000

type CameraState =
  | 'idle'
  | 'opening'
  | 'ready'
  | 'permission-denied'
  | 'unavailable'

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
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const cameraAttemptRef = useRef(0)
  const pharmacySearchAttemptRef = useRef(0)
  const pharmacySearchControllerRef = useRef<AbortController | null>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const dialogCloseRef = useRef<HTMLButtonElement>(null)
  const dialogTriggerRef = useRef<HTMLElement | null>(null)
  const [page, setPage] = useState<PageName>('home')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [captureSource, setCaptureSource] = useState<'camera' | 'upload' | null>(null)
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [locatorState, setLocatorState] = useState<LocatorState>('idle')
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [mapCenter, setMapCenter] = useState<Coordinates | null>(null)
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null)
  const [searchRadiusKm, setSearchRadiusKm] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const [unlockedCard, setUnlockedCard] = useState<(typeof marineCards)[number] | null>(null)
  const [recycledCount, setRecycledCount] = useState(getStoredProgress)
  const [recycledForResult, setRecycledForResult] = useState(false)
  const [returnPlanConfirmed, setReturnPlanConfirmed] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(
    () => window.location.hash === pageHash.result,
  )

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

  useEffect(() => () => {
    cameraAttemptRef.current += 1
    pharmacySearchAttemptRef.current += 1
    pharmacySearchControllerRef.current?.abort()
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
  }, [])

  useEffect(() => {
    if (!unlockedCard) return
    const trigger = dialogTriggerRef.current
    window.requestAnimationFrame(() => dialogCloseRef.current?.focus())
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setUnlockedCard(null)
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (!focusable.length) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.requestAnimationFrame(() => trigger?.focus())
    }
  }, [unlockedCard])

  const navigate = (nextPage: PageName) => {
    if (nextPage === 'result' && !result) return
    if (nextPage !== 'home') stopCamera()
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

  const stopCamera = (nextState: CameraState = 'idle') => {
    cameraAttemptRef.current += 1
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null
    setCameraState(nextState)
  }

  const openCamera = async () => {
    stopCamera('opening')
    const attempt = cameraAttemptRef.current
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      })
      if (attempt !== cameraAttemptRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      cameraStreamRef.current = stream
      setCameraState('ready')
      window.requestAnimationFrame(() => {
        if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream
      })
    } catch (error) {
      if (attempt !== cameraAttemptRef.current) return
      const name = error instanceof DOMException ? error.name : ''
      setCameraState(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'permission-denied'
          : 'unavailable',
      )
    }
  }

  const resetAnalysisState = () => {
    pharmacySearchAttemptRef.current += 1
    pharmacySearchControllerRef.current?.abort()
    setResult(null)
    setRecycledForResult(false)
    setLocatorState('idle')
    setPharmacies([])
    setMapCenter(null)
    setSelectedPharmacyId(null)
    setSearchRadiusKm(null)
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

  const captureCameraPhoto = () => {
    const video = cameraVideoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) {
      stopCamera('unavailable')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          stopCamera('unavailable')
          return
        }
        acceptFile(
          new File([blob], `medicycle-photo-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          }),
          'camera',
        )
        stopCamera()
      },
      'image/jpeg',
      0.9,
    )
  }

  const selectFile = (source: 'camera' | 'upload') => (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    event.target.value = ''
    acceptFile(selected, source)
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
    if (uploadRef.current) uploadRef.current.value = ''
  }

  const openFixedDemoCase = async () => {
    stopCamera()
    setSessionEnded(false)
    setIsAnalyzing(true)
    await new Promise((resolve) => window.setTimeout(resolve, 450))
    const demoResult = { ...fixedDemoCase, steps: [...fixedDemoCase.steps] }
    setResult(demoResult)
    setRecycledForResult(false)
    setIsAnalyzing(false)
    window.history.pushState({ page: 'result' }, '', pageHash.result)
    setPage('result')
  }

  const showFallbackLocation = (lat = 24.1795, lon = 120.6465) => {
    pharmacySearchAttemptRef.current += 1
    pharmacySearchControllerRef.current?.abort()
    setReturnPlanConfirmed(false)
    setPharmacies(sortByDistance(fallbackPharmacies, lat, lon))
    setMapCenter({ lat, lon })
    setSelectedPharmacyId(null)
    setSearchRadiusKm(null)
    setLocatorState('fallback')
  }

  const locatePharmacies = () => {
    const attempt = pharmacySearchAttemptRef.current + 1
    pharmacySearchAttemptRef.current = attempt
    pharmacySearchControllerRef.current?.abort()
    setReturnPlanConfirmed(false)
    if (!navigator.geolocation) {
      setLocatorState('location-error')
      setPharmacies([])
      setMapCenter(null)
      return
    }
    setLocatorState('locating')
    setPharmacies([])
    setMapCenter(null)
    setSelectedPharmacyId(null)
    setSearchRadiusKm(null)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (attempt !== pharmacySearchAttemptRef.current) return
        const { latitude, longitude } = coords
        const controller = new AbortController()
        pharmacySearchControllerRef.current = controller
        const timeoutId = window.setTimeout(
          () => controller.abort(),
          OVERPASS_TIMEOUT_MS,
        )
        try {
          let nearby: Omit<Pharmacy, 'distance'>[] = []
          let radiusUsed = SEARCH_RADII_METERS[SEARCH_RADII_METERS.length - 1]

          for (const radius of SEARCH_RADII_METERS) {
            const query = buildOverpassQuery(latitude, longitude, radius)
            const response = await fetch(
              'https://overpass-api.de/api/interpreter',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                },
                body: `data=${encodeURIComponent(query)}`,
                signal: controller.signal,
              },
            )
            if (response.status === 408 || response.status === 504) {
              throw new DOMException('Map service timed out', 'AbortError')
            }
            if (!response.ok) throw new Error('Map service failed')
            const data = (await response.json()) as OverpassResponse
            nearby = pharmaciesFromOverpass(data.elements)
            radiusUsed = radius
            if (nearby.length >= PHARMACY_RESULT_LIMIT) break
          }

          if (attempt !== pharmacySearchAttemptRef.current) return
          if (!nearby.length) {
            setLocatorState('empty')
            setMapCenter({ lat: latitude, lon: longitude })
            setSearchRadiusKm(radiusUsed / 1000)
            return
          }
          setPharmacies(sortByDistance(nearby, latitude, longitude))
          setMapCenter({ lat: latitude, lon: longitude })
          setSearchRadiusKm(radiusUsed / 1000)
          setLocatorState('ready')
        } catch (error) {
          if (attempt !== pharmacySearchAttemptRef.current) return
          setPharmacies([])
          setMapCenter({ lat: latitude, lon: longitude })
          setLocatorState(
            error instanceof DOMException && error.name === 'AbortError'
              ? 'timeout'
              : 'network-error',
          )
        } finally {
          window.clearTimeout(timeoutId)
          if (pharmacySearchControllerRef.current === controller) {
            pharmacySearchControllerRef.current = null
          }
        }
      },
      (error) => {
        if (attempt !== pharmacySearchAttemptRef.current) return
        setLocatorState(error.code === error.TIMEOUT ? 'location-timeout' : 'location-error')
        setPharmacies([])
        setMapCenter(null)
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
    dialogTriggerRef.current = document.activeElement as HTMLElement | null
    setUnlockedCard(marineCards[Math.max(0, next - 1)])
  }

  const closeUnlockedCard = () => setUnlockedCard(null)

  const startNewScan = () => {
    setSessionEnded(false)
    resetAnalysisState()
    window.history.replaceState({ page: 'home' }, '', pageHash.home)
    setPage('home')
    window.setTimeout(() => {
      document
        .getElementById('scan')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
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
    showToast('MediCycle demo progress has been reset.')
  }

  const pharmacySection = (
    <section className="pharmacy-section" id="nearest-pharmacy" aria-label="Nearby pharmacies">
      <div className="pharmacy-heading-row">
        <SectionHeading
          eyebrow="ACTION SUPPORT · PLAN A RETURN OPTION"
          title="Nearby pharmacies."
          text="These are nearby pharmacies, not verified medication return points. Contact the pharmacy to confirm medication take-back availability before visiting."
        />
        <div className="privacy-chip"><span aria-hidden="true" /> Uses OpenStreetMap search</div>
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
      <p className="location-note privacy-disclosure">Using your current location sends its coordinates to the OpenStreetMap Overpass service for this nearby search. Choose sample pharmacies to avoid sharing location.</p>
      {locatorState === 'locating' && (
        <p className="location-note" role="status">Allow location access when your browser asks. This usually takes a few seconds.</p>
      )}
      {locatorState === 'ready' && (
        <p className="location-note" role="status">Live OpenStreetMap results within {searchRadiusKm} km · sorted nearest first · take-back availability is not verified</p>
      )}
      {locatorState === 'fallback' && (
        <p className="location-note demo-note" role="status"><b>DEMO DATA</b> Showing sample pharmacies near Xitun District, Taichung.</p>
      )}
      {locatorState === 'location-error' && (
        <div className="location-error" role="alert">
          <p>We could not access your location. Enable Location Services for your browser, then try again.</p>
          <div><button type="button" className="text-button" onClick={locatePharmacies}>RETRY</button><button type="button" className="text-button" onClick={() => showFallbackLocation()}>VIEW SAMPLE RESULTS INSTEAD</button></div>
        </div>
      )}
      {locatorState === 'location-timeout' && (
        <div className="location-error" role="alert">
          <p>Your browser could not determine your location within 8 seconds. Check Location Services and try again.</p>
          <div><button type="button" className="text-button" onClick={locatePharmacies}>RETRY</button><button type="button" className="text-button" onClick={() => showFallbackLocation()}>VIEW SAMPLE RESULTS INSTEAD</button></div>
        </div>
      )}
      {locatorState === 'timeout' && (
        <div className="location-error" role="alert">
          <p>The pharmacy search timed out after 10 seconds. Your connection may be slow, or the map service may be busy.</p>
          <div><button type="button" className="text-button" onClick={locatePharmacies}>RETRY</button><button type="button" className="text-button" onClick={() => showFallbackLocation()}>VIEW SAMPLE RESULTS INSTEAD</button></div>
        </div>
      )}
      {locatorState === 'network-error' && (
        <div className="location-error" role="alert">
          <p>We could not reach the OpenStreetMap pharmacy search. Check your connection and try again.</p>
          <div><button type="button" className="text-button" onClick={locatePharmacies}>RETRY</button><button type="button" className="text-button" onClick={() => showFallbackLocation()}>VIEW SAMPLE RESULTS INSTEAD</button></div>
        </div>
      )}
      {locatorState === 'empty' && (
        <div className="location-error" role="status">
          <p>No pharmacies were found within 10 km. Try again or view clearly labeled sample results to continue the demo.</p>
          <div><button type="button" className="text-button" onClick={locatePharmacies}>RETRY</button><button type="button" className="text-button" onClick={() => showFallbackLocation()}>VIEW SAMPLE RESULTS INSTEAD</button></div>
        </div>
      )}
      {pharmacies.length > 0 && mapCenter && (
        <div aria-live="polite">
          <div className="pharmacy-results-layout">
            <PharmacyMap
              center={mapCenter}
              pharmacies={pharmacies}
              selectedPharmacyId={selectedPharmacyId}
              onSelectPharmacy={setSelectedPharmacyId}
              centerLabel={locatorState === 'fallback' ? 'Sample search center' : 'Your location'}
            />
            <div className="pharmacy-list">
              {pharmacies.map((pharmacy, index) => (
                <article
                  className={`pharmacy-row${selectedPharmacyId === pharmacy.id ? ' is-selected' : ''}`}
                  key={pharmacy.id}
                  aria-label={`Show ${pharmacy.name} on the map`}
                  onClick={() => setSelectedPharmacyId(pharmacy.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedPharmacyId(pharmacy.id)
                    }
                  }}
                  tabIndex={0}
                >
                  <div className="pharmacy-number">{String(index + 1).padStart(2, '0')}</div>
                  <div className="pharmacy-copy">
                    <h3>{pharmacy.name}</h3>
                    <p>{pharmacy.address}</p>
                    {pharmacy.phone && <small>Phone: {pharmacy.phone}</small>}
                    {pharmacy.openingHours && <small>Hours: {pharmacy.openingHours}</small>}
                    <small className={`verification-label is-${pharmacy.takeBackStatus}`}>
                      {pharmacy.takeBackStatus === 'osm-listed'
                        ? 'OSM-LISTED DRUG RECYCLING · NOT OFFICIALLY VERIFIED · CONTACT PHARMACY TO CONFIRM'
                        : 'UNVERIFIED MEDICATION TAKE-BACK · CONTACT PHARMACY TO CONFIRM'}
                    </small>
                  </div>
                  <div className="pharmacy-actions">
                    <strong>{pharmacy.distance < 1 ? `${Math.round(pharmacy.distance * 1000)} m` : `${pharmacy.distance.toFixed(1)} km`}</strong>
                    <div>
                      <button type="button" className="map-focus-button" onClick={(event) => { event.stopPropagation(); setSelectedPharmacyId(pharmacy.id) }}>SHOW ON MAP</button>
                      {pharmacy.phone && <a className="phone-link" href={`tel:${pharmacy.phone}`} onClick={(event) => event.stopPropagation()}>CALL</a>}
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lon}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>DIRECTIONS</a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <p className="data-source">Pharmacy locations and details come from OpenStreetMap contributors. OSM pharmacy data does not verify medication take-back participation.</p>
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
          {sessionEnded && (
            <section className="session-ended" role="status" aria-labelledby="session-ended-title">
              <div><p className="eyebrow">DEMO SESSION</p><h2 id="session-ended-title">Demo session ended</h2><p>For privacy and clarity, a result is not restored after refresh.</p></div>
              <button type="button" className="figma-button black" onClick={startNewScan}>START NEW SCAN</button>
            </section>
          )}
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
              <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/heic,image/heif" hidden onChange={selectFile('upload')} />
              <div className="photo-entry-actions" aria-label="Choose how to add a photo">
                <button type="button" className="figma-button black" onClick={openCamera} disabled={cameraState === 'opening'}>
                  {captureSource === 'camera' && file ? 'RETAKE PHOTO' : 'TAKE A PHOTO'}
                </button>
                <button type="button" className="figma-button outline" onClick={() => { stopCamera(); uploadRef.current?.click() }}>
                  {captureSource === 'upload' && file ? 'REPLACE PHOTO' : 'UPLOAD FROM DEVICE'}
                </button>
              </div>
              {cameraState === 'opening' && <p className="camera-status" role="status"><span className="spinner dark" aria-hidden="true" /> Opening camera…</p>}
              {cameraState === 'permission-denied' && <div className="camera-status is-error" role="alert"><b>Camera permission denied.</b><span>Allow camera access in browser settings, or use Upload from device instead.</span></div>}
              {cameraState === 'unavailable' && <div className="camera-status is-error" role="alert"><b>Camera unavailable.</b><span>This device or browser could not open a camera. Use Upload from device instead.</span></div>}
              {cameraState === 'ready' && (
                <div className="camera-stage" role="region" aria-label="Camera preview">
                  <video ref={cameraVideoRef} autoPlay muted playsInline />
                  <div><button type="button" className="figma-button black" onClick={captureCameraPhoto}>CAPTURE PHOTO</button><button type="button" className="text-button" onClick={() => stopCamera()}>CANCEL CAMERA</button></div>
                </div>
              )}
              {cameraState === 'idle' && <p className="camera-fallback-note">Camera unavailable or permission declined? Use <b>Upload from device</b> instead.</p>}
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
              aria-disabled={recycledForResult}
            >
              {recycledForResult ? '✓ MARINE LIFE UNLOCKED' : returnPlanConfirmed ? 'SIMULATE COMPLETION & UNLOCK' : 'FIND / PLAN A RETURN OPTION'}
            </button>
          </div>

          {recycledForResult && <Quiz />}
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
        <div className="card-dialog-backdrop" role="presentation" onMouseDown={closeUnlockedCard}>
          <section className="card-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="card-title" aria-describedby="card-description" onMouseDown={(event) => event.stopPropagation()}>
            <button ref={dialogCloseRef} className="dialog-close" type="button" onClick={closeUnlockedCard} aria-label="Close card">×</button>
            <p>SECRET MARINE LIFE CARD</p><h2 id="card-title">You unlocked {unlockedCard.name}!</h2>
            <img src={unlockedCard.image} alt={`${unlockedCard.name} marine life card`} width={440} height={590} />
            <p id="card-description" className="sr-only">A marine life card was unlocked after the demo completion.</p>
            <button type="button" className="figma-button black" onClick={() => { closeUnlockedCard(); window.setTimeout(() => document.getElementById('impact-check')?.scrollIntoView({ behavior: 'smooth' }), 80) }}>CONTINUE TO IMPACT CHECK</button>
          </section>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  )
}

export default App
