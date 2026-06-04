import type { KyRecordWorkItem, PrimeContractorStamp } from '../types/kyRecord'
import type { HealthChecks, MedicationStatus, PreWorkChecks } from '../types/workerCheck'
import { createEmptyWorkItem, maxWorkItems } from '../utils/kyRecord'
import { preWorkCheckItems } from '../utils/preWorkChecks'

export type KyPrintParticipantCheck = {
  id: string
  temperatureC: number | null
  alcoholMg: number | null
  healthChecks: HealthChecks
  medicationStatus: MedicationStatus
  medicationNote: string
  healthNote: string
  preWorkChecks: PreWorkChecks
  signatureFormat: 'svg'
  signatureData: string
  createdAt?: Date | null
  createdAtText?: string
}

type KyPrintSheetProps = {
  companyName: string
  participantChecks: KyPrintParticipantCheck[]
  primeContractorStamps: PrimeContractorStamp[]
  siteName: string
  stampText?: string
  stampedAt?: Date | null
  stampedByName?: string
  weather: string
  workDate: string
  workItems: KyRecordWorkItem[]
}

const rowsPerSignaturePage = 15

const medicationMarks: Record<MedicationStatus, string> = {
  taken: '○',
  forgot: '×',
  none: '-',
}

export function KyPrintSheet({
  companyName,
  participantChecks,
  primeContractorStamps,
  siteName,
  stampText = '',
  stampedAt = null,
  stampedByName = '',
  weather,
  workDate,
  workItems,
}: KyPrintSheetProps) {
  const fixedWorkItems = makeFixedWorkItems(workItems)
  const signaturePages = chunkParticipantChecks(participantChecks)

  return (
    <>
      <article className="print-sheet ky-print-sheet">
        <header className="print-title-row">
          <div>
            <h1>リスクアセスメントKY活動表</h1>
          </div>
          <PrimeStampBox
            stampedAt={stampedAt}
            stampedByName={stampedByName}
            stampText={stampText}
            stamps={primeContractorStamps}
          />
        </header>

        <section className="print-basic-grid">
          <PrintField label="工事名" value={siteName} />
          <PrintField label="会社名" value={companyName} />
          <PrintField label="実施日" value={formatJapaneseDate(workDate)} />
          <PrintField emptyText="" label="天候" value={weather.trim()} />
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
              {fixedWorkItems.map((workItem) => (
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
            <ParticipantChecksTable
              participantChecks={signaturePages[0] ?? []}
              startIndex={0}
            />
          </div>
          <RiskCriteriaPanel participantChecks={participantChecks} />
        </section>
      </article>

      {signaturePages.slice(1).map((pageParticipantChecks, pageIndex) => (
        <article
          className="print-sheet ky-print-sheet continuation-sheet"
          key={`signature-page-${pageIndex + 2}`}
        >
          <header className="print-continuation-header">
            <div>
              <h1>参加者・健康状態チェック 続き</h1>
              <p>
                工事名：{siteName || '未設定'} / 会社名：
                {companyName || '未設定'} / 実施日：
                {formatJapaneseDate(workDate)}
              </p>
            </div>
          </header>
          <ParticipantChecksTable
            participantChecks={pageParticipantChecks}
            startIndex={(pageIndex + 1) * rowsPerSignaturePage}
          />
        </article>
      ))}
    </>
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

function chunkParticipantChecks(participantChecks: KyPrintParticipantCheck[]) {
  const chunks: KyPrintParticipantCheck[][] = []

  for (
    let index = 0;
    index < participantChecks.length;
    index += rowsPerSignaturePage
  ) {
    chunks.push(participantChecks.slice(index, index + rowsPerSignaturePage))
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
  stamps,
}: {
  stampText: string
  stampedAt: Date | null
  stampedByName: string
  stamps: PrimeContractorStamp[]
}) {
  const displayStamps =
    stamps.length > 0
      ? stamps.slice(0, 3)
      : legacyPrimeStamp(stampText, stampedAt, stampedByName)
  const hasStamp = displayStamps.length > 0

  return (
    <div
      className={`prime-stamp-box ${hasStamp ? 'stamped' : ''} stamp-count-${displayStamps.length}`}
    >
      {hasStamp ? (
        displayStamps.map((stamp) => (
          <div className="prime-stamp-mark" key={stamp.id}>
            <strong>{stamp.stampText || '確認'}</strong>
            <span>{stamp.displayName}</span>
            <time>{stamp.stampedAtText}</time>
          </div>
        ))
      ) : (
        <span>元請確認欄</span>
      )}
    </div>
  )
}

function legacyPrimeStamp(
  stampText: string,
  stampedAt: Date | null,
  stampedByName: string,
): PrimeContractorStamp[] {
  if (!stampText && !stampedByName && !stampedAt) {
    return []
  }

  return [
    {
      id: 'legacy-stamp',
      stampText: '確認',
      displayName: stampedByName,
      stampedByUid: '',
      stampedAtText: formatJapaneseDateFromDate(stampedAt),
    },
  ]
}

function RiskRow({ workItem }: { workItem: KyRecordWorkItem }) {
  const hasWorkItem =
    workItem.workDescription || workItem.riskPoint || workItem.countermeasures

  return (
    <tr>
      <td className="number-cell">{workItem.order}</td>
      <td className="risk-text-cell">{workItem.workDescription}</td>
      <td className="risk-text-cell">{workItem.riskPoint}</td>
      <td className="center-cell">
        {hasWorkItem ? `${workItem.possibility}` : ''}
      </td>
      <td className="center-cell">{hasWorkItem ? `${workItem.severity}` : ''}</td>
      <td className="center-cell">{hasWorkItem ? `${workItem.riskScore}` : ''}</td>
      <td className="center-cell">{hasWorkItem ? workItem.riskLevel : ''}</td>
      <td className="risk-text-cell">{workItem.countermeasures}</td>
    </tr>
  )
}

function RiskCriteriaPanel({
  participantChecks,
}: {
  participantChecks: KyPrintParticipantCheck[]
}) {
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
      <PreWorkCheckPrintTable participantChecks={participantChecks} />
    </section>
  )
}

function PreWorkCheckPrintTable({
  participantChecks,
}: {
  participantChecks: KyPrintParticipantCheck[]
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
                {isPreWorkCheckedForAll(participantChecks, item.key) ? '○' : ''}
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
  participantChecks: KyPrintParticipantCheck[],
  key: (typeof preWorkCheckItems)[number]['key'],
) {
  return (
    participantChecks.length > 0 &&
    participantChecks.every(
      (participantCheck) => participantCheck.preWorkChecks[key],
    )
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

function ParticipantChecksTable({
  participantChecks,
  startIndex,
}: {
  participantChecks: KyPrintParticipantCheck[]
  startIndex: number
}) {
  const rows = Array.from({ length: rowsPerSignaturePage }, (_, index) => {
    return participantChecks[index] ?? null
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
        {rows.map((participantCheck, index) => (
          <ParticipantCheckRow
            index={startIndex + index}
            key={`${startIndex}-${index}`}
            participantCheck={participantCheck}
          />
        ))}
      </tbody>
    </table>
  )
}

function ParticipantCheckRow({
  index,
  participantCheck,
}: {
  index: number
  participantCheck: KyPrintParticipantCheck | null
}) {
  const signatureSvg = participantCheck
    ? getDisplayableSignatureSvg(participantCheck)
    : ''

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
        {participantCheck?.temperatureC === null || !participantCheck
          ? ''
          : participantCheck.temperatureC.toFixed(1)}
      </td>
      <td className="center-cell">
        {participantCheck?.alcoholMg === null || !participantCheck
          ? ''
          : participantCheck.alcoholMg.toFixed(2)}
      </td>
      <td className="center-cell">
        {participantCheck ? mark(participantCheck.healthChecks.conditionOk) : ''}
      </td>
      <td className="center-cell">
        {participantCheck ? mark(participantCheck.healthChecks.sleepOk) : ''}
      </td>
      <td className="center-cell">
        {participantCheck ? mark(participantCheck.healthChecks.breakfastOk) : ''}
      </td>
      <td className="center-cell">
        {participantCheck ? medicationMarks[participantCheck.medicationStatus] : ''}
      </td>
    </tr>
  )
}

function mark(value: boolean) {
  return value ? '○' : '×'
}

function getDisplayableSignatureSvg(participantCheck: KyPrintParticipantCheck) {
  const signatureData = participantCheck.signatureData.trim()
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
    participantCheck.signatureFormat !== 'svg' ||
    !signatureData.startsWith('<svg') ||
    !signatureData.includes('</svg>') ||
    blockedPatterns.some((pattern) => lowerSignatureData.includes(pattern))
  ) {
    return ''
  }

  return signatureData
}
