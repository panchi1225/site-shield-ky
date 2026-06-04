import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCompany } from '../hooks/useCompany'
import { useKyRecord } from '../hooks/useKyRecord'
import { useSite } from '../hooks/useSite'
import { useWorkerChecks } from '../hooks/useWorkerChecks'
import type { KyRecordWorkItem } from '../types/kyRecord'
import type { MedicationStatus, WorkerCheck } from '../types/workerCheck'
import { createEmptyWorkItem, maxWorkItems } from '../utils/kyRecord'
import { preWorkCheckItems } from '../utils/preWorkChecks'

const rowsPerSignaturePage = 15

const medicationMarks: Record<MedicationStatus, string> = {
  taken: '○',
  forgot: '×',
  none: '-',
}

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
            <h1>リスクアセスメントKY活動表</h1>
          </div>
          <PrimeStampBox
            stampText={kyRecord.stampText}
            stampedAt={kyRecord.stampedAt}
            stampedByName={kyRecord.stampedByName}
          />
        </header>

        <section className="print-basic-grid">
          <PrintField label="工事名" value={site?.name ?? ''} />
          <PrintField label="会社名" value={company?.name ?? ''} />
          <PrintField label="実施日" value={formatJapaneseDate(kyRecord.workDate)} />
          <PrintField emptyText="" label="天候" value={kyRecord.weather.trim()} />
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

        <section className="print-bottom-grid">
          <div className="print-worker-panel">
            <h2 className="print-section-title">
              参加者・健康状態チェック（本人記入）
            </h2>
            <WorkerChecksTable
              startIndex={0}
              workerChecks={signaturePages[0] ?? []}
            />
          </div>
          <RiskCriteriaPanel workerChecks={workerChecks} />
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
                {company?.name || '未設定'} / 実施日：{formatJapaneseDate(kyRecord.workDate)}
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
  return Array.from({ length: maxWorkItems }, (_, index) => {
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

function PrintField({
  emptyText = '未設定',
  label,
  value,
}: {
  emptyText?: string
  label: string
  value: string
}) {
  return (
    <div className="print-field">
      <span>{label}</span>
      <strong className="print-input-value">{value || emptyText}</strong>
    </div>
  )
}

function PrimeStampBox({
  stampText,
  stampedAt,
  stampedByName,
}: {
  stampText: string
  stampedAt: Date | null
  stampedByName: string
}) {
  const hasStamp = Boolean(stampText || stampedByName || stampedAt)

  return (
    <div className={`prime-stamp-box ${hasStamp ? 'stamped' : ''}`}>
      {hasStamp ? (
        <div className="prime-stamp-mark">
          <strong>{stampText || '確認'}</strong>
          <span>{stampedByName}</span>
          <time>{formatJapaneseDateFromDate(stampedAt)}</time>
        </div>
      ) : (
        <span>元請確認欄</span>
      )}
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
      <td className="risk-text-cell">{workItem.workDescription}</td>
      <td className="risk-text-cell">{workItem.riskPoint}</td>
      <td className="center-cell">
        {hasWorkItem ? `${workItem.possibility}` : ''}
      </td>
      <td className="center-cell">{hasWorkItem ? `${workItem.severity}` : ''}</td>
      <td className="center-cell">
        {hasWorkItem ? `${workItem.riskScore}` : ''}
      </td>
      <td className="center-cell">{hasWorkItem ? workItem.riskLevel : ''}</td>
      <td className="risk-text-cell">{workItem.countermeasures}</td>
    </tr>
  )
}

function RiskCriteriaPanel({ workerChecks }: { workerChecks: WorkerCheck[] }) {
  return (
    <section className="risk-estimate-panel">
      <h2>◎危険度（リスクレベル）の見積もり</h2>
      <div className="risk-estimate-top">
        <table className="print-table risk-estimate-table">
          <thead>
            <tr>
              <th>①可能性</th>
              <th>点数</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                ほとんど起こらない
                <br />
                （5年に1回程度発生）
              </td>
              <td>1</td>
            </tr>
            <tr>
              <td>
                たまに起こる
                <br />
                （1年に1回程度発生）
              </td>
              <td>2</td>
            </tr>
            <tr>
              <td>
                かなり起こる
                <br />
                （半年に1回程度発生）
              </td>
              <td>3</td>
            </tr>
          </tbody>
        </table>

        <div className="risk-estimate-times">×</div>

        <table className="print-table risk-estimate-table">
          <thead>
            <tr>
              <th>②重大性</th>
              <th>点数</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>休業4日未満</td>
              <td>1</td>
            </tr>
            <tr>
              <td>休業4日以上</td>
              <td>2</td>
            </tr>
            <tr>
              <td>死亡、傷害</td>
              <td>3</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>◎評価・危険度に基づく対策検討基準</h2>
      <table className="print-table risk-action-table">
        <thead>
          <tr>
            <th>③評価</th>
            <th>危険度</th>
            <th>対策検討基準</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1〜2点</td>
            <td>I</td>
            <td>計画的に改善が必要</td>
          </tr>
          <tr>
            <td>3〜4点</td>
            <td>II</td>
            <td>何らか対策が必要</td>
          </tr>
          <tr>
            <td>6点</td>
            <td>III</td>
            <td>抜本的な対策が必要</td>
          </tr>
          <tr>
            <td>9点</td>
            <td>IV</td>
            <td>直ちに対策が必要</td>
          </tr>
        </tbody>
      </table>
      <PreWorkCheckPrintTable workerChecks={workerChecks} />
    </section>
  )
}

function PreWorkCheckPrintTable({
  workerChecks,
}: {
  workerChecks: WorkerCheck[]
}) {
  return (
    <section className="pre-work-print-panel">
      <h2>作業前の確認事項</h2>
      <table className="print-table pre-work-print-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>チェック</th>
            <th>確認事項</th>
          </tr>
        </thead>
        <tbody>
          {preWorkCheckItems.map((item, index) => (
            <tr key={item.key}>
              <td className="number-cell">{index + 1}</td>
              <td className="center-cell">
                {isPreWorkCheckedForAll(workerChecks, item.key) ? '○' : ''}
              </td>
              <td>{item.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function isPreWorkCheckedForAll(
  workerChecks: WorkerCheck[],
  key: (typeof preWorkCheckItems)[number]['key'],
) {
  return (
    workerChecks.length > 0 &&
    workerChecks.every((workerCheck) => workerCheck.preWorkChecks[key])
  )
}

function formatJapaneseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return ''
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (
    !year ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return ''
  }

  return `${year}年 ${month}月 ${day}日`
}

function formatJapaneseDateFromDate(value: Date | null) {
  if (!value) {
    return ''
  }

  return `${value.getFullYear()}年 ${value.getMonth() + 1}月 ${value.getDate()}日`
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
          <th>
            alc.チェック
            <br />
            （mg）
          </th>
          <th>体調</th>
          <th>睡眠</th>
          <th>朝食</th>
          <th>服薬</th>
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
    </tr>
  )
}

function mark(value: boolean) {
  return value ? '○' : '×'
}

function getDisplayableSignatureSvg(workerCheck: WorkerCheck) {
  const signatureData = workerCheck.signatureData.trim()
  const lowerSignatureData = signatureData.toLowerCase()
  const blockedPatterns = [
    '<script',
    'javascript:',
    'onload=',
    'onerror=',
    'onclick=',
    'onmouseover=',
  ]

  if (
    workerCheck.signatureFormat !== 'svg' ||
    !signatureData.startsWith('<svg') ||
    !signatureData.includes('</svg>') ||
    blockedPatterns.some((pattern) => lowerSignatureData.includes(pattern))
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
