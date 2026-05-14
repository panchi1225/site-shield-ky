import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <section className="page">
        <div className="status-panel">
          <h1>ログイン状態を確認しています</h1>
          <p>しばらくお待ちください。</p>
        </div>
      </section>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
