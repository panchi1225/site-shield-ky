import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { UserRole } from '../types/user'

const roleLabels: Record<UserRole, string> = {
  admin: '管理者',
  prime_manager: '元請責任者',
  subcontractor_manager: '下請け責任者',
}

const roleDescriptions: Record<UserRole, string> = {
  admin: '全現場、全会社、全機能を管理するための画面をここに追加します。',
  prime_manager: '自身の現場を選択し、全会社のKYを確認する画面をここに追加します。',
  subcontractor_manager:
    '紐づけられた現場と自社分のKYを管理する画面をここに追加します。',
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
        <p className="eyebrow">ログイン済み画面</p>
        <h1>ユーザー情報を読み込み、role別の仮画面を表示します。</h1>
        <p className="lead">
          今回はFirestoreのusersドキュメントを読むところまでです。
          現場管理、会社管理、KY作成はまだ実装していません。
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

      <div className="status-panel placeholder">
        <h2>今回まだ実装しない機能</h2>
        <ul className="status-list">
          <li>
            <span className="status-label">現場管理</span>
            <span className="status-value">未実装</span>
          </li>
          <li>
            <span className="status-label">会社管理</span>
            <span className="status-value">未実装</span>
          </li>
          <li>
            <span className="status-label">KY作成</span>
            <span className="status-value">未実装</span>
          </li>
        </ul>
      </div>
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
    <div className="status-panel role-panel">
      <h2>{roleLabels[appUser.role]} 用の仮画面</h2>
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
  )
}
