import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { SignatureSession } from '../types/signatureSession'
import type { KyRecordWorkItem } from '../types/kyRecord'

type SignPageState = {
  errorMessage: string
  isClosed: boolean
  isLoading: boolean
  isMissing: boolean
  session: SignatureSession | null
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
    createdAt: null,
    expiresAt: null,
    closedAt: null,
    closedBy: typeof data.closedBy === 'string' ? data.closedBy : null,
  }
}

export function SignPage() {
  const { token } = useParams()
  const [state, setState] = useState<SignPageState>({
    errorMessage: '',
    isClosed: false,
    isLoading: false,
    isMissing: false,
    session: null,
  })

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

  if (state.isLoading) {
    return (
      <section className="page">
        <div className="status-panel">
          <h1>署名セッションを読み込んでいます</h1>
          <p>署名対象のKYを確認しています。</p>
        </div>
      </section>
    )
  }

  if (state.isMissing) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>署名セッションが見つかりません</h1>
          <p>URLが正しいか確認してください。</p>
        </div>
      </section>
    )
  }

  if (state.isClosed) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>署名受付は終了しています</h1>
          <p>この署名用URLは現在利用できません。</p>
        </div>
      </section>
    )
  }

  if (state.errorMessage) {
    return (
      <section className="page">
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
          この画面は、複数の作業員が連続して署名・健康チェックを行うための入口です。
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

      <section className="status-panel placeholder">
        <h2>署名・健康チェック</h2>
        <p>
          ここに署名・健康チェック機能を後で実装します。1人が登録した後に画面をリセットし、次の作業員が同じ端末で続けて入力できる設計にします。
        </p>
      </section>
    </section>
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
