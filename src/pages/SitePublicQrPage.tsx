import { QRCodeSVG } from 'qrcode.react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useSite } from '../hooks/useSite'
import { createSiteViewUrl } from '../utils/siteViewToken'

export function SitePublicQrPage() {
  const { siteId } = useParams()
  const { appUser } = useAuth()
  const canViewQrPage = appUser?.role === 'admin'
  const { errorMessage, isLoading, isMissing, site } = useSite(
    siteId,
    canViewQrPage,
  )

  if (!canViewQrPage) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>掲示用QR印刷ページはまだ利用できません</h1>
          <p>
            今回は管理者だけが掲示用QRを印刷できます。元請責任者への権限拡張は後で対応します。
          </p>
          <Link className="button-link" to="/app">
            現場選択へ戻る
          </Link>
        </div>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="page">
        <div className="status-panel">
          <h1>現場情報を読み込んでいます</h1>
          <p>掲示用QRに使う現場情報を確認しています。</p>
        </div>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>現場情報を読み込めませんでした</h1>
          <p>{errorMessage}</p>
          <BackToSiteLink siteId={siteId} />
        </div>
      </section>
    )
  }

  if (isMissing || !site) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>現場が見つかりません</h1>
          <p>指定された現場IDのドキュメントが存在しません。</p>
          <Link className="button-link" to="/app">
            現場選択へ戻る
          </Link>
        </div>
      </section>
    )
  }

  const publicSiteViewUrl = site.publicSiteViewToken
    ? createSiteViewUrl(site.publicSiteViewToken)
    : ''

  return (
    <section className="page public-qr-page">
      <div className="page-header public-qr-screen-only">
        <p className="eyebrow">現場掲示用QR印刷</p>
        <h1>{site.name || '名称未設定'}</h1>
        <p className="lead">
          現場に掲示するためのKY確認用QRを印刷します。
        </p>
        <div className="actions">
          <BackToSiteLink siteId={site.id} />
          {publicSiteViewUrl ? (
            <button
              className="button-link primary"
              onClick={() => window.print()}
              type="button"
            >
              印刷
            </button>
          ) : null}
        </div>
      </div>

      {publicSiteViewUrl ? (
        <article className="public-qr-sheet">
          <p className="public-qr-eyebrow">現場掲示用</p>
          <h2>現場掲示用KY確認QR</h2>
          <p className="public-qr-site-name">{site.name || '名称未設定'}</p>
          <p className="public-qr-description">
            このQRを読み込むと、本日のKY活動表を確認できます。
          </p>

          <div className="public-qr-code-box" aria-label="現場掲示用QRコード">
            <QRCodeSVG
              level="M"
              marginSize={2}
              size={280}
              value={publicSiteViewUrl}
            />
          </div>

          <p className="public-qr-url">{publicSiteViewUrl}</p>
          <p className="public-qr-note">
            当日の登録済み・元請確認済みKYが表示されます。
          </p>
        </article>
      ) : (
        <div className="status-panel warning-panel">
          <h2>現場掲示用URLがまだ作成されていません</h2>
          <p>
            先に現場トップで「現場掲示用URLを作成」してください。作成後に、このページでQRを印刷できます。
          </p>
          <BackToSiteLink siteId={site.id} />
        </div>
      )}
    </section>
  )
}

function BackToSiteLink({ siteId }: { siteId: string | undefined }) {
  if (!siteId) {
    return (
      <Link className="button-link" to="/app">
        現場選択へ戻る
      </Link>
    )
  }

  return (
    <Link className="button-link" to={`/app/sites/${siteId}`}>
      現場作業トップへ戻る
    </Link>
  )
}
