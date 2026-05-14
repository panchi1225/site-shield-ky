import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCompany } from '../hooks/useCompany'
import type { Company } from '../types/company'

const companyTypeLabels: Record<Company['type'], string> = {
  prime: '元請',
  subcontractor: '下請',
}

export function CompanyWorkspacePage() {
  const { companyId, siteId } = useParams()
  const { appUser } = useAuth()
  const canViewCompany = appUser?.role === 'admin'
  const { company, errorMessage, isLoading, isMissing } = useCompany(
    companyId,
    canViewCompany,
  )

  if (!canViewCompany) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>この会社ページはまだ利用できません</h1>
          <p>
            今回は管理者だけが会社作業トップを閲覧できます。元請責任者と下請け責任者の表示制御は後で実装します。
          </p>
          <BackToSiteLink siteId={siteId} />
        </div>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="page">
        <div className="status-panel">
          <h1>会社情報を読み込んでいます</h1>
          <p>Firestoreのcompanies/{'{companyId}'} を確認しています。</p>
        </div>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>会社情報を読み込めませんでした</h1>
          <p>{errorMessage}</p>
          <BackToSiteLink siteId={siteId} />
        </div>
      </section>
    )
  }

  if (isMissing || !company) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>会社が見つかりません</h1>
          <p>指定された会社IDのドキュメントが存在しません。</p>
          <BackToSiteLink siteId={siteId} />
        </div>
      </section>
    )
  }

  if (company.siteId !== siteId) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>この現場の会社ではありません</h1>
          <p>URLの現場IDと会社に保存されているsiteIdが一致しません。</p>
          <BackToSiteLink siteId={siteId} />
        </div>
      </section>
    )
  }

  return (
    <section className="page company-workspace">
      <div className="page-header">
        <p className="eyebrow">会社作業トップ</p>
        <h1>{company.name || '会社名未設定'}</h1>
        <p className="lead">
          このページは、今後この会社のKY作成、署名確認、KY登録、PDF確認を行うための入口です。
        </p>
        <div className="actions">
          <BackToSiteLink siteId={siteId} />
        </div>
      </div>

      <div className="status-panel role-panel">
        <h2>会社情報</h2>
        <ul className="status-list">
          <li>
            <span className="status-label">会社ID</span>
            <span className="status-value token">{company.id}</span>
          </li>
          <li>
            <span className="status-label">会社種別</span>
            <span className="status-value">{companyTypeLabels[company.type]}</span>
          </li>
          <li>
            <span className="status-label">状態</span>
            <span className="status-value">
              {company.active ? '有効' : '無効'}
            </span>
          </li>
        </ul>
      </div>

      <div className="workspace-grid">
        <section className="status-panel placeholder">
          <h2>KY作成</h2>
          <p>この会社のKY作成機能は後で実装します。</p>
          <Link
            className="button-link primary"
            to={`/app/sites/${siteId}/companies/${company.id}/ky/new`}
          >
            KY作成
          </Link>
        </section>

        <section className="status-panel placeholder">
          <h2>署名確認・KY登録</h2>
          <p>この会社の署名確認・KY登録機能は後で実装します。</p>
        </section>

        <section className="status-panel placeholder">
          <h2>PDF確認</h2>
          <p>この会社のPDF確認機能は後で実装します。</p>
        </section>
      </div>
    </section>
  )
}

function BackToSiteLink({ siteId }: { siteId: string | undefined }) {
  return (
    <Link className="button-link" to={siteId ? `/app/sites/${siteId}` : '/app'}>
      現場作業トップへ戻る
    </Link>
  )
}
