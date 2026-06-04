import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { useAuth } from '../auth/AuthContext'
import { useCompany } from '../hooks/useCompany'
import { useKyRecord } from '../hooks/useKyRecord'
import { useSite } from '../hooks/useSite'
import { db } from '../lib/firebase'
import type {
  KyRecordStatus,
  KyRecordWorkItem,
  PrimeContractorStamp,
} from '../types/kyRecord'
import type { PrimeContractorStampOption } from '../types/site'
import {
  getPossibilityLabel,
  getPrimaryWorkName,
  getSeverityLabel,
  riskLevelDescriptions,
} from '../utils/kyRecord'
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
  const [isStamping, setIsStamping] = useState(false)
  const [selectedStampOptionId, setSelectedStampOptionId] = useState('')
  const [isCreatingSignatureSession, setIsCreatingSignatureSession] =
    useState(false)
  const { errorMessage, isLoading, isMissing, kyRecord } = useKyRecord(
    kyRecordId,
    canViewKyRecord,
    reloadKey,
  )
  const { site } = useSite(siteId, canViewKyRecord)
  const { company } = useCompany(companyId, canViewKyRecord)
  const primeContractorStamps = kyRecord?.primeContractorStamps ?? []
  const availableStampOptions = useMemo(() => {
    const options = site?.primeContractorStampOptions ?? []
    const usedIds = new Set(primeContractorStamps.map((stamp) => stamp.id))
    const usedNames = new Set(
      primeContractorStamps.map((stamp) => stamp.displayName),
    )

    return options.filter((option) => {
      return !usedIds.has(option.id) && !usedNames.has(option.displayName)
    })
  }, [primeContractorStamps, site?.primeContractorStampOptions])

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

  async function handleStampKy(selectedOption: PrimeContractorStampOption) {
    if (!user || !appUser || !kyRecord) {
      setActionError('元請確認に必要なログイン情報が不足しています。')
      return
    }

    if (kyRecord.status !== 'registered' && kyRecord.status !== 'stamped') {
      setActionError('登録済みまたは元請確認済みのKYだけ元請確認できます。')
      return
    }

    if (primeContractorStamps.length >= 3) {
      setActionError('元請確認印は最大3件までです。')
      return
    }

    if (
      primeContractorStamps.some(
        (stamp) =>
          stamp.id === selectedOption.id ||
          stamp.displayName === selectedOption.displayName,
      )
    ) {
      setActionError('同じ担当者の確認印は追加できません。')
      return
    }

    const shouldStamp = window.confirm(
      `${selectedOption.displayName} の確認印を追加します。よろしいですか？`,
    )

    if (!shouldStamp) {
      return
    }

    setActionError('')
    setIsStamping(true)

    try {
      const newStamp: PrimeContractorStamp = {
        id: selectedOption.id,
        stampText: '確認',
        displayName: selectedOption.displayName,
        stampedByUid: user.uid,
        stampedAtText: formatJapaneseDateText(new Date()),
      }
      const updatedStamps = [...primeContractorStamps, newStamp].slice(0, 3)
      const baseUpdate = {
        primeContractorStamps: updatedStamps,
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      }

      await updateDoc(
        doc(db, 'kyRecords', kyRecord.id),
        kyRecord.status === 'registered'
          ? {
              ...baseUpdate,
              status: 'stamped',
              stampedBy: user.uid,
              stampedByName: selectedOption.displayName,
              stampedAt: serverTimestamp(),
              stampText: '確認',
            }
          : baseUpdate,
      )

      setSelectedStampOptionId('')
      setReloadKey((current) => current + 1)
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : '元請確認の保存に失敗しました。',
      )
    } finally {
      setIsStamping(false)
    }
  }

  if (!canViewKyRecord) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>このKY詳細はまだ利用できません</h1>
          <p>今回は管理者だけがKY詳細を閲覧できます。</p>
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
          Excel様式に合わせたKY内容を表示します。登録済みKYは元請確認できます。
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
          <Link
            className="button-link"
            to={`/app/sites/${siteId}/companies/${companyId}/ky/${kyRecord.id}/print`}
          >
            PDFプレビュー
          </Link>
          {kyRecord.status === 'stamped' ? (
            <span className="status-badge active">元請確認済み</span>
          ) : null}
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

      {kyRecord.status === 'registered' || kyRecord.status === 'stamped' ? (
        <PrimeContractorStampPanel
          availableOptions={availableStampOptions}
          isStamping={isStamping}
          onSelectOption={setSelectedStampOptionId}
          onStamp={handleStampKy}
          selectedOptionId={selectedStampOptionId}
          stamps={primeContractorStamps}
          status={kyRecord.status}
        />
      ) : null}

      <section className="status-panel role-panel">
        <h2>基本情報</h2>
        <ul className="status-list">
          <DetailRow label="工事名" value={site?.name ?? ''} />
          <DetailRow label="会社名" value={company?.name ?? ''} />
          <DetailRow label="実施日" value={kyRecord.workDate} />
          <DetailRow label="天候" value={kyRecord.weather} />
          <DetailRow label="status" value={kyStatusLabels[kyRecord.status]} />
          <DetailRow label="作成者名" value={kyRecord.createdByName} />
          <DetailRow label="作成日時" value={formatDateTime(kyRecord.createdAt)} />
          <DetailRow label="更新日時" value={formatDateTime(kyRecord.updatedAt)} />
          <DetailRow label="登録日時" value={formatDateTime(kyRecord.registeredAt)} />
          <DetailRow
            label="元請確認者"
            value={
              primeContractorStamps
                .map((stamp) => stamp.displayName)
                .join(' / ') || kyRecord.stampedByName
            }
          />
          <DetailRow
            label="元請確認日"
            value={
              primeContractorStamps
                .map((stamp) => stamp.stampedAtText)
                .filter(Boolean)
                .join(' / ') || formatDateTime(kyRecord.stampedAt)
            }
          />
        </ul>
      </section>

      <section className="status-panel">
        <h2>リスクアセスメントKY</h2>
        <div className="work-item-detail-list">
          {kyRecord.workItems.map((workItem) => (
            <WorkItemDetail key={workItem.id} workItem={workItem} />
          ))}
        </div>
      </section>

      <RiskCriteriaPanel />

      <section className="status-panel placeholder">
        <h2>後で実装する機能</h2>
        <p>公開閲覧、現場掲示用QR、発注者向け閲覧画面は後で実装します。</p>
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

