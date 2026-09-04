import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  authenticateAccount,
  logoutAccount,
  resetAccountProgress,
} from './account'
import type { MediCycleProgress } from './progress'
import { useI18n } from './i18n'

type AccountDialogProps = {
  open: boolean
  signedIn: boolean
  progress: MediCycleProgress
  onClose: () => void
  onAuthenticated: (progress: MediCycleProgress, created: boolean) => void
  onLoggedOut: () => void
  onProgressReset: (progress: MediCycleProgress) => void
}

export function AccountDialog({
  open,
  signedIn,
  progress,
  onClose,
  onAuthenticated,
  onLoggedOut,
  onProgressReset,
}: AccountDialogProps) {
  const { t } = useI18n()
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    window.requestAnimationFrame(() => closeRef.current?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(pin)) {
      setError(t('pinError'))
      return
    }
    setIsWorking(true)
    try {
      const result = await authenticateAccount(mode, phone, pin, progress)
      setPhone('')
      setPin('')
      onAuthenticated(result.progress, result.created)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The account service is unavailable.')
    } finally {
      setIsWorking(false)
    }
  }

  const logout = async () => {
    setError('')
    setIsWorking(true)
    try {
      await logoutAccount()
      setPhone('')
      setPin('')
      onLoggedOut()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not log out.')
    } finally {
      setIsWorking(false)
    }
  }

  const reset = async () => {
    if (!window.confirm(t('resetConfirm'))) return
    setError('')
    setIsWorking(true)
    try {
      onProgressReset(await resetAccountProgress())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reset progress.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <div className="account-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="account-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button ref={closeRef} className="dialog-close" type="button" onClick={onClose} aria-label={t('closeAccount')}>×</button>
        <p className="eyebrow">{t('prototypeAccount')}</p>
        <h2 id="account-title">{t('accountTitle')}</h2>
        <p className="account-intro">{t('accountIntro')}</p>

        {signedIn ? (
          <div className="account-signed-in">
            <p className="account-status"><span aria-hidden="true" /> {t('signedInStatus')}</p>
            <div className="account-progress-grid" aria-label={t('savedProgress')}>
              <div><b>{progress.marineCollection.length}/6</b><span>{t('marineCards')}</span></div>
              <div><b>{progress.quiz.completed ? `${progress.quiz.bestScore}/6` : '—'}</b><span>{t('bestQuiz')}</span></div>
              <div><b>{progress.recycledDemoCount}</b><span>{t('demoCompletions')}</span></div>
            </div>
            <button className="figma-button black" type="button" onClick={logout} disabled={isWorking}>{t('logOut')}</button>
            <button className="text-button account-reset" type="button" onClick={reset} disabled={isWorking}>{t('resetMyProgress')}</button>
          </div>
        ) : (
          <>
            <div className="account-mode-tabs" role="tablist" aria-label="Account action">
              <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => { setMode('register'); setError('') }}>{t('firstTime')}</button>
              <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => { setMode('login'); setError('') }}>{t('signIn')}</button>
            </div>
            <form className="account-form" onSubmit={submit}>
              <label htmlFor="account-phone">{t('phoneNumber')}</label>
              <input
                id="account-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={t('countryCode')}
                required
              />
              <label htmlFor="account-pin">{mode === 'register' ? t('createPin') : t('pin')}</label>
              <input
                id="account-pin"
                type="password"
                inputMode="numeric"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
              <button className="figma-button black" type="submit" disabled={isWorking}>
                {isWorking ? t('pleaseWait') : mode === 'register' ? t('createAccount') : t('signInRestore')}
              </button>
            </form>
          </>
        )}

        <p className="account-error" aria-live="polite">{error}</p>
        <p className="account-privacy">{t('accountPrivacy')}</p>
      </section>
    </div>
  )
}
