export function AppShellPage() {
  return (
    <section className="page">
      <div className="page-header">
        <p className="eyebrow">ログイン後画面の土台</p>
        <h1>現場管理とKY作成は、次の段階でここに追加します。</h1>
        <p className="lead">
          今回はルートだけを作成しています。ログイン、role分岐、現場管理、会社管理はまだ実装していません。
        </p>
      </div>

      <div className="status-panel placeholder">
        <h2>未実装の機能</h2>
        <ul className="status-list">
          <li>
            <span className="status-label">ログイン</span>
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
