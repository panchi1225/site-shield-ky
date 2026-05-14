import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useKyRecord } from '../hooks/useKyRecord'
import type { KyRecordStatus } from '../types/kyRecord'

const kyStatusLabels: Record<KyRecordStatus, string> = {
  draft: '下書き',
  signature_open: '署名受付中',
  registered: '登録済み',
  stamped: '押印済み',
}

export function KyDetailPage() {
  const { companyId, kyRecordId, siteId } = useParams()
  const { appUser } = useAuth()
  const canViewKyRecord = appUser?.role === 'admin'
  const { errorMessage, isLoading, isMissing, kyRecord } = useKyRecord(
    kyRecordId,
    canViewKyRecord,
  )

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
        <h1>{kyRecord.workName || '作業名未設定'}</h1>
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
        </div>
      </div>

      <section className="status-panel role-panel">
        <h2>KY情報</h2>
        <ul className="status-list">
          <DetailRow label="作業日" value={kyRecord.workDate} />
          <DetailRow label="作業名" value={kyRecord.workName} />
          <DetailRow label="status" value={kyStatusLabels[kyRecord.status]} />
          <DetailRow label="作成者名" value={kyRecord.createdByName} />
          <DetailRow label="作成日時" value={formatDateTime(kyRecord.createdAt)} />
          <DetailRow label="更新日時" value={formatDateTime(kyRecord.updatedAt)} />
        </ul>
      </section>

      <section className="status-panel">
        <h2>KY内容</h2>
        <div className="detail-grid">
          <DetailBlock label="作業内容" value={kyRecord.workDescription} />
          <DetailBlock label="危険要因" value={kyRecord.riskFactors} />
          <DetailBlock label="対策" value={kyRecord.countermeasures} />
          <DetailBlock label="本日の重点確認事項" value={kyRecord.keyPoints} />
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
