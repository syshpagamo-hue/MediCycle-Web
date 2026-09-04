import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import './App.css'
import { AccountDialog } from './AccountDialog'
import { DetectionPreview } from './DetectionPreview'
import { PharmacyMap } from './PharmacyMap'
import { Quiz } from './Quiz'
import { restoreAccount, resetAccountProgress, syncAccountProgress } from './account'
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
  medicationReturnGuidance,
  pageHash,
  type AnalysisResult,
  type Coordinates,
  type LocatorState,
  type PageName,
  type Pharmacy,
} from './data'
import {
  buildPharmacySearchPath,
  parsePharmacySearchResponse,
  sortByDistance,
} from './pharmacy'
import {
  EMPTY_PROGRESS,
  clearLocalProgress,
  getLocalProgress,
  mergeProgress,
  saveLocalProgress,
  type MediCycleProgress,
} from './progress'
import { useI18n } from './i18n'
import {
  getMedicineColor,
  getMedicineDisplayName,
  getMedicineMeta,
  type MedicineCategory,
} from './medicineMeta'
import {
  MEDICYCLE_CLASS_NAMES,
  ModelUnavailableError,
  runYoloInference,
  type Detection,
  type InferenceBackend,
  type InferenceStage,
} from './inference/yolo'

const PHARMACY_API_TIMEOUT_MS = 40_000

const zhMarineFacts = [
  { name: '白鯨', label: '生物累積', text: '藥物殘留與內分泌干擾物可能在海洋哺乳類體內累積，影響免疫、繁殖力與族群的長期健康。' },
  { name: '綠蠵龜', label: '內分泌干擾', text: '環境中的雌激素可能干擾發育訊號與生殖平衡，對脆弱的海洋族群造成影響。' },
  { name: '小丑魚', label: '生殖健康', text: '炔雌醇等合成荷爾蒙可能干擾魚類的性腺發育、繁殖與行為。' },
  { name: '珊瑚礁', label: '生態韌性', text: '進入廢水的藥物殘留可能影響珊瑚與其他海洋生物的生長及繁殖能力。' },
  { name: '污染水域中的魚', label: '跨世代影響', text: '持續暴露可能降低繁殖力與存活率，影響並可能在多個世代中累積。' },
] as const

const zhMarineCardNames = ['小丑魚', '白鯨', '綠蠵龜', '珊瑚礁', '水母', '魟魚'] as const

type CameraState =
  | 'idle'
  | 'opening'
  | 'ready'
  | 'permission-denied'
  | 'unavailable'

type InferenceStatus =
  | 'idle'
  | InferenceStage
  | 'success'
  | 'unreliable'
  | 'model-error'
  | 'inference-error'

type Prediction = {
  label: string
  confidence: number
  backend: InferenceBackend
  inferenceMs: number
}

