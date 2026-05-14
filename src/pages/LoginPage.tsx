import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'ログインに失敗しました。メールアドレスとパスワードを確認してください。'
}

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isLoading, signIn, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? '/app'

  useEffect(() => {
    if (!isLoading && user) {
      navigate(from, { replace: true })
    }
  }, [from, isLoading, navigate, user])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="page auth-page">
      <div className="auth-card">
        <div className="page-header">
          <p className="eyebrow">Firebase Authentication</p>
          <h1>ログイン</h1>
          <p className="lead">
            Firebase Consoleで登録したメールアドレスとパスワードでログインします。
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>メールアドレス</span>
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            <span>パスワード</span>
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {errorMessage ? (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button className="button-link primary" disabled={isSubmitting}>
            {isSubmitting ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <Link className="text-link" to="/">
          トップ画面に戻る
        </Link>
      </div>
    </section>
  )
}
