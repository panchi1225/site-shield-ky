import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useSite } from '../hooks/useSite'

export function SiteWorkspacePage() {
  const { siteId } = useParams()
  const { appUser } = useAuth()
  const canViewSite = appUser?.role === 'admin'
  const { errorMessage, isLoading, isMissing, site } = useSite(
    siteId,
    canViewSite,
  )

  if (!canViewSite) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>この現場ページはまだ利用できません</h1>
          <p>
            今回は管理者だけが現場ページを閲覧できます。元請責任者と下請け責任者の表示制御は後で実装します。
          </p>
          <Link className="button-link" to="/app">
            現場選択へ戻る
          </Link>
        </div>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="page">
        <div className="status-panel">
          <h1>現場情報を読み込んでいます</h1>
          <p>Firestoreのsites/{'{siteId}'} を確認しています。</p>
        </div>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>現場情報を読み込めませんでした</h1>
          <p>{errorMessage}</p>
          <Link className="button-link" to="/app">
            現場選択へ戻る
          </Link>
        </div>
      </section>
    )
  }

  if (isMissing || !site) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>現場が見つかりません</h1>
          <p>指定された現場IDのドキュメントが存在しません。</p>
          <Link className="button-link" to="/app">
            現場選択へ戻る
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="page site-workspace">
      <div className="page-header">
        <p className="eyebrow">現場作業トップ</p>
        <h1>{site.name || '名称未設定'}</h1>
        <p className="lead">
          このページは、今後この現場内でKY作成、閲覧、印刷、会社管理、下請け責任者登録を行うための入口です。
        </p>
        <div className="actions">
          <Link className="button-link" to="/app">
            現場選択へ戻る
          </Link>
        </div>
      </div>

      <div className="status-panel role-panel">
        <h2>現場情報</h2>
        <ul className="status-list">
          <li>
            <span className="status-label">現場ID</span>
            <span className="status-value token">{site.id}</span>
          </li>
          <li>
            <span className="status-label">住所</span>
            <span className="status-value">{site.address || '住所未設定'}</span>
          </li>
          <li>
            <span className="status-label">状態</span>
            <span className="status-value">{site.active ? '有効' : '無効'}</span>
          </li>
        </ul>
      </div>

      <div className="workspace-grid">
        <section className="status-panel placeholder">
          <h2>KY作成・閲覧・印刷</h2>
          <p>この現場のKY作成・閲覧・印刷機能は後で実装します。</p>
        </section>

        <section className="status-panel placeholder">
          <h2>会社管理・下請け責任者登録</h2>
          <p>この現場の会社管理・下請け責任者登録は後で実装します。</p>
        </section>

        <section className="status-panel placeholder">
          <h2>署名確認・電子印鑑・掲示QR</h2>
          <p>署名確認、電子印鑑、現場掲示用QR管理は後で実装します。</p>
        </section>
      </div>
    </section>
  )
}
