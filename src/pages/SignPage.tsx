import type { FormEvent, PointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { signInAnonymously } from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { KyRecordWorkItem } from '../types/kyRecord'
import type { SignatureSession } from '../types/signatureSession'
import type { HealthChecks, SubmittedByAuthType } from '../types/workerCheck'
import {
  createSignatureSvg,
  hasSignature,
  type SignatureStroke,
} from '../utils/signatureSvg'

const signatureWidth = 640
const signatureHeight = 220

const initialHealthChecks: HealthChecks = {
  conditionOk: true,
  sleepOk: true,
  alcoholOk: true,
  medicationOk: true,
}

type SignPageState = {
  errorMessage: string
  isClosed: boolean
  isLoading: boolean
  isMissing: boolean
  session: SignatureSession | null
}

function toDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : null
}

function toWorkItem(value: unknown, index: number): KyRecordWorkItem | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const data = value as Record<string, unknown>
  const order = typeof data.order === 'number' ? data.order : index + 1

  return {
    id: typeof data.id === 'string' ? data.id : `item-${order}`,
    order,
    workName: typeof data.workName === 'string' ? data.workName : '',
    workDescription:
      typeof data.workDescription === 'string' ? data.workDescription : '',
    riskFactors: typeof data.riskFactors === 'string' ? data.riskFactors : '',
    countermeasures:
      typeof data.countermeasures === 'string' ? data.countermeasures : '',
    keyPoints: typeof data.keyPoints === 'string' ? data.keyPoints : '',
  }
}

function toSignatureSession(
  id: string,
  data: Record<string, unknown>,
): SignatureSession {
  const workItems = Array.isArray(data.workItems)
    ? data.workItems
        .map((item, index) => toWorkItem(item, index))
        .filter((item): item is KyRecordWorkItem => item !== null)
        .sort((a, b) => a.order - b.order)
    : []

  return {
    id,
    siteId: typeof data.siteId === 'string' ? data.siteId : '',
    siteName: typeof data.siteName === 'string' ? data.siteName : '',
    companyId: typeof data.companyId === 'string' ? data.companyId : '',
    companyName: typeof data.companyName === 'string' ? data.companyName : '',
    kyRecordId: typeof data.kyRecordId === 'string' ? data.kyRecordId : '',
    workDate: typeof data.workDate === 'string' ? data.workDate : '',
    workItems,
    active: data.active === true,
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
    createdAt: toDate(data.createdAt),
    expiresAt: toDate(data.expiresAt),
    closedAt: toDate(data.closedAt),
    closedBy: typeof data.closedBy === 'string' ? data.closedBy : null,
  }
}

function getAuthType(): SubmittedByAuthType {
  const currentUser = auth.currentUser

  if (!currentUser) {
    return 'unknown'
  }

  if (currentUser.isAnonymous) {
    return 'anonymous'
  }

  return currentUser.providerData.some(
    (provider) => provider.providerId === 'password',
  )
    ? 'password'
    : 'unknown'
}

