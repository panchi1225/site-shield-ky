import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <section className="page">
      <div className="page-header">
        <p className="eyebrow">リスクアセスメントKY</p>
        <h1>現場ごとのKY作成、署名、閲覧の土台を準備しました。</h1>
        <p className="lead">
          この初期版では、GitHub Pages公開を前提にした画面遷移とFirebase接続の準備だけを入れています。
          ログイン、KY作成、署名、PDF生成は次の段階で実装します。
        </p>
        <div className="actions">
          <Link className="button-link primary" to="/app">
            アプリ画面へ
          </Link>
          <Link className="button-link" to="/view/sample-token">
            閲覧QRの仮画面
          </Link>
        </div>
      </div>

      <div className="panel-grid">
        <article className="panel">
          <h2>公開</h2>
          <p>GitHub Pages用にViteのbase設定を行っています。</p>
        </article>
        <article className="panel">
          <h2>Firebase</h2>
          <p>AuthenticationとFirestoreを後で使える初期化ファイルを用意しています。</p>
        </article>
        <article className="panel">
          <h2>画面遷移</h2>
          <p>トップ、ログイン後アプリ、署名QR、閲覧QRの仮ルートを用意しています。</p>
        </article>
      </div>
    </section>
  )
}
