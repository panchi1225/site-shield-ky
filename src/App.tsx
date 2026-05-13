import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { AppShellPage } from './pages/AppShellPage'
import { HomePage } from './pages/HomePage'
import { SignPage } from './pages/SignPage'
import { ViewPage } from './pages/ViewPage'

function App() {
  return (
    <div className="app-frame">
      <header className="site-header">
        <Link className="brand" to="/">
          Site Shield KY
        </Link>
        <nav className="top-nav" aria-label="主要画面">
          <Link to="/app">アプリ</Link>
          <Link to="/sign/sample-token">署名QR</Link>
          <Link to="/view/sample-token">閲覧QR</Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/app" element={<AppShellPage />} />
          <Route path="/sign/:token" element={<SignPage />} />
          <Route path="/view/:token" element={<ViewPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
