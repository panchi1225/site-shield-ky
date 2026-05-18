import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCompany } from '../hooks/useCompany'
import { useKyRecord } from '../hooks/useKyRecord'
import { useSite } from '../hooks/useSite'
import { useWorkerChecks } from '../hooks/useWorkerChecks'
import type { KyRecordWorkItem } from '../types/kyRecord'
import type { MedicationStatus, WorkerCheck } from '../types/workerCheck'
import {
  createEmptyWorkItem,
  getPossibilityLabel,
  getSeverityLabel,
  riskLevelDescriptions,
} from '../utils/kyRecord'

const rowsPerSignaturePage = 14

const medicationMarks: Record<MedicationStatus, string> = {
  taken: '○',
  forgot: '×',
  none: '-',
}

const statusLabels = {
  draft: '下書き',
  signature_open: '署名受付中',
  registered: '登録済み',
  stamped: '押印済み',
} as const

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

  const workItems = makeFixedWorkItems(kyRecord.workItems)
  const signaturePages = chunkWorkerChecks(workerChecks)

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

      <article className="print-sheet ky-print-sheet">
        <header className="print-title-row">
          <div>
            <p className="print-subtitle">リスクアセスメントKY</p>
            <h1>リスクアセスメントKY</h1>
          </div>
          <div className="prime-stamp-box">
            <span>元請確認欄</span>
          </div>
        </header>

        <section className="print-basic-grid">
          <PrintField label="工事名" value={site?.name ?? ''} />
          <PrintField label="会社名" value={company?.name ?? ''} />
          <PrintField label="実施日" value={kyRecord.workDate} />
          <PrintField label="天候" value={kyRecord.weather} />
          <PrintField label="状態" value={statusLabels[kyRecord.status]} />
        </section>

        <section>
          <h2 className="print-section-title">リスクアセスメントKY</h2>
          <table className="print-table risk-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>作業内容</th>
                <th>危険ポイント</th>
                <th>可能性</th>
                <th>重大性</th>
                <th>評価</th>
                <th>危険度</th>
                <th>危険ポイントの対策</th>
              </tr>
            </thead>
            <tbody>
              {workItems.map((workItem) => (
                <RiskRow key={workItem.id} workItem={workItem} />
              ))}
            </tbody>
          </table>
        </section>

        <RiskCriteriaTable />

        <section>
          <h2 className="print-section-title">参加者・健康状態チェック</h2>
          <WorkerChecksTable
            startIndex={0}
            workerChecks={signaturePages[0] ?? []}
          />
        </section>
      </article>

      {signaturePages.slice(1).map((pageWorkerChecks, pageIndex) => (
        <article
          className="print-sheet ky-print-sheet continuation-sheet"
          key={`signature-page-${pageIndex + 2}`}
        >
          <header className="print-continuation-header">
            <div>
              <h1>参加者・健康状態チェック 続き</h1>
              <p>
                工事名：{site?.name || '未設定'} / 会社名：
                {company?.name || '未設定'} / 実施日：{kyRecord.workDate}
              </p>
            </div>
          </header>
          <WorkerChecksTable
            startIndex={(pageIndex + 1) * rowsPerSignaturePage}
            workerChecks={pageWorkerChecks}
          />
        </article>
      ))}
    </section>
  )
}

function makeFixedWorkItems(workItems: KyRecordWorkItem[]) {
  return Array.from({ length: 5 }, (_, index) => {
    return (
      workItems[index] ?? {
        ...createEmptyWorkItem(index + 1),
        id: `blank-item-${index + 1}`,
      }
    )
  })
}

function chunkWorkerChecks(workerChecks: WorkerCheck[]) {
  const chunks: WorkerCheck[][] = []

  for (let index = 0; index < workerChecks.length; index += rowsPerSignaturePage) {
    chunks.push(workerChecks.slice(index, index + rowsPerSignaturePage))
  }

  return chunks.length > 0 ? chunks : [[]]
}

function PrintField({ label, value }: { label: string; value: string }) {
  return (
    <div className="print-field">
      <span>{label}</span>
      <strong>{value || '未設定'}</strong>
    </div>
  )
}

function RiskRow({ workItem }: { workItem: KyRecordWorkItem }) {
  const hasWorkItem =
    workItem.workDescription ||
    workItem.riskPoint ||
    workItem.countermeasures

  return (
    <tr>
      <td className="number-cell">{workItem.order}</td>
      <td>{workItem.workDescription}</td>
      <td>{workItem.riskPoint}</td>
      <td className="center-cell">
        {hasWorkItem ? `${workItem.possibility}` : ''}
      </td>
      <td className="center-cell">{hasWorkItem ? `${workItem.severity}` : ''}</td>
      <td className="center-cell">
        {hasWorkItem ? `${workItem.riskScore}` : ''}
      </td>
      <td className="center-cell">{hasWorkItem ? workItem.riskLevel : ''}</td>
      <td>{workItem.countermeasures}</td>
    </tr>
  )
}

