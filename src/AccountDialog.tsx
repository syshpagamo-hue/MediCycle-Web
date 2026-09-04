import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  authenticateAccount,
  logoutAccount,
  resetAccountProgress,
} from './account'
import type { MediCycleProgress } from './progress'

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
      setError('PIN must contain exactly 6 digits.')
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
    if (!window.confirm('Reset your synced MediCycle progress? Your account will remain available.')) return
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
        <button ref={closeRef} className="dialog-close" type="button" onClick={onClose} aria-label="Close account">×</button>
        <p className="eyebrow">PROTOTYPE ACCOUNT</p>
        <h2 id="account-title">Keep your ocean progress.</h2>
        <p className="account-intro">This is a prototype phone-and-PIN account. It does not send an SMS and does not verify ownership of the phone number.</p>

        {signedIn ? (
          <div className="account-signed-in">
            <p className="account-status"><span aria-hidden="true" /> Signed in · progress sync is on</p>
            <div className="account-progress-grid" aria-label="Saved progress">
              <div><b>{progress.marineCollection.length}/6</b><span>Marine cards</span></div>
              <div><b>{progress.quiz.completed ? `${progress.quiz.bestScore}/6` : '—'}</b><span>Best quiz</span></div>
              <div><b>{progress.recycledDemoCount}</b><span>Demo completions</span></div>
            </div>
            <button className="figma-button black" type="button" onClick={logout} disabled={isWorking}>LOG OUT</button>
            <button className="text-button account-reset" type="button" onClick={reset} disabled={isWorking}>RESET MY PROGRESS</button>
          </div>
        ) : (
          <>
            <div className="account-mode-tabs" role="tablist" aria-label="Account action">
              <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => { setMode('register'); setError('') }}>FIRST TIME</button>
              <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => { setMode('login'); setError('') }}>SIGN IN</button>
            </div>
            <form className="account-form" onSubmit={submit}>
              <label htmlFor="account-phone">Phone number</label>
              <input
                id="account-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Include country code"
                required
              />
              <label htmlFor="account-pin">{mode === 'register' ? 'Create a 6-digit PIN' : '6-digit PIN'}</label>
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
                {isWorking ? 'PLEASE WAIT…' : mode === 'register' ? 'CREATE PROTOTYPE ACCOUNT' : 'SIGN IN & RESTORE'}
              </button>
            </form>
          </>
        )}

        <p className="account-error" aria-live="polite">{error}</p>
        <p className="account-privacy">Your phone number is used only to identify and restore your MediCycle progress. It is not used for marketing.</p>
      </section>
    </div>
  )
}
