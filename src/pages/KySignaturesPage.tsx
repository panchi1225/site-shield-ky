import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useKyRecord } from '../hooks/useKyRecord'
import { useWorkerChecks } from '../hooks/useWorkerChecks'
import type { HealthChecks, WorkerCheck } from '../types/workerCheck'
import { getPrimaryWorkName } from '../utils/kyRecord'

export function KySignaturesPage() {
  const { companyId, kyRecordId, siteId } = useParams()
  const { appUser } = useAuth()
  const canViewSignatures = appUser?.role === 'admin'
  const { errorMessage, isLoading, isMissing, kyRecord } = useKyRecord(
    kyRecordId,
    canViewSignatures,
  )
  const isKyForUrl =
    kyRecord?.siteId === siteId && kyRecord?.companyId === companyId
  const canLoadWorkerChecks =
    canViewSignatures && isKyForUrl && Boolean(kyRecord?.signatureSessionId)
  const {
    errorMessage: workerChecksError,
    isLoading: isWorkerChecksLoading,
    workerChecks,
  } = useWorkerChecks(kyRecord?.signatureSessionId, canLoadWorkerChecks)

  if (!canViewSignatures) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>署名確認画面はまだ利用できません</h1>
          <p>
            今回は管理者だけが署名確認画面を閲覧できます。元請責任者と下請け責任者の表示制御は後で実装します。
          </p>
          <BackToKyLink
            companyId={companyId}
            kyRecordId={kyRecordId}
            siteId={siteId}
          />
        </div>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="page">
        <div className="status-panel">
          <h1>KY情報を読み込んでいます</h1>
          <p>署名確認対象のKYを確認しています。</p>
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
          <BackToKyLink
            companyId={companyId}
            kyRecordId={kyRecordId}
            siteId={siteId}
          />
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
          <BackToKyLink
            companyId={companyId}
            kyRecordId={kyRecordId}
            siteId={siteId}
          />
        </div>
      </section>
    )
  }

  if (!isKyForUrl) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>この会社のKYではありません</h1>
          <p>URLの現場ID・会社IDとKYに保存されている情報が一致しません。</p>
          <BackToKyLink
            companyId={companyId}
            kyRecordId={kyRecordId}
            siteId={siteId}
          />
        </div>
      </section>
    )
  }

  return (
    <section className="page">
      <div className="page-header">
        <p className="eyebrow">署名確認</p>
        <h1>{getPrimaryWorkName(kyRecord)}</h1>
        <p className="lead">
          作業員が署名画面で登録した健康チェックと手書き署名を確認します。
        </p>
        <div className="actions">
          <BackToKyLink
            companyId={companyId}
            kyRecordId={kyRecord.id}
            siteId={siteId}
          />
        </div>
      </div>

      <section className="status-panel role-panel">
        <h2>対象KY</h2>
        <ul className="status-list">
          <DetailRow label="作業日" value={kyRecord.workDate} />
          <DetailRow label="代表作業名" value={getPrimaryWorkName(kyRecord)} />
          <DetailRow
            label="署名セッションID"
            value={kyRecord.signatureSessionId ?? '未作成'}
          />
        </ul>
      </section>

      {!kyRecord.signatureSessionId ? (
        <section className="status-panel warning-panel">
          <h2>署名用URLがまだありません</h2>
          <p>KY詳細画面で署名用URLを作成してから確認してください。</p>
        </section>
      ) : isWorkerChecksLoading ? (
        <section className="status-panel">
          <h2>署名一覧を読み込んでいます</h2>
          <p>workerChecksを確認しています。</p>
        </section>
      ) : workerChecksError ? (
        <section className="status-panel warning-panel">
          <h2>署名一覧を読み込めませんでした</h2>
          <p>{workerChecksError}</p>
        </section>
      ) : workerChecks.length === 0 ? (
        <section className="status-panel">
          <h2>署名一覧</h2>
          <p>署名はまだ登録されていません。</p>
        </section>
      ) : (
        <section className="status-panel">
          <h2>署名一覧</h2>
          <div className="signature-review-list">
            {workerChecks.map((workerCheck, index) => (
              <SignatureReviewCard
                index={index}
                key={workerCheck.id}
                workerCheck={workerCheck}
              />
            ))}
          </div>
        </section>
      )}
    </section>
  )
}

function SignatureReviewCard({
  index,
  workerCheck,
}: {
  index: number
  workerCheck: WorkerCheck
}) {
  const healthOk = allHealthOk(workerCheck.healthChecks)
  const signatureSvg = getDisplayableSignatureSvg(workerCheck)

  return (
    <article className="signature-review-card">
      <div className="section-heading">
        <h3>署名 {index + 1}件目</h3>
        <span className={`status-badge ${healthOk ? 'active' : 'warning'}`}>
          {healthOk ? '良好' : '要確認'}
        </span>
      </div>
      <ul className="status-list">
        <DetailRow label="健康状態" value={healthOk ? '良好' : '要確認'} />
        <DetailRow label="体調メモ" value={workerCheck.healthNote || 'なし'} />
        <DetailRow
          label="登録日時"
          value={formatDateTime(workerCheck.createdAt)}
        />
      </ul>
      <div className="signature-preview">
        <h4>手書き署名</h4>
        {signatureSvg ? (
          <div
            className="signature-svg-box"
            dangerouslySetInnerHTML={{ __html: signatureSvg }}
          />
        ) : (
          <p>署名データを表示できません。</p>
        )}
      </div>
    </article>
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

function allHealthOk(healthChecks: HealthChecks) {
  return (
    healthChecks.conditionOk &&
    healthChecks.sleepOk &&
    healthChecks.alcoholOk &&
    healthChecks.medicationOk
  )
}

function getDisplayableSignatureSvg(workerCheck: WorkerCheck) {
  const signatureData = workerCheck.signatureData.trim()

  if (
    workerCheck.signatureFormat !== 'svg' ||
    !signatureData.startsWith('<svg') ||
    !signatureData.includes('</svg>') ||
    signatureData.toLowerCase().includes('<script') ||
    signatureData.toLowerCase().includes('onload=')
  ) {
    return ''
  }

  return signatureData
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

function BackToKyLink({
  companyId,
  kyRecordId,
  siteId,
}: {
  companyId: string | undefined
  kyRecordId: string | undefined
  siteId: string | undefined
}) {
  return (
    <Link
      className="button-link"
      to={
        siteId && companyId && kyRecordId
          ? `/app/sites/${siteId}/companies/${companyId}/ky/${kyRecordId}`
          : '/app'
      }
    >
      KY詳細へ戻る
    </Link>
  )
}