function PrimeContractorStampPanel({
  availableOptions,
  isStamping,
  onSelectOption,
  onStamp,
  selectedOptionId,
  stamps,
  status,
}: {
  availableOptions: PrimeContractorStampOption[]
  isStamping: boolean
  onSelectOption: (optionId: string) => void
  onStamp: (option: PrimeContractorStampOption) => void
  selectedOptionId: string
  stamps: PrimeContractorStamp[]
  status: KyRecordStatus
}) {
  const selectedOption =
    availableOptions.find((option) => option.id === selectedOptionId) ?? null
  const canAddStamp = stamps.length < 3

  return (
    <section className="status-panel prime-contractor-stamp-panel">
      <h2>元請確認欄</h2>
      {stamps.length > 0 ? (
        <ul className="stamp-summary-list">
          {stamps.map((stamp, index) => (
            <li key={`${stamp.id}-${index}`}>
              <span>{index + 1}件目</span>
              <strong>{stamp.displayName}</strong>
              <time>{stamp.stampedAtText}</time>
            </li>
          ))}
        </ul>
      ) : (
        <p>元請確認印はまだありません。</p>
      )}

      {canAddStamp ? (
        <div className="stamp-control-row">
          <label>
            担当者印
            <select
              onChange={(event) => onSelectOption(event.target.value)}
              value={selectedOptionId}
            >
              <option value="">選択してください</option>
              {availableOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.displayName}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button-link primary"
            disabled={!selectedOption || isStamping}
            onClick={() => {
              if (selectedOption) {
                onStamp(selectedOption)
              }
            }}
            type="button"
          >
            {isStamping
              ? '元請確認中...'
              : status === 'registered'
                ? '元請確認する'
                : '元請確認印を追加'}
          </button>
        </div>
      ) : (
        <p>元請確認印は3件登録済みです。</p>
      )}

      {canAddStamp && availableOptions.length === 0 ? (
        <p className="form-help">
          この現場に追加できる担当者印候補がありません。Firebase Consoleで
          sites に primeContractorStampOptions を登録してください。
        </p>
      ) : null}
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

function WorkItemDetail({ workItem }: { workItem: KyRecordWorkItem }) {
  return (
    <article className="work-item-detail">
      <h3>No. {workItem.order}</h3>
      <div className="detail-grid">
        <DetailBlock label="作業内容" value={workItem.workDescription} />
        <DetailBlock label="危険ポイント" value={workItem.riskPoint} />
        <DetailBlock label="危険ポイントの対策" value={workItem.countermeasures} />
      </div>
      <div className="rating-summary-grid">
        <DetailRow
          label="可能性"
          value={`${workItem.possibility}: ${getPossibilityLabel(
            workItem.possibility,
          )}`}
        />
        <DetailRow
          label="重大性"
          value={`${workItem.severity}: ${getSeverityLabel(workItem.severity)}`}
        />
        <DetailRow label="評価" value={String(workItem.riskScore)} />
        <DetailRow
          label="危険度"
          value={`${workItem.riskLevel}: ${
            riskLevelDescriptions[workItem.riskLevel]
          }`}
        />
      </div>
    </article>
  )
}

function RiskCriteriaPanel() {
  return (
    <section className="status-panel">
      <h2>評価基準表</h2>
      <div className="criteria-grid">
        <div>
          <h3>可能性</h3>
          <p>1: {getPossibilityLabel(1)}</p>
          <p>2: {getPossibilityLabel(2)}</p>
          <p>3: {getPossibilityLabel(3)}</p>
        </div>
        <div>
          <h3>重大性</h3>
          <p>1: {getSeverityLabel(1)}</p>
          <p>2: {getSeverityLabel(2)}</p>
          <p>3: {getSeverityLabel(3)}</p>
        </div>
        <div>
          <h3>危険度</h3>
          <p>I: {riskLevelDescriptions.I}</p>
          <p>II: {riskLevelDescriptions.II}</p>
          <p>III: {riskLevelDescriptions.III}</p>
          <p>IV: {riskLevelDescriptions.IV}</p>
        </div>
      </div>
    </section>
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
          <p>このKYの署名用URLです。登録後も追加署名を受け付けできます。</p>
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

function formatJapaneseDateText(value: Date) {
  return `${value.getFullYear()}年 ${value.getMonth() + 1}月 ${value.getDate()}日`
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
