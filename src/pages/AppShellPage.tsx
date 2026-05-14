import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useSites } from '../hooks/useSites'
import type { Site } from '../types/site'
import type { UserRole } from '../types/user'

const roleLabels: Record<UserRole, string> = {
  admin: '管理者',
  prime_manager: '元請責任者',
  subcontractor_manager: '下請け責任者',
}

const roleDescriptions: Record<UserRole, string> = {
  admin: '全現場を選択できます。将来的に現場追加、会社管理、下請け責任者登録を行います。',
  prime_manager:
    '担当現場を選択できます。将来的に全会社KY確認、PDF印刷、電子印鑑を行います。',
  subcontractor_manager:
    '紐づいた現場を選択できます。将来的に自社分のKY作成、署名確認、登録を行います。',
}

export function AppShellPage() {
  const navigate = useNavigate()
  const { appUser, appUserError, appUserStatus, signOutUser, user } = useAuth()
  const [errorMessage, setErrorMessage] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setErrorMessage('')
    setIsSigningOut(true)

    try {
      await signOutUser()
      navigate('/login', { replace: true })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'ログアウトに失敗しました。',
      )
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <section className="page app-dashboard">
      <div className="page-header">
        <p className="eyebrow">現場選択</p>
        <h1>利用する現場を選択します。</h1>
        <p className="lead">
          ここは実作業画面ではなく、現場ごとの作業トップへ入る入口です。
          現場追加ボタンは次の段階で配置します。
        </p>
      </div>

      <div className="status-panel">
        <h2>ログイン中のユーザー</h2>
        <ul className="status-list">
          <li>
            <span className="status-label">Firebase UID</span>
            <span className="status-value token">{user?.uid ?? '不明'}</span>
          </li>
          <li>
            <span className="status-label">メールアドレス</span>
            <span className="status-value">{user?.email ?? '不明'}</span>
          </li>
        </ul>
        {errorMessage ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <button
          className="button-link"
          disabled={isSigningOut}
          onClick={handleSignOut}
          type="button"
        >
          {isSigningOut ? 'ログアウト中...' : 'ログアウト'}
        </button>
      </div>

      <RolePanel
        appUser={appUser}
        appUserError={appUserError}
        appUserStatus={appUserStatus}
      />
    </section>
  )
}

function RolePanel({
  appUser,
  appUserError,
  appUserStatus,
}: Pick<
  ReturnType<typeof useAuth>,
  'appUser' | 'appUserError' | 'appUserStatus'
>) {
  if (appUserStatus === 'loading') {
    return (
      <div className="status-panel">
        <h2>ユーザー情報を読み込んでいます</h2>
        <p>Firestoreのusersドキュメントを確認しています。</p>
      </div>
    )
  }

  if (appUserStatus === 'missing') {
    return (
      <div className="status-panel warning-panel">
        <h2>ユーザー情報が未登録です</h2>
        <p>Firestoreの users/{'{uid}'} ドキュメントを作成してください。</p>
      </div>
    )
  }

  if (appUserStatus === 'inactive') {
    return (
      <div className="status-panel warning-panel">
        <h2>このアカウントは無効です</h2>
        <p>管理者に連絡して、usersドキュメントのactiveを確認してください。</p>
      </div>
    )
  }

  if (appUserStatus === 'error') {
    return (
      <div className="status-panel warning-panel">
        <h2>ユーザー情報を読み込めませんでした</h2>
        <p>{appUserError}</p>
      </div>
    )
  }

  if (!appUser) {
    return null
  }

  return (
    <>
      <div className="status-panel role-panel">
        <h2>{roleLabels[appUser.role]} 用の入口</h2>
        <p>{roleDescriptions[appUser.role]}</p>
        <ul className="status-list">
          <li>
            <span className="status-label">表示名</span>
            <span className="status-value">{appUser.displayName || '未設定'}</span>
          </li>
          <li>
            <span className="status-label">role</span>
            <span className="status-value">{appUser.role}</span>
          </li>
          <li>
            <span className="status-label">siteIds</span>
            <span className="status-value">{appUser.siteIds.length} 件</span>
          </li>
          <li>
            <span className="status-label">companyIds</span>
            <span className="status-value">{appUser.companyIds.length} 件</span>
          </li>
        </ul>
      </div>

      {appUser.role === 'admin' ? <AdminSitesPanel /> : null}
    </>
  )
}

function AdminSitesPanel() {
  const { errorMessage, isLoading, sites } = useSites(true)

  if (isLoading) {
    return (
      <div className="status-panel">
        <h2>現場一覧を読み込んでいます</h2>
        <p>Firestoreのsitesコレクションを確認しています。</p>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="status-panel warning-panel">
        <h2>現場一覧を読み込めませんでした</h2>
        <p>{errorMessage}</p>
      </div>
    )
  }

  return (
    <div className="status-panel">
      <div className="section-heading">
        <div>
          <h2>現場一覧</h2>
          <p>現場を選択すると、その現場の作業トップへ移動します。</p>
        </div>
        <span className="status-badge">現場追加は後で実装</span>
      </div>
      {sites.length === 0 ? (
        <p>現場が登録されていません。</p>
      ) : (
        <div className="site-list">
          {sites.map((site) => (
            <SiteListItem key={site.id} site={site} />
          ))}
        </div>
      )}
    </div>
  )
}

function SiteListItem({ site }: { site: Site }) {
  return (
    <Link className="site-item site-link" to={`/app/sites/${site.id}`}>
      <div>
        <h3>{site.name || '名称未設定'}</h3>
        <p>{site.address || '住所未設定'}</p>
      </div>
      <span className={site.active ? 'status-badge active' : 'status-badge'}>
        {site.active ? '有効' : '無効'}
      </span>
    </Link>
  )
}