function RiskCriteriaTable() {
  return (
    <section>
      <h2 className="print-section-title">評価基準表</h2>
      <div className="criteria-print-grid">
        <table className="print-table criteria-table-print">
          <thead>
            <tr>
              <th colSpan={2}>可能性</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>{getPossibilityLabel(1)}</td>
            </tr>
            <tr>
              <td>2</td>
              <td>{getPossibilityLabel(2)}</td>
            </tr>
            <tr>
              <td>3</td>
              <td>{getPossibilityLabel(3)}</td>
            </tr>
          </tbody>
        </table>

        <table className="print-table criteria-table-print">
          <thead>
            <tr>
              <th colSpan={2}>重大性</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>{getSeverityLabel(1)}</td>
            </tr>
            <tr>
              <td>2</td>
              <td>{getSeverityLabel(2)}</td>
            </tr>
            <tr>
              <td>3</td>
              <td>{getSeverityLabel(3)}</td>
            </tr>
          </tbody>
        </table>

        <table className="print-table criteria-table-print">
          <thead>
            <tr>
              <th colSpan={2}>危険度</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>I</td>
              <td>{riskLevelDescriptions.I}</td>
            </tr>
            <tr>
              <td>II</td>
              <td>{riskLevelDescriptions.II}</td>
            </tr>
            <tr>
              <td>III</td>
              <td>{riskLevelDescriptions.III}</td>
            </tr>
            <tr>
              <td>IV</td>
              <td>{riskLevelDescriptions.IV}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

function WorkerChecksTable({
  startIndex,
  workerChecks,
}: {
  startIndex: number
  workerChecks: WorkerCheck[]
}) {
  const rows = Array.from({ length: rowsPerSignaturePage }, (_, index) => {
    return workerChecks[index] ?? null
  })

  return (
    <table className="print-table worker-check-table">
      <thead>
        <tr>
          <th>No.</th>
          <th>氏名</th>
          <th>体温（℃）</th>
          <th>alc.チェック（mg）</th>
          <th>体調</th>
          <th>睡眠</th>
          <th>朝食</th>
          <th>服薬</th>
          <th>服薬内容</th>
          <th>体調メモ</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((workerCheck, index) => (
          <WorkerCheckRow
            index={startIndex + index}
            key={`${startIndex}-${index}`}
            workerCheck={workerCheck}
          />
        ))}
      </tbody>
    </table>
  )
}

function WorkerCheckRow({
  index,
  workerCheck,
}: {
  index: number
  workerCheck: WorkerCheck | null
}) {
  const signatureSvg = workerCheck ? getDisplayableSignatureSvg(workerCheck) : ''

  return (
    <tr>
      <td className="number-cell">{index + 1}</td>
      <td className="signature-name-cell">
        {signatureSvg ? (
          <div
            className="print-signature-box"
            dangerouslySetInnerHTML={{ __html: signatureSvg }}
          />
        ) : null}
      </td>
      <td className="center-cell">
        {workerCheck?.temperatureC === null || !workerCheck
          ? ''
          : workerCheck.temperatureC.toFixed(1)}
      </td>
      <td className="center-cell">
        {workerCheck?.alcoholMg === null || !workerCheck
          ? ''
          : workerCheck.alcoholMg.toFixed(2)}
      </td>
      <td className="center-cell">
        {workerCheck ? mark(workerCheck.healthChecks.conditionOk) : ''}
      </td>
      <td className="center-cell">
        {workerCheck ? mark(workerCheck.healthChecks.sleepOk) : ''}
      </td>
      <td className="center-cell">
        {workerCheck ? mark(workerCheck.healthChecks.breakfastOk) : ''}
      </td>
      <td className="center-cell">
        {workerCheck ? medicationMarks[workerCheck.medicationStatus] : ''}
      </td>
      <td>{workerCheck?.medicationNote ?? ''}</td>
      <td>{workerCheck?.healthNote ?? ''}</td>
    </tr>
  )
}

function mark(value: boolean) {
  return value ? '○' : '×'
}

function getDisplayableSignatureSvg(workerCheck: WorkerCheck) {
  const signatureData = workerCheck.signatureData.trim()
  const lowerSignatureData = signatureData.toLowerCase()

  if (
    workerCheck.signatureFormat !== 'svg' ||
    !signatureData.startsWith('<svg') ||
    !signatureData.includes('</svg>') ||
    lowerSignatureData.includes('<script') ||
    lowerSignatureData.includes('onload=')
  ) {
    return ''
  }

  return signatureData
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
