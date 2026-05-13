import { useParams } from 'react-router-dom'

export function SignPage() {
  const { token } = useParams()

  return (
    <section className="page">
      <div className="page-header">
        <p className="eyebrow">署名用QRの仮画面</p>
        <h1>作業員の署名・健康チェック画面は次の段階で実装します。</h1>
        <p className="lead">
          URLトークンを受け取れるルートだけを用意しています。匿名認証、署名保存、健康チェック保存はまだ実装していません。
        </p>
      </div>

      <div className="status-panel">
        <h2>受け取ったトークン</h2>
        <p className="token">{token ?? 'なし'}</p>
      </div>
    </section>
  )
}