export function SignPage() {
  const { token } = useParams()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const strokesRef = useRef<SignatureStroke[]>([])
  const isDrawingRef = useRef(false)
  const [state, setState] = useState<SignPageState>({
    errorMessage: '',
    isClosed: false,
    isLoading: false,
    isMissing: false,
    session: null,
  })
  const [healthChecks, setHealthChecks] =
    useState<HealthChecks>(initialHealthChecks)
  const [healthNote, setHealthNote] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localSubmitCount, setLocalSubmitCount] = useState(0)
  const [, setSignatureRevision] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadSignatureSession(signatureToken: string) {
      setState({
        errorMessage: '',
        isClosed: false,
        isLoading: true,
        isMissing: false,
        session: null,
      })

      try {
        const snapshot = await getDoc(
          doc(db, 'signatureSessions', signatureToken),
        )

        if (!isActive) {
          return
        }

        if (!snapshot.exists()) {
          setState({
            errorMessage: '',
            isClosed: false,
            isLoading: false,
            isMissing: true,
            session: null,
          })
          return
        }

        const session = toSignatureSession(snapshot.id, snapshot.data())

        if (!session.active) {
          setState({
            errorMessage: '',
            isClosed: true,
            isLoading: false,
            isMissing: false,
            session: null,
          })
          return
        }

        setState({
          errorMessage: '',
          isClosed: false,
          isLoading: false,
          isMissing: false,
          session,
        })
      } catch (error) {
        if (!isActive) {
          return
        }

        setState({
          errorMessage:
            error instanceof Error
              ? error.message
              : '署名セッションを読み込めませんでした。',
          isClosed: false,
          isLoading: false,
          isMissing: false,
          session: null,
        })
      }
    }

    if (!token) {
      setState({
        errorMessage: '署名用トークンが指定されていません。',
        isClosed: false,
        isLoading: false,
        isMissing: false,
        session: null,
      })
      return
    }

    void loadSignatureSession(token)

    return () => {
      isActive = false
    }
  }, [token])

  function getCanvasPoint(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current

    if (!canvas) {
      return { x: 0, y: 0 }
    }

    const rect = canvas.getBoundingClientRect()

    return {
      x: ((event.clientX - rect.left) / rect.width) * signatureWidth,
      y: ((event.clientY - rect.top) / rect.height) * signatureHeight,
    }
  }

  function getCanvasContext() {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (!context) {
      return null
    }

    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = 3
    context.strokeStyle = '#111827'

    return context
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const context = getCanvasContext()

    if (!canvas || !context) {
      return
    }

    canvas.setPointerCapture(event.pointerId)
    const point = getCanvasPoint(event)
    strokesRef.current = [...strokesRef.current, [point]]
    isDrawingRef.current = true

    context.beginPath()
    context.moveTo(point.x, point.y)
    setSignatureRevision((current) => current + 1)
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) {
      return
    }

    const context = getCanvasContext()
    const currentStroke = strokesRef.current[strokesRef.current.length - 1]

    if (!context || !currentStroke) {
      return
    }

    const point = getCanvasPoint(event)
    currentStroke.push(point)
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    isDrawingRef.current = false
    canvas?.releasePointerCapture(event.pointerId)
  }

  function clearSignature() {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    context?.clearRect(0, 0, signatureWidth, signatureHeight)
    strokesRef.current = []
    setSignatureRevision((current) => current + 1)
  }

  function resetForm() {
    setHealthChecks(initialHealthChecks)
    setHealthNote('')
    clearSignature()
  }

  function updateHealthCheck(field: keyof HealthChecks, value: boolean) {
    setHealthChecks((current) => ({ ...current, [field]: value }))
  }

  async function getSubmitter() {
    if (auth.currentUser) {
      return auth.currentUser
    }

    const credential = await signInAnonymously(auth)
    return credential.user
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token || !state.session) {
      setSubmitError('署名セッション情報が不足しています。')
      return
    }

    if (!hasSignature(strokesRef.current)) {
      setSubmitError('署名を入力してください。')
      return
    }

    setSubmitError('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      const submitter = await getSubmitter()
      const submittedByAuthType = getAuthType()
      const signatureData = createSignatureSvg(
        strokesRef.current,
        signatureWidth,
        signatureHeight,
      )

      await addDoc(collection(db, 'signatureSessions', token, 'workerChecks'), {
        healthChecks,
        healthNote: healthNote.trim(),
        signatureFormat: 'svg',
        signatureData,
        submittedByUid: submitter.uid,
        submittedByAuthType,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      setSuccessMessage('登録しました。次の作業員を入力してください。')
      setLocalSubmitCount((current) => current + 1)
      resetForm()
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : '署名・健康チェックの登録に失敗しました。',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (state.isLoading) {
    return (
      <section className="page sign-page">
        <div className="status-panel">
          <h1>署名セッションを読み込んでいます</h1>
          <p>署名対象のKYを確認しています。</p>
        </div>
      </section>
    )
  }

  if (state.isMissing) {
    return (
      <section className="page sign-page">
        <div className="status-panel warning-panel">
          <h1>署名セッションが見つかりません</h1>
          <p>URLが正しいか確認してください。</p>
        </div>
      </section>
    )
  }

  if (state.isClosed) {
    return (
      <section className="page sign-page">
        <div className="status-panel warning-panel">
          <h1>署名受付は終了しています</h1>
          <p>この署名用URLは現在利用できません。</p>
        </div>
      </section>
    )
  }

  if (state.errorMessage) {
    return (
      <section className="page sign-page">
        <div className="status-panel warning-panel">
          <h1>署名セッションを読み込めませんでした</h1>
          <p>{state.errorMessage}</p>
        </div>
      </section>
    )
  }

  if (!state.session) {
    return null
  }

  return (
    <section className="page sign-page">
      <div className="page-header">
        <p className="eyebrow">作業員署名</p>
        <h1>{state.session.companyName || '会社名未設定'}</h1>
        <p className="lead">
          健康状態を確認し、枠内に署名して登録してください。続けて別の作業員も同じ端末で登録できます。
        </p>
      </div>

      <section className="status-panel role-panel">
        <h2>署名対象KY</h2>
        <ul className="status-list">
          <li>
            <span className="status-label">現場名</span>
            <span className="status-value">{state.session.siteName}</span>
          </li>
          <li>
            <span className="status-label">会社名</span>
            <span className="status-value">{state.session.companyName}</span>
          </li>
          <li>
            <span className="status-label">作業日</span>
            <span className="status-value">{state.session.workDate}</span>
          </li>
        </ul>
      </section>

      <section className="status-panel">
        <h2>作業項目</h2>
        <div className="work-item-detail-list">
          {state.session.workItems.map((workItem) => (
            <article className="work-item-detail" key={workItem.id}>
              <h3>
                作業項目 {workItem.order}: {workItem.workName || '作業名未設定'}
              </h3>
              <div className="detail-grid">
                <DetailBlock label="作業内容" value={workItem.workDescription} />
                <DetailBlock label="危険要因" value={workItem.riskFactors} />
                <DetailBlock label="対策" value={workItem.countermeasures} />
                <DetailBlock
                  label="本日の重点確認事項"
                  value={workItem.keyPoints}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="status-panel">
        <div className="section-heading">
          <div>
            <h2>署名・健康チェック</h2>
            <p className="local-submit-count">
              この端末での登録数：{localSubmitCount}件
            </p>
          </div>
        </div>

        <form className="data-form compact-form" onSubmit={handleSubmit}>
          <fieldset className="check-fieldset">
            <legend>健康チェック</legend>
            <HealthCheckLabel
              checked={healthChecks.conditionOk}
              label="体調は良好です"
              onChange={(value) => updateHealthCheck('conditionOk', value)}
            />
            <HealthCheckLabel
              checked={healthChecks.sleepOk}
              label="睡眠は十分です"
              onChange={(value) => updateHealthCheck('sleepOk', value)}
            />
            <HealthCheckLabel
              checked={healthChecks.alcoholOk}
              label="飲酒の影響はありません"
              onChange={(value) => updateHealthCheck('alcoholOk', value)}
            />
            <HealthCheckLabel
              checked={healthChecks.medicationOk}
              label="作業に支障のある薬の服用はありません"
              onChange={(value) => updateHealthCheck('medicationOk', value)}
            />
          </fieldset>

          <label>
            <span>体調メモ</span>
            <textarea
              onChange={(event) => setHealthNote(event.target.value)}
              rows={3}
              value={healthNote}
            />
          </label>

          <div className="signature-pad-field">
            <div className="work-item-header">
              <h3>署名</h3>
              <button className="button-link" onClick={clearSignature} type="button">
                クリア
              </button>
            </div>
            <canvas
              className="signature-canvas"
              height={signatureHeight}
              onPointerCancel={handlePointerUp}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              ref={canvasRef}
              width={signatureWidth}
            />
            <p>
              {hasSignature(strokesRef.current)
                ? '署名が入力されています。'
                : '枠内に指またはマウスで署名してください。'}
            </p>
          </div>

          {successMessage ? (
            <p className="success-message" role="status">
              {successMessage}
            </p>
          ) : null}

          {submitError ? (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          ) : null}

          <button className="button-link primary" disabled={isSubmitting}>
            {isSubmitting ? '登録中...' : '署名・健康チェックを登録'}
          </button>
        </form>
      </section>
    </section>
  )
}

function HealthCheckLabel({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (value: boolean) => void
}) {
  return (
    <label className="check-label">
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  )
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-block">
      <h3>{label}</h3>
      <p>{value || '未設定'}</p>
    </div>
  )
}
