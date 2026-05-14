import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function AppShellPage() {
  const navigate = useNavigate()
  const { signOutUser, user } = useAuth()
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
        <h1>現場管理とKY作成は、次の段階でここに追加します。</h1>
        <p className="lead">
          今回はログイン確認、ログイン中ユーザー表示、ログアウトだけを実装しています。
          role分岐、現場管理、会社管理はまだ実装していません。
        </p>
      </div>

      <div className="status-panel">
        <h2>ログイン中のユーザー</h2>
        <ul className="status-list">
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

      <div className="status-panel placeholder">
        <h2>未実装の機能</h2>
        <ul className="status-list">
          <li>
            <span className="status-label">role分岐</span>
            <span className="status-value">未実装</span>
          </li>
          <li>
            <span className="status-label">現場管理</span>
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