function App() {
  const { t, language } = useI18n()
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
  const [inferenceStatus, setInferenceStatus] = useState<InferenceStatus>('idle')
  const [detections, setDetections] = useState<Detection[]>([])
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [locatorState, setLocatorState] = useState<LocatorState>('idle')
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [mapCenter, setMapCenter] = useState<Coordinates | null>(null)
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null)
  const [searchRadiusKm, setSearchRadiusKm] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const [unlockedCard, setUnlockedCard] = useState<(typeof marineCards)[number] | null>(null)
  const [savedProgress, setSavedProgress] = useState(getLocalProgress)
  const [accountStatus, setAccountStatus] = useState<'checking' | 'guest' | 'signed-in'>('checking')
  const [accountOpen, setAccountOpen] = useState(false)
  const [recycledForResult, setRecycledForResult] = useState(false)
  const [returnPlanConfirmed, setReturnPlanConfirmed] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(
    () => window.location.hash === pageHash.result,
  )
  const recycledCount = savedProgress.marineCollection.length
  const predictionMeta = prediction
    ? getMedicineMeta(prediction.label)
    : undefined
  const hasHormoneTherapyDetection = detections.some(
    (detection) => getMedicineMeta(detection.label, detection.classId)?.category === 'hormone-therapy',
  )

  const medicineCategoryLabel = (category: MedicineCategory) => {
    if (category === 'hormone-therapy') return t('hormoneTherapy')
    if (category === 'endocrine-related') return t('endocrineRelated')
    return t('otherUnclassified')
  }

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
    let active = true
    const localProgress = getLocalProgress()
    void restoreAccount()
      .then(async (remoteProgress) => {
        if (!active) return
        if (!remoteProgress) {
          setAccountStatus('guest')
          return
        }
        const merged = mergeProgress(remoteProgress, localProgress)
        saveLocalProgress(merged)
        setSavedProgress(merged)
        setAccountStatus('signed-in')
        if (JSON.stringify(merged) !== JSON.stringify(remoteProgress)) {
          const synchronized = await syncAccountProgress(merged)
          if (!active) return
          const finalProgress = mergeProgress(merged, synchronized)
          saveLocalProgress(finalProgress)
          setSavedProgress(finalProgress)
        }
      })
      .catch(() => {
        if (active) setAccountStatus('guest')
      })
    return () => {
      active = false
    }
  }, [])

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

  const applyProgress = (progress: MediCycleProgress) => {
    setSavedProgress(progress)
    try {
      saveLocalProgress(progress)
    } catch {
      showToast('Progress could not be saved on this device.')
    }
  }

  const persistProgress = (progress: MediCycleProgress) => {
    applyProgress(progress)
    if (accountStatus !== 'signed-in') return
    void syncAccountProgress(progress)
      .then((remoteProgress) => {
        const merged = mergeProgress(progress, remoteProgress)
        applyProgress(merged)
      })
      .catch(() => showToast('Saved on this device. Account sync will retry next time.'))
  }

  const handleAuthenticated = (progress: MediCycleProgress, created: boolean) => {
    applyProgress(progress)
    setAccountStatus('signed-in')
    setAccountOpen(false)
    showToast(created ? 'Prototype account created. Progress is synced.' : 'Signed in. Progress restored.')
  }

  const handleProgressReset = (progress: MediCycleProgress) => {
    applyProgress(progress)
    setRecycledForResult(false)
    setReturnPlanConfirmed(false)
    setUnlockedCard(null)
    showToast('Your saved progress has been reset. Your account is still active.')
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
    setInferenceStatus('idle')
    setDetections([])
    setPrediction(null)
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

  const analyzeMedicine = async () => {
    if (!file) {
      showToast(t('selectPhotoFirst'))
      return
    }
    stopCamera()
    setSessionEnded(false)
    setIsAnalyzing(true)
    setResult(null)
    setDetections([])
    setPrediction(null)
    let currentStage: InferenceStage = 'loading-model'
    setInferenceStatus(currentStage)

    try {
      const inference = await runYoloInference(file, {
        labels: [...MEDICYCLE_CLASS_NAMES],
        confidenceThreshold: 0.25,
        iouThreshold: 0.45,
        maxDetections: 100,
        hasObjectness: false,
        onStage: (stage) => {
          currentStage = stage
          setInferenceStatus(stage)
        },
      })
      const topDetection = inference.detections[0]
      setDetections(inference.detections)
      if (!topDetection || topDetection.confidence < 0.5) {
        setInferenceStatus('unreliable')
        return
      }

      setPrediction({
        label: topDetection.label,
        confidence: topDetection.confidence,
        backend: inference.backend,
        inferenceMs: inference.inferenceMs,
      })
      setResult({
        ...medicationReturnGuidance,
        drugName: topDetection.label,
        steps: [...medicationReturnGuidance.steps],
      })
      setRecycledForResult(false)
      setInferenceStatus('success')
      window.history.pushState({ page: 'result' }, '', pageHash.result)
      setPage('result')
    } catch (error) {
      console.error('Medicine inference failed.', error)
      setInferenceStatus(
        error instanceof ModelUnavailableError || currentStage === 'loading-model'
          ? 'model-error'
          : 'inference-error',
      )
    } finally {
      setIsAnalyzing(false)
    }
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
          PHARMACY_API_TIMEOUT_MS,
        )
        try {
          const response = await fetch(
            buildPharmacySearchPath({ lat: latitude, lon: longitude }),
            { signal: controller.signal, headers: { Accept: 'application/json' } },
          )
          if (!response.ok) throw new Error('Pharmacy proxy failed')
          const data = parsePharmacySearchResponse(await response.json())
          if (!data) throw new Error('Invalid pharmacy proxy response')
          const nearby = data.pharmacies

          if (attempt !== pharmacySearchAttemptRef.current) return
          if (!nearby.length) {
            setPharmacies([])
            setLocatorState('empty')
            setMapCenter({ lat: latitude, lon: longitude })
            setSearchRadiusKm(data.radiusKm)
            return
          }
          setPharmacies(nearby)
          setMapCenter({ lat: latitude, lon: longitude })
          setSearchRadiusKm(data.radiusKm)
          setLocatorState('ready')
        } catch (error) {
          if (attempt !== pharmacySearchAttemptRef.current) return
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
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    )
  }

  const markAsRecycled = () => {
    if (recycledForResult || !returnPlanConfirmed) return
    const next = Math.min(recycledCount + 1, marineCards.length)
    const unlocked = marineCards
      .slice(0, next)
      .map((card) => card.name)
    persistProgress({
      ...savedProgress,
      marineCollection: unlocked,
      recycledDemoCount: savedProgress.recycledDemoCount + 1,
    })
    setRecycledForResult(true)
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

  const resetDemoProgress = async () => {
    const confirmed = window.confirm(
      accountStatus === 'signed-in'
        ? 'Reset your synced MediCycle progress? Your account will remain available.'
        : 'Reset MediCycle demo progress on this device?',
    )
    if (!confirmed) return
    try {
      const progress = accountStatus === 'signed-in'
        ? await resetAccountProgress()
        : structuredClone(EMPTY_PROGRESS)
      clearLocalProgress()
      applyProgress(progress)
    } catch {
      showToast('Demo progress could not be cleared on this device.')
      return
    }
    setRecycledForResult(false)
    setReturnPlanConfirmed(false)
    setUnlockedCard(null)
    showToast('MediCycle demo progress has been reset.')
  }

  const confirmReturnPlan = () => {
    setReturnPlanConfirmed(true)
    if (savedProgress.returnPlanCompleted) return
    persistProgress({ ...savedProgress, returnPlanCompleted: true })
  }

  const recordQuizResult = (score: number, total: number) => {
    persistProgress({
      ...savedProgress,
      quiz: {
        completed: true,
        bestScore: Math.max(savedProgress.quiz.bestScore, score),
        total,
      },
    })
  }

  const canViewSamplePharmacies = [
    'location-error',
    'location-timeout',
    'timeout',
    'network-error',
  ].includes(locatorState)

  const pharmacySection = (
    <section className="pharmacy-section" id="nearest-pharmacy" aria-label={t('pharmacyAria')}>
      <div className="pharmacy-heading-row">
        <SectionHeading
          eyebrow={t('pharmacyEyebrow')}
          title={t('pharmacyTitle')}
          text={t('pharmacyIntro')}
        />
        <div className="privacy-chip"><span aria-hidden="true" /> {t('osmSearch')}</div>
      </div>
      <div className="pharmacy-entry-actions">
        <button
          type="button"
          className="figma-button black"
          onClick={locatePharmacies}
          disabled={locatorState === 'locating'}
        >
          {locatorState === 'locating' ? t('finding') : t('useLocation')}
        </button>
        {canViewSamplePharmacies && (
          <button type="button" className="figma-button outline" onClick={() => showFallbackLocation()}>
            {t('viewSamples')}
          </button>
        )}
      </div>
      <p className="location-note privacy-disclosure">{t('privacyCoordinates')}</p>
      {locatorState === 'locating' && (
        <p className="location-note" role="status">{t('allowLocation')}</p>
      )}
      {locatorState === 'ready' && (
        <p className="location-note" role="status">{t('liveResults', { radius: searchRadiusKm ?? 0 })}</p>
      )}
      {locatorState === 'fallback' && (
        <p className="location-note demo-note" role="status"><b>{t('demoSample')}</b> {t('demoSampleText')}</p>
      )}
      {locatorState === 'location-error' && (
        <div className="location-error" role="alert">
          <p>{t('locationError')}</p>
          <div><button type="button" className="text-button" onClick={locatePharmacies}>{t('retry')}</button><button type="button" className="text-button" onClick={() => showFallbackLocation()}>{t('viewSamplesInstead')}</button></div>
        </div>
      )}
      {locatorState === 'location-timeout' && (
        <div className="location-error" role="alert">
          <p>{t('locationTimeout')}</p>
          <div><button type="button" className="text-button" onClick={locatePharmacies}>{t('retry')}</button><button type="button" className="text-button" onClick={() => showFallbackLocation()}>{t('viewSamplesInstead')}</button></div>
        </div>
      )}
      {locatorState === 'timeout' && (
        <div className="location-error" role="alert">
          <p>{t('searchTimeout')}</p>
          <div><button type="button" className="text-button" onClick={locatePharmacies}>{t('retry')}</button><button type="button" className="text-button" onClick={() => showFallbackLocation()}>{t('viewSamplesInstead')}</button></div>
        </div>
      )}
      {locatorState === 'network-error' && (
        <div className="location-error" role="alert">
          <p>{t('networkError')}</p>
          <div><button type="button" className="text-button" onClick={locatePharmacies}>{t('retry')}</button><button type="button" className="text-button" onClick={() => showFallbackLocation()}>{t('viewSamplesInstead')}</button></div>
        </div>
      )}
      {locatorState === 'empty' && (
        <div className="location-error" role="status">
          <p>{t('emptyResults')}</p>
          <div><button type="button" className="text-button" onClick={locatePharmacies}>{t('retry')}</button></div>
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
              centerLabel={locatorState === 'fallback' ? t('sampleCenter') : t('yourLocation')}
            />
            <div className="pharmacy-list">
              {pharmacies.map((pharmacy, index) => (
                <article
                  className={`pharmacy-row${selectedPharmacyId === pharmacy.id ? ' is-selected' : ''}`}
                  key={pharmacy.id}
                  aria-label={t('showOnMapAria', { name: pharmacy.name })}
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
                    {pharmacy.address && <p>{pharmacy.address}</p>}
                    {pharmacy.phone && <small>{t('phone')}: {pharmacy.phone}</small>}
                    {pharmacy.openingHours && <small>{t('hours')}: {pharmacy.openingHours}</small>}
                    <small className={`verification-label is-${pharmacy.takeBackStatus}`}>
                      {pharmacy.takeBackStatus === 'osm-listed'
                        ? t('osmTakeBack')
                        : t('unverifiedTakeBack')}
                    </small>
                  </div>
                  <div className="pharmacy-actions">
                    <strong>{pharmacy.distance < 1 ? `${Math.round(pharmacy.distance * 1000)} m` : `${pharmacy.distance.toFixed(1)} km`}</strong>
                    <div>
                      <button type="button" className="map-focus-button" onClick={(event) => { event.stopPropagation(); setSelectedPharmacyId(pharmacy.id) }}>{t('showOnMap')}</button>
                      {pharmacy.phone && <a className="phone-link" href={`tel:${pharmacy.phone}`} onClick={(event) => event.stopPropagation()}>{t('call')}</a>}
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lon}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>{t('directions')}</a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <p className="data-source">{t('pharmacySource')}</p>
          {page === 'result' && (
            <div className="return-plan-action">
              <div>
                <b>{returnPlanConfirmed ? t('returnPlanned') : t('nextContactPlan')}</b>
                <p>{t('choosePharmacy')}</p>
              </div>
              <button
                type="button"
                className={`figma-button ${returnPlanConfirmed ? 'gray' : 'black'}`}
                onClick={confirmReturnPlan}
                disabled={returnPlanConfirmed}
              >
                {returnPlanConfirmed ? t('planRecorded') : t('contactPharmacy')}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )

  return (
    <main className="figma-site">
      <SiteHeader
        page={page}
        recycledCount={recycledCount}
        accountStatus={accountStatus}
        onNavigate={navigate}
        onSection={goToSection}
        onAccount={() => setAccountOpen(true)}
      />

      <AccountDialog
        open={accountOpen}
        signedIn={accountStatus === 'signed-in'}
        progress={savedProgress}
        onClose={() => setAccountOpen(false)}
        onAuthenticated={handleAuthenticated}
        onLoggedOut={() => {
          setAccountStatus('guest')
          setAccountOpen(false)
          showToast('Logged out. Progress remains saved on this device and in your account.')
        }}
        onProgressReset={handleProgressReset}
      />

      {page === 'home' && (
        <div className="page-shell landing-page">
          {sessionEnded && (
            <section className="session-ended" role="status" aria-labelledby="session-ended-title">
              <div><p className="eyebrow">{t('session')}</p><h2 id="session-ended-title">{t('sessionEnded')}</h2><p>{t('sessionPrivacy')}</p></div>
              <button type="button" className="figma-button black" onClick={startNewScan}>{t('newScan')}</button>
            </section>
          )}
          <HeroArtwork onScan={() => goToSection('scan')} />

          <section className="value-strip" aria-label="Product value">
            <div><span>AI</span><p><b>{t('fixedCase')}</b><small>{t('fixedCaseText')}</small></p></div>
            <div><span>LOCAL</span><p><b>{t('privatePreview')}</b><small>{t('privatePreviewText')}</small></p></div>
            <div><span>4</span><p><b>{t('guidedSteps')}</b><small>{t('guidedStepsText')}</small></p></div>
            <div><span>6</span><p><b>{t('marineStories')}</b><small>{t('marineStoriesText')}</small></p></div>
          </section>

          <section className="scan-section" id="scan" aria-labelledby="scan-title">
            <div className="scan-intro">
              <SectionHeading
                id="scan-title"
                eyebrow={t('scanEyebrow')}
                title={t('scanTitle')}
                text={t('scanText')}
              />
              <ProcessSteps active={0} />
              <div className="prototype-note">
                <b>{t('demoNoAi')}</b>
                <p>{t('demoNoAiText')}</p>
              </div>
            </div>

            <div className="upload-panel">
              <div className="upload-panel-head">
                <div><span className="status-dot" aria-hidden="true" /> {t('browserInference')}</div>
                <small>JPG · PNG · HEIC · MAX 10 MB</small>
              </div>
              <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/heic,image/heif" hidden onChange={selectFile('upload')} />
              <div className="photo-entry-actions" aria-label="Choose how to add a photo">
                <button type="button" className="figma-button black" onClick={openCamera} disabled={cameraState === 'opening'}>
                  {captureSource === 'camera' && file ? t('retakePhoto') : t('takePhoto')}
                </button>
                <button type="button" className="figma-button outline" onClick={() => { stopCamera(); uploadRef.current?.click() }}>
                  {captureSource === 'upload' && file ? t('replacePhoto') : t('uploadDevice')}
                </button>
              </div>
              {cameraState === 'opening' && <p className="camera-status" role="status"><span className="spinner dark" aria-hidden="true" /> Opening camera…</p>}
              {cameraState === 'permission-denied' && <div className="camera-status is-error" role="alert"><b>Camera permission denied.</b><span>Allow camera access in browser settings, or use Upload from device instead.</span></div>}
              {cameraState === 'unavailable' && <div className="camera-status is-error" role="alert"><b>Camera unavailable.</b><span>This device or browser could not open a camera. Use Upload from device instead.</span></div>}
              {cameraState === 'ready' && (
                <div className="camera-stage" role="region" aria-label="Camera preview">
                  <video ref={cameraVideoRef} autoPlay muted playsInline />
                  <div><button type="button" className="figma-button black" onClick={captureCameraPhoto}>{t('capturePhoto')}</button><button type="button" className="text-button" onClick={() => stopCamera()}>{t('cancelCamera')}</button></div>
                </div>
              )}
              {cameraState === 'idle' && <p className="camera-fallback-note">Camera unavailable or permission declined? Use <b>Upload from device</b> instead.</p>}
              <div
                className={`photo-picker${isDragging ? ' is-dragging' : ''}${preview ? ' has-photo' : ''}`}
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={dropFile}
              >
                {preview ? <DetectionPreview src={preview} alt={t('selectedMedicinePreview')} detections={detections} /> : (
                  <div className="upload-empty">
                    <span aria-hidden="true">+</span>
                    <p>{t('photoPreview')}</p>
                    <small>Use Take a photo or Upload from device above. Desktop users can also drop an image here.</small>
                  </div>
                )}
              </div>
              {file && (
                <div className="file-summary" aria-live="polite">
                  <div><span aria-hidden="true">✓</span><p><b>{t('previewReady')}</b><small>{file.name}</small></p></div>
                  <button type="button" className="text-button" onClick={removeFile}>{t('cancel')}</button>
                </div>
              )}
              {inferenceStatus !== 'idle' && (() => {
                const copy = inferenceStatus === 'loading-model'
                  ? [t('modelLoading'), t('modelLoadingDetail')]
                  : inferenceStatus === 'preprocessing'
                    ? [t('preparingImage'), t('preparingImageDetail')]
                    : inferenceStatus === 'running'
                      ? [t('inferenceRunning'), t('inferenceRunningDetail')]
                      : inferenceStatus === 'success'
                        ? [t('inferenceComplete'), t('inferenceCompleteDetail')]
                        : inferenceStatus === 'unreliable'
                          ? [t('unableReliable'), t('retakeRequest')]
                          : inferenceStatus === 'model-error'
                            ? [t('modelLoadFailed'), t('modelLoadFailedDetail')]
                            : [t('inferenceFailed'), t('inferenceFailedDetail')]
                return (
                  <div
                    className={`inference-status is-${inferenceStatus}`}
                    role={inferenceStatus === 'model-error' || inferenceStatus === 'inference-error' ? 'alert' : 'status'}
                  >
                    <span aria-hidden="true" />
                    <p><b>{copy[0]}</b><small>{copy[1]}</small></p>
                  </div>
                )
              })()}
              <button type="button" className="figma-button black analyze-button" onClick={analyzeMedicine} disabled={isAnalyzing || !file}>
                {isAnalyzing ? <><span className="spinner" aria-hidden="true" /> {t('openingDemo')}</> : t('continueDemo')}
              </button>
              <p className="privacy-note">{t('inferencePrivacy')}</p>
            </div>
          </section>

          <section className="impact-section" id="impact">
            <div className="impact-statement">
              <p className="eyebrow">{t('whyEyebrow')}</p>
              <h2>{t('whyTitle').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h2>
              <p>{t('whyText')}</p>
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
            <SectionHeading id="learn-title" eyebrow={t('oceanConnection')} title={t('oceanTitle')} text={t('oceanText')} />
            <div className="marine-grid">
              {marineFacts.map((fact, index) => {
                const copy = language === 'zh-TW' ? zhMarineFacts[index] : fact
                return (
                <article key={fact.name}>
                  <div className="marine-image-wrap"><img src={fact.image} alt="" width={420} height={420} /></div>
                  <p className="fact-label">{copy.label}</p><h3>{copy.name}</h3><p>{copy.text}</p>
                </article>
                )
              })}
            </div>
          </section>

          <section className="activity-section">
            <div className="activity-heading">
              <SectionHeading eyebrow={t('reinforcement')} title={t('collectionTitle')} />
              <p><b>{t('cardsUnlockedDevice', { count: recycledCount })}</b></p>
            </div>
            <ActivityBanner onOpen={() => navigate('activity')} />
          </section>
          {pharmacySection}
        </div>
      )}

      {page === 'result' && result && (
        <div className="page-shell result-page">
          <div className="result-topbar"><button className="back-link" type="button" onClick={() => navigate('home')}>{t('backPreview')}</button><span>{t('resultMode')}</span></div>
          <ProcessSteps active={recycledForResult ? 4 : returnPlanConfirmed ? 2 : 1} />
          <section className="result-hero" aria-live="polite">
            <div className="result-image">
              {preview && <DetectionPreview src={preview} alt={t('analyzedMedicinePreview')} detections={detections} />}
              {preview && <div className="preview-disclaimer">{t('detectionOverlay')}</div>}
            </div>
            <div className={`result-summary${predictionMeta?.highlight ? ` is-${predictionMeta.category}` : ''}`}>
              <p className="eyebrow">{prediction && prediction.confidence >= 0.7 ? t('likelyMatch') : t('possibleMatch')}</p>
              <h1>{prediction ? getMedicineDisplayName(prediction.label) : result.drugName}</h1><p className="category-line">{t('resultCategory')}</p>
              {predictionMeta?.highlight && (
                <p className={`medicine-category is-${predictionMeta.category}`}>
                  <span aria-hidden="true">{predictionMeta.category === 'hormone-therapy' ? 'H' : 'E'}</span>
                  {medicineCategoryLabel(predictionMeta.category)}
                </p>
              )}
              <div className={`medicine-highlight-legend${hasHormoneTherapyDetection ? ' has-hormone-detection' : ''}`} aria-label={t('classificationLegend')}>
                <span className="is-hormone-therapy"><i aria-hidden="true">H</i>{t('hormoneTherapy')}</span>
                <span className="is-endocrine-related"><i aria-hidden="true">E</i>{t('endocrineRelated')}</span>
              </div>
              {hasHormoneTherapyDetection && (
                <aside className="hormone-highlight-explanation">
                  <span aria-hidden="true">H</span>
                  <div><b>{t('hormoneHighlightTitle')}</b><p>{t('hormoneHighlightExplanation')}</p></div>
                </aside>
              )}
              {prediction && (
                <div className="confidence-meter">
                  <div><span>{t('confidence')}</span><b>{(prediction.confidence * 100).toFixed(1)}%</b></div>
                  <i aria-hidden="true"><span style={{ width: `${prediction.confidence * 100}%` }} /></i>
                  <small>{t('inferenceBackend', { backend: prediction.backend.toUpperCase(), ms: Math.round(prediction.inferenceMs) })}</small>
                </div>
              )}
              <div className="candidate-list">
                <div className="candidate-list-heading">
                  <b>{t('detectedCandidates')}</b>
                  <small>{t('classificationMappingNote')}</small>
                </div>
                <ol>
                  {detections.map((detection, index) => {
                    const meta = getMedicineMeta(detection.label, detection.classId)
                    return (
                      <li className={meta?.highlight ? `is-${meta.category}` : undefined} key={`${detection.classId}-${index}`}>
                        <span className="candidate-swatch" style={{ backgroundColor: getMedicineColor(detection.label, detection.classId) }} aria-hidden="true" />
                        <b>{getMedicineDisplayName(detection.label, detection.classId)}</b>
                        {meta?.highlight && <em><i aria-hidden="true">{meta.category === 'hormone-therapy' ? 'H' : 'E'}</i>{medicineCategoryLabel(meta.category)}</em>}
                        <small>{(detection.confidence * 100).toFixed(1)}%</small>
                      </li>
                    )
                  })}
                </ol>
              </div>
              <div className={`action-badge ${result.action}`}><span aria-hidden="true">{result.action === 'return' ? '↗' : '✓'}</span>{t('returnProfessional')}</div>
              <div className="demo-result-notice"><b>{t('candidateOnly')}</b><span>{t('resultNotice')}</span></div>
              <p className="medical-disclaimer">{t('medicalDisclaimer')}</p>
            </div>
          </section>

          <section className="disposal-plan">
            <SectionHeading eyebrow={t('disposalEyebrow')} title={t('disposalTitle')} text={language === 'zh-TW' ? t('disposalReason') : result.reason} />
            <ol>{(language === 'zh-TW' ? [t('disposalStep1'), t('disposalStep2'), t('disposalStep3')] : result.steps).map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol>
          </section>
          {pharmacySection}

          <div className="result-action-panel">
            <div><p className="eyebrow">{t('completionEyebrow')}</p><h2>{recycledForResult ? t('completionDone') : returnPlanConfirmed ? t('completionReady') : t('completionFind')}</h2></div>
            <button
              type="button"
              className={`figma-button blue${recycledForResult ? ' completed' : ''}`}
              onClick={() => returnPlanConfirmed ? markAsRecycled() : document.getElementById('nearest-pharmacy')?.scrollIntoView({ behavior: 'smooth' })}
              aria-disabled={recycledForResult}
            >
              {recycledForResult ? t('marineUnlocked') : returnPlanConfirmed ? t('simulateUnlock') : t('findPlan')}
            </button>
          </div>

          {recycledForResult && (
            <Quiz
              key={`${savedProgress.quiz.completed}-${savedProgress.quiz.bestScore}`}
              savedResult={savedProgress.quiz}
              onComplete={recordQuizResult}
            />
          )}
        </div>
      )}

      {page === 'activity' && (
        <div className="page-shell activity-page">
          <div className="result-topbar"><button className="back-link" type="button" onClick={() => navigate('home')}>{t('backHome')}</button><span>{t('myOcean')}</span></div>
          <ActivityBanner />
          <section className="activity-copy">
            <p className="eyebrow">{t('oceanStory')}</p><h1>{t('oceanBuild')}</h1>
            <p>{recycledCount === marineCards.length ? t('activityCompleteText') : t('activityText')}</p>
            <div className={`collection-progress${recycledCount === marineCards.length ? ' is-complete' : ''}`}>
              <i><span style={{ width: `${(recycledCount / marineCards.length) * 100}%` }} /></i>
              <p>{t('cardsProgress', { count: recycledCount })}{recycledCount === marineCards.length ? ` · ${t('collectionComplete')}` : ''}</p>
              <button type="button" className="text-button reset-demo-button" onClick={resetDemoProgress}>{t('resetProgress')}</button>
            </div>
          </section>
          <section className="collection-grid" aria-label="Marine life card collection">
            {marineCards.map((card, index) => {
              const unlocked = index < recycledCount
              return (
                <article key={card.name} className={unlocked ? 'is-unlocked' : 'is-locked'}>
                  <div>{unlocked ? <img src={card.image} alt={`${card.name} marine life card`} /> : <span aria-hidden="true">?</span>}</div>
                  <p>{String(index + 1).padStart(2, '0')} / {String(marineCards.length).padStart(2, '0')}</p>
                  <h2>{unlocked ? (language === 'zh-TW' ? zhMarineCardNames[index] : card.name) : t('secretSpecies')}</h2>
                  <small>{unlocked ? t('unlocked') : t('lockedHint')}</small>
                </article>
              )
            })}
          </section>
          <div className="collection-cta">
            <div><p className="eyebrow">{recycledCount === marineCards.length ? t('collectionCompleteEyebrow') : t('collectionContinueEyebrow')}</p><h2>{recycledCount === marineCards.length ? t('collectionCompleteTitle') : t('collectionContinueTitle')}</h2></div>
            <button type="button" className="figma-button black" onClick={() => { navigate('home'); window.setTimeout(() => document.getElementById('scan')?.scrollIntoView({ behavior: 'smooth' }), 80) }}>{t('continueImpact')}</button>
          </div>
        </div>
      )}

      <footer className="site-footer">
        <div><b>MEDICYCLE AI</b><p>{t('footer')}</p></div>
        <div><span>STATIC COMPETITION PROTOTYPE · 2026</span><span>BUILT FOR RESPONSIBLE ACTION</span></div>
      </footer>

      {unlockedCard && (
        <div className="card-dialog-backdrop" role="presentation" onMouseDown={closeUnlockedCard}>
          <section className="card-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="card-title" aria-describedby="card-description" onMouseDown={(event) => event.stopPropagation()}>
            <button ref={dialogCloseRef} className="dialog-close" type="button" onClick={closeUnlockedCard} aria-label={t('closeCard')}>×</button>
            <p>{t('secretCard')}</p><h2 id="card-title">{t('youUnlocked', { name: unlockedCard.name })}</h2>
            <img src={unlockedCard.image} alt={`${unlockedCard.name} marine life card`} width={440} height={590} />
            <p id="card-description" className="sr-only">A marine life card was unlocked after the demo completion.</p>
            <button type="button" className="figma-button black" onClick={() => { closeUnlockedCard(); window.setTimeout(() => document.getElementById('impact-check')?.scrollIntoView({ behavior: 'smooth' }), 80) }}>{t('continueQuiz')}</button>
          </section>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  )
}

export default App
