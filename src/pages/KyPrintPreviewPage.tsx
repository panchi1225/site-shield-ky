import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { KyPrintSheet } from '../components/KyPrintSheet'
import { useCompany } from '../hooks/useCompany'
import { useKyRecord } from '../hooks/useKyRecord'
import { useSite } from '../hooks/useSite'
import { useWorkerChecks } from '../hooks/useWorkerChecks'

export function KyPrintPreviewPage() {
  const { companyId, kyRecordId, siteId } = useParams()
  const { appUser } = useAuth()
  const canViewPrint = appUser?.role === 'admin'
  const {
    errorMessage: kyErrorMessage,
    isLoading: isKyLoading,
    isMissing: isKyMissing,
    kyRecord,
  } = useKyRecord(kyRecordId, canViewPrint)
  const { company, errorMessage: companyErrorMessage } = useCompany(
    companyId,
    canViewPrint,
  )
  const { errorMessage: siteErrorMessage, site } = useSite(
    siteId,
    canViewPrint,
  )
  const isKyForUrl =
    kyRecord?.siteId === siteId && kyRecord?.companyId === companyId
  const canLoadWorkerChecks =
    canViewPrint && isKyForUrl && Boolean(kyRecord?.signatureSessionId)
  const {
    errorMessage: workerChecksError,
    isLoading: isWorkerChecksLoading,
    workerChecks,
  } = useWorkerChecks(kyRecord?.signatureSessionId, canLoadWorkerChecks)

  function handlePrint() {
    window.print()
  }

  if (!canViewPrint) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>PDFプレビューはまだ利用できません</h1>
          <p>今回は管理者だけがPDFプレビューを閲覧できます。</p>
        </div>
      </section>
    )
  }

  if (isKyLoading || isWorkerChecksLoading) {
    return (
      <section className="page">
        <div className="status-panel">
          <h1>印刷用データを読み込んでいます</h1>
          <p>KY、現場、会社、署名データを確認しています。</p>
        </div>
      </section>
    )
  }

  const errorMessage =
    kyErrorMessage || siteErrorMessage || companyErrorMessage || workerChecksError

  if (errorMessage) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>PDFプレビューを表示できませんでした</h1>
          <p>{errorMessage}</p>
          <BackToKyLink
            companyId={companyId}
            kyRecordId={kyRecordId}
            siteId={siteId}
          />
        </div>
      </section>
    )
  }

  if (isKyMissing || !kyRecord) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>KYが見つかりません</h1>
          <p>指定されたKY IDのドキュメントが存在しません。</p>
          <BackToKyLink
            companyId={companyId}
            kyRecordId={kyRecordId}
            siteId={siteId}
          />
        </div>
      </section>
    )
  }

  if (!isKyForUrl) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>この会社のKYではありません</h1>
          <p>URLの現場ID・会社IDとKYに保存されている情報が一致しません。</p>
          <BackToKyLink
            companyId={companyId}
            kyRecordId={kyRecordId}
            siteId={siteId}
          />
        </div>
      </section>
    )
  }

  return (
    <section className="print-preview-page">
      <div className="print-actions">
        <BackToKyLink
          companyId={companyId}
          kyRecordId={kyRecord.id}
          siteId={siteId}
        />
        <button className="button-link primary" onClick={handlePrint} type="button">
          印刷
        </button>
      </div>

      <KyPrintSheet
        companyName={company?.name ?? ''}
        participantChecks={workerChecks}
        primeContractorStamps={kyRecord.primeContractorStamps}
        preWorkChecks={kyRecord.preWorkChecks}
        siteName={site?.name ?? ''}
        stampedAt={kyRecord.stampedAt}
        stampedByName={kyRecord.stampedByName}
        stampText={kyRecord.stampText}
        weather={kyRecord.weather}
        workDate={kyRecord.workDate}
        workItems={kyRecord.workItems}
      />
    </section>
  )
}

function BackToKyLink({
  companyId,
  kyRecordId,
  siteId,
}: {
  companyId: string | undefined
  kyRecordId: string | undefined
  siteId: string | undefined
}) {
  return (
    <Link
      className="button-link"
      to={
        siteId && companyId && kyRecordId
          ? `/app/sites/${siteId}/companies/${companyId}/ky/${kyRecordId}`
          : '/app'
      }
    >
      KY詳細へ戻る
    </Link>
  )
}
