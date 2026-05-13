import { useParams } from 'react-router-dom'

export function ViewPage() {
  const { token } = useParams()

  return (
    <section className="page">
      <div className="page-header">
        <p className="eyebrow">閲覧用QRの仮画面</p>
        <h1>登録済みKYの公開閲覧画面は次の段階で実装します。</h1>
        <p className="lead">
          URLトークンを受け取れるルートだけを用意しています。公開閲覧用Firestoreデータの取得やPDF表示はまだ実装していません。
        </p>
      </div>

      <div className="status-panel">
        <h2>受け取ったトークン</h2>
        <p className="token">{token ?? 'なし'}</p>
      </div>
    </section>
  )
}
