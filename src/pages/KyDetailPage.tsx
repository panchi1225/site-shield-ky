import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { useAuth } from '../auth/AuthContext'
import { useKyRecord } from '../hooks/useKyRecord'
import { db } from '../lib/firebase'
import type { KyRecordStatus, KyRecordWorkItem } from '../types/kyRecord'
import { getPrimaryWorkName } from '../utils/kyRecord'
import {
  createSignatureToken,
  createSignatureUrl,
} from '../utils/signatureToken'

const kyStatusLabels: Record<KyRecordStatus, string> = {
  draft: '下書き',
  signature_open: '署名受付中',
  registered: '登録済み',
  stamped: '押印済み',
}

export function KyDetailPage() {
  const { companyId, kyRecordId, siteId } = useParams()
  const { appUser, user } = useAuth()
  const canViewKyRecord = appUser?.role === 'admin'
  const [reloadKey, setReloadKey] = useState(0)
  const [actionError, setActionError] = useState('')
  const [isOpeningSignature, setIsOpeningSignature] = useState(false)
  const [isCreatingSignatureSession, setIsCreatingSignatureSession] =
    useState(false)
  const { errorMessage, isLoading, isMissing, kyRecord } = useKyRecord(
    kyRecordId,
    canViewKyRecord,
    reloadKey,
  )

  async function handleOpenSignature() {
    if (!user || !kyRecordId || !kyRecord) {
      setActionError('署名受付開始に必要な情報が不足しています。')
      return
    }

    if (kyRecord.status !== 'draft') {
      setActionError('下書き状態のKYだけ署名受付を開始できます。')
      return
    }

    const shouldOpen = window.confirm(
      'このKYの署名受付を開始します。開始後は下書き編集できません。よろしいですか？',
    )

    if (!shouldOpen) {
      return
    }

    setActionError('')
    setIsOpeningSignature(true)

    try {
      await updateDoc(doc(db, 'kyRecords', kyRecordId), {
        status: 'signature_open',
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
        signatureOpenedBy: user.uid,
        signatureOpenAt: serverTimestamp(),
      })
      setReloadKey((current) => current + 1)
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : '署名受付の開始に失敗しました。',
      )
    } finally {
      setIsOpeningSignature(false)
    }
  }

  async function handleCreateSignatureSession() {
    if (!user || !kyRecordId || !kyRecord) {
      setActionError('署名用URL作成に必要な情報が不足しています。')
      return
    }

    if (kyRecord.status !== 'signature_open') {
      setActionError('署名受付中のKYだけ署名用URLを作成できます。')
      return
    }

    if (kyRecord.signatureSessionId) {
      return
    }

    setActionError('')
    setIsCreatingSignatureSession(true)

    const signatureToken = createSignatureToken()

    try {
      const batch = writeBatch(db)
      const signatureSessionRef = doc(db, 'signatureSessions', signatureToken)
      const kyRecordRef = doc(db, 'kyRecords', kyRecordId)
      const siteSnapshot = await getDoc(doc(db, 'sites', kyRecord.siteId))
      const companySnapshot = await getDoc(
        doc(db, 'companies', kyRecord.companyId),
      )

      if (!siteSnapshot.exists() || !companySnapshot.exists()) {
        setActionError('署名用URL作成に必要な現場または会社が見つかりません。')
        return
      }

      const siteData = siteSnapshot.data()
      const companyData = companySnapshot.data()

      batch.set(signatureSessionRef, {
        siteId: kyRecord.siteId,
        siteName:
          typeof siteData.name === 'string' ? siteData.name : '現場名未設定',
        companyId: kyRecord.companyId,
        companyName:
          typeof companyData.name === 'string'
            ? companyData.name
            : '会社名未設定',
        kyRecordId: kyRecord.id,
        workDate: kyRecord.workDate,
        workItems: kyRecord.workItems,
        active: true,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        expiresAt: null,
        closedAt: null,
        closedBy: null,
      })

      batch.update(kyRecordRef, {
        signatureSessionId: signatureToken,
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      })

      await batch.commit()
      setReloadKey((current) => current + 1)
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : '署名用URLの作成に失敗しました。',
      )
    } finally {
      setIsCreatingSignatureSession(false)
    }
  }

  if (!canViewKyRecord) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>このKY詳細はまだ利用できません</h1>
          <p>
            今回は管理者だけがKY詳細を閲覧できます。元請責任者と下請け責任者の表示制御は後で実装します。
          </p>
          <BackToCompanyLink companyId={companyId} siteId={siteId} />
        </div>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="page">
        <div className="status-panel">
          <h1>KY情報を読み込んでいます</h1>
          <p>FirestoreのkyRecords/{'{kyRecordId}'} を確認しています。</p>
        </div>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>KY情報を読み込めませんでした</h1>
          <p>{errorMessage}</p>
          <BackToCompanyLink companyId={companyId} siteId={siteId} />
        </div>
      </section>
    )
  }

  if (isMissing || !kyRecord) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>KYが見つかりません</h1>
          <p>指定されたKY IDのドキュメントが存在しません。</p>
          <BackToCompanyLink companyId={companyId} siteId={siteId} />
        </div>
      </section>
    )
  }

  if (kyRecord.siteId !== siteId || kyRecord.companyId !== companyId) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>この会社のKYではありません</h1>
          <p>URLの現場ID・会社IDとKYに保存されている情報が一致しません。</p>
          <BackToCompanyLink companyId={companyId} siteId={siteId} />
        </div>
      </section>
    )
  }

  return (
    <section className="page ky-detail-page">
      <div className="page-header">
        <p className="eyebrow">KY詳細</p>
        <h1>{getPrimaryWorkName(kyRecord)}</h1>
        <p className="lead">
          保存済みのKY下書き内容を表示します。編集・署名受付・PDF出力は後で実装します。
        </p>
        <div className="actions">
          <BackToCompanyLink companyId={companyId} siteId={siteId} />
          {kyRecord.status === 'draft' ? (
            <Link
              className="button-link primary"
              to={`/app/sites/${siteId}/companies/${companyId}/ky/${kyRecord.id}/edit`}
            >
              編集
            </Link>
          ) : null}
          {kyRecord.status === 'draft' ? (
            <button
              className="button-link primary"
              disabled={isOpeningSignature}
              onClick={handleOpenSignature}
              type="button"
            >
              {isOpeningSignature ? '開始中...' : '署名受付を開始する'}
            </button>
          ) : null}
          <Link
            className="button-link"
            to={`/app/sites/${siteId}/companies/${companyId}/ky/${kyRecord.id}/signatures`}
          >
            署名確認
          </Link>
        </div>
      </div>

      {actionError ? (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {kyRecord.status !== 'draft' ? (
        <SignatureSessionPanel
          canCreate={kyRecord.status === 'signature_open'}
          isCreating={isCreatingSignatureSession}
          onCreate={handleCreateSignatureSession}
          returnTo={`/app/sites/${siteId}/companies/${companyId}/ky/${kyRecord.id}`}
          signatureSessionId={kyRecord.signatureSessionId}
        />
      ) : null}

      <section className="status-panel role-panel">
        <h2>KY情報</h2>
        <ul className="status-list">
          <DetailRow label="作業日" value={kyRecord.workDate} />
          <DetailRow label="代表作業名" value={getPrimaryWorkName(kyRecord)} />
          <DetailRow label="status" value={kyStatusLabels[kyRecord.status]} />
          <DetailRow label="作成者名" value={kyRecord.createdByName} />
          <DetailRow label="作成日時" value={formatDateTime(kyRecord.createdAt)} />
          <DetailRow label="更新日時" value={formatDateTime(kyRecord.updatedAt)} />
        </ul>
      </section>

      <section className="status-panel">
        <h2>KY内容</h2>
        <div className="work-item-detail-list">
          {kyRecord.workItems.map((workItem) => (
            <WorkItemDetail key={workItem.id} workItem={workItem} />
          ))}
        </div>
      </section>

      <section className="status-panel placeholder">
        <h2>今後実装する機能</h2>
        <p>編集・署名受付・PDF出力は後で実装します。</p>
      </section>
    </section>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <li>
      <span className="status-label">{label}</span>
      <span className="status-value">{value || '未設定'}</span>
    </li>
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

function WorkItemDetail({ workItem }: { workItem: KyRecordWorkItem }) {
  return (
    <article className="work-item-detail">
      <h3>
        作業項目 {workItem.order}: {workItem.workName || '作業名未設定'}
      </h3>
      <div className="detail-grid">
        <DetailBlock label="作業内容" value={workItem.workDescription} />
        <DetailBlock label="危険要因" value={workItem.riskFactors} />
        <DetailBlock label="対策" value={workItem.countermeasures} />
        <DetailBlock label="本日の重点確認事項" value={workItem.keyPoints} />
      </div>
    </article>
  )
}

function SignatureSessionPanel({
  canCreate,
  isCreating,
  onCreate,
  returnTo,
  signatureSessionId,
}: {
  canCreate: boolean
  isCreating: boolean
  onCreate: () => void
  returnTo: string
  signatureSessionId: string | null
}) {
  const signatureUrl = signatureSessionId
    ? createSignatureUrl(signatureSessionId)
    : ''
  const inAppSignaturePath = signatureSessionId
    ? `/sign/${signatureSessionId}?returnTo=${encodeURIComponent(returnTo)}`
    : ''

  return (
    <section className="status-panel signature-panel">
      <h2>署名用URL</h2>
      {signatureSessionId ? (
        <div className="signature-url-box">
          <p>このKYの署名用URLです。QRコード画像は後で実装します。</p>
          <a className="text-link signature-url" href={signatureUrl}>
            {signatureUrl}
          </a>
          <Link className="button-link primary" to={inAppSignaturePath}>
            この端末で署名画面を開く
          </Link>
        </div>
      ) : (
        <>
          <p>
            {canCreate
              ? '署名用URLはまだ作成されていません。'
              : '署名用URLがありません。登録済み以降のKYでは新規作成しません。'}
          </p>
          {canCreate ? (
            <button
              className="button-link primary"
              disabled={isCreating}
              onClick={onCreate}
              type="button"
            >
              {isCreating ? '作成中...' : '署名用URLを作成'}
            </button>
          ) : null}
        </>
      )}
    </section>
  )
}

function formatDateTime(value: Date | null) {
  if (!value) {
    return '未設定'
  }

  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}

function BackToCompanyLink({
  companyId,
  siteId,
}: {
  companyId: string | undefined
  siteId: string | undefined
}) {
  return (
    <Link
      className="button-link"
      to={
        siteId && companyId
          ? `/app/sites/${siteId}/companies/${companyId}`
          : '/app'
      }
    >
      会社作業トップへ戻る
    </Link>
  )
}
