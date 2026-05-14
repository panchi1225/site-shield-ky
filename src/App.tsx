import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppShellPage } from './pages/AppShellPage'
import { CompanyWorkspacePage } from './pages/CompanyWorkspacePage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { SignPage } from './pages/SignPage'
import { SiteWorkspacePage } from './pages/SiteWorkspacePage'
import { ViewPage } from './pages/ViewPage'

function App() {
  return (
    <div className="app-frame">
      <header className="site-header">
        <Link className="brand" to="/">
          Site Shield KY
        </Link>
        <nav className="top-nav" aria-label="主要画面">
          <Link to="/login">ログイン</Link>
          <Link to="/app">アプリ</Link>
          <Link to="/sign/sample-token">署名QR</Link>
          <Link to="/view/sample-token">閲覧QR</Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppShellPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/sites/:siteId"
            element={
              <ProtectedRoute>
                <SiteWorkspacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/sites/:siteId/companies/:companyId"
            element={
              <ProtectedRoute>
                <CompanyWorkspacePage />
              </ProtectedRoute>
            }
          />
          <Route path="/sign/:token" element={<SignPage />} />
          <Route path="/view/:token" element={<ViewPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
