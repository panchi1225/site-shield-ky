import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type {
  PublicKySummary,
  PublicKySummaryStatus,
  PublicSiteView,
} from '../types/publicSiteView'
import type { KyRecordWorkItem, PrimeContractorStamp } from '../types/kyRecord'

const publicStatusLabels: Record<PublicKySummaryStatus, string> = {
  registered: '登録済み',
  stamped: '元請確認済み',
}

type PublicSiteViewState = {
  isLoading: boolean
  errorMessage: string
  siteView: PublicSiteView | null
  kySummaries: PublicKySummary[]
}

export function PublicSiteViewPage() {
  const { siteViewToken } = useParams()
  const [selectedKyRecordId, setSelectedKyRecordId] = useState('')
  const [state, setState] = useState<PublicSiteViewState>({
    isLoading: true,
    errorMessage: '',
    siteView: null,
    kySummaries: [],
  })
  const today = useMemo(() => getTodayWorkDate(), [])
  const selectedKySummary =
    state.kySummaries.find((summary) => summary.id === selectedKyRecordId) ??
    state.kySummaries[0] ??
    null

  useEffect(() => {
    let isActive = true

    async function loadPublicSiteView(currentToken: string) {
      setState({
        isLoading: true,
        errorMessage: '',
        siteView: null,
        kySummaries: [],
      })

      try {
        const siteViewSnapshot = await getDoc(
          doc(db, 'publicSiteViews', currentToken),
        )

        if (!isActive) {
          return
        }

        if (!siteViewSnapshot.exists()) {
          setState({
            isLoading: false,
            errorMessage: '現場閲覧ページが見つかりません。',
            siteView: null,
            kySummaries: [],
          })
          return
        }

        const siteView = toPublicSiteView(
          siteViewSnapshot.id,
          siteViewSnapshot.data(),
        )

        if (!siteView.active) {
          setState({
            isLoading: false,
            errorMessage: 'この現場閲覧ページは停止されています。',
            siteView,
            kySummaries: [],
          })
          return
        }

        const summariesSnapshot = await getDocs(
          query(
            collection(db, 'publicSiteViews', currentToken, 'kySummaries'),
            where('workDate', '==', today),
          ),
        )
        const kySummaries = summariesSnapshot.docs
          .map((summaryDoc) =>
            toPublicKySummary(summaryDoc.id, summaryDoc.data()),
          )
          .filter((summary): summary is PublicKySummary => summary !== null)
          .sort((a, b) => a.companyName.localeCompare(b.companyName, 'ja'))

        if (!isActive) {
          return
        }

        setState({
          isLoading: false,
          errorMessage: '',
          siteView,
          kySummaries,
        })
        setSelectedKyRecordId(kySummaries[0]?.id ?? '')
      } catch (error) {
        if (!isActive) {
          return
        }

        setState({
          isLoading: false,
          errorMessage:
            error instanceof Error && error.message
              ? '現場閲覧ページが見つからないか、停止されています。'
              : '現場閲覧ページを読み込めませんでした。',
          siteView: null,
          kySummaries: [],
        })
      }
    }

    if (!siteViewToken) {
      setState({
        isLoading: false,
        errorMessage: '現場閲覧ページが見つかりません。',
        siteView: null,
        kySummaries: [],
      })
      return
    }

    void loadPublicSiteView(siteViewToken)

    return () => {
      isActive = false
    }
  }, [siteViewToken, today])

  if (state.isLoading) {
    return (
      <section className="page public-site-view-page">
        <div className="status-panel">
          <h1>本日のKY一覧を読み込んでいます</h1>
        </div>
      </section>
    )
  }

  if (state.errorMessage) {
    return (
      <section className="page public-site-view-page">
        <div className="status-panel warning-panel">
          <h1>閲覧できません</h1>
          <p>{state.errorMessage}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="page public-site-view-page">
      <div className="page-header">
        <p className="eyebrow">現場掲示用閲覧ページ</p>
        <h1>{state.siteView?.siteName || '現場名未設定'}</h1>
        <p className="lead">本日のKY一覧: {formatJapaneseDate(today)}</p>
      </div>

      <section className="status-panel">
        <h2>本日のKY一覧</h2>
        {state.kySummaries.length === 0 ? (
          <p>本日公開されているKYはありません。</p>
        ) : (
          <div className="public-ky-list">
            {state.kySummaries.map((summary) => (
              <button
                className={
                  summary.id === selectedKySummary?.id
                    ? 'public-ky-item selected'
                    : 'public-ky-item'
                }
                key={summary.id}
                onClick={() => setSelectedKyRecordId(summary.id)}
                type="button"
              >
                <strong>{summary.companyName || '会社名未設定'}</strong>
                <span>{summary.representativeWorkDescription || '作業内容未設定'}</span>
                <span className="status-badge">
                  {publicStatusLabels[summary.status]}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedKySummary ? <PublicKyDetail summary={selectedKySummary} /> : null}
    </section>
  )
}

function PublicKyDetail({ summary }: { summary: PublicKySummary }) {
  return (
    <section className="status-panel public-ky-detail">
      <div className="section-heading">
        <div>
          <h2>{summary.companyName || '会社名未設定'}</h2>
          <p>{formatJapaneseDate(summary.workDate)}</p>
        </div>
        <span className="status-badge active">
          {publicStatusLabels[summary.status]}
        </span>
      </div>

      <ul className="status-list">
        <li>
          <span className="status-label">会社名</span>
          <span className="status-value">{summary.companyName}</span>
        </li>
        <li>
          <span className="status-label">実施日</span>
          <span className="status-value">{formatJapaneseDate(summary.workDate)}</span>
        </li>
        <li>
          <span className="status-label">天候</span>
          <span className="status-value">{summary.weather}</span>
        </li>
      </ul>

      <div className="public-work-item-list">
        {summary.workItems.map((workItem) => (
          <PublicWorkItem key={workItem.id} workItem={workItem} />
        ))}
      </div>

      <div>
        <h3>元請確認欄</h3>
        {summary.primeContractorStamps.length > 0 ? (
          <div className="public-stamp-list">
            {summary.primeContractorStamps.map((stamp) => (
              <PublicStamp key={stamp.id} stamp={stamp} />
            ))}
          </div>
        ) : (
          <p>未確認</p>
        )}
      </div>
    </section>
  )
}

function PublicWorkItem({ workItem }: { workItem: KyRecordWorkItem }) {
  return (
    <article className="public-work-item">
      <h3>No. {workItem.order}</h3>
      <dl>
        <dt>作業内容</dt>
        <dd>{workItem.workDescription}</dd>
        <dt>危険ポイント</dt>
        <dd>{workItem.riskPoint}</dd>
        <dt>可能性</dt>
        <dd>{workItem.possibility}</dd>
        <dt>重大性</dt>
        <dd>{workItem.severity}</dd>
        <dt>評価</dt>
        <dd>{workItem.riskScore}</dd>
        <dt>危険度</dt>
        <dd>{workItem.riskLevel}</dd>
        <dt>危険ポイントの対策</dt>
        <dd>{workItem.countermeasures}</dd>
      </dl>
    </article>
  )
}

function PublicStamp({ stamp }: { stamp: PrimeContractorStamp }) {
  return (
    <div className="public-stamp">
      <strong>{stamp.stampText}</strong>
      <span>{stamp.displayName}</span>
      <time>{stamp.stampedAtText}</time>
    </div>
  )
}

function toPublicSiteView(
  id: string,
  data: Record<string, unknown>,
): PublicSiteView {
  return {
    id,
    siteId: typeof data.siteId === 'string' ? data.siteId : '',
    siteName: typeof data.siteName === 'string' ? data.siteName : '',
    active: data.active === true,
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
    updatedAt:
      data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null,
  }
}

function toPublicKySummary(
  id: string,
  data: Record<string, unknown>,
): PublicKySummary | null {
  if (data.status !== 'registered' && data.status !== 'stamped') {
    return null
  }

  return {
    id,
    kyRecordId: typeof data.kyRecordId === 'string' ? data.kyRecordId : id,
    siteId: typeof data.siteId === 'string' ? data.siteId : '',
    companyId: typeof data.companyId === 'string' ? data.companyId : '',
    companyName: typeof data.companyName === 'string' ? data.companyName : '',
    workDate: typeof data.workDate === 'string' ? data.workDate : '',
    weather: typeof data.weather === 'string' ? data.weather : '',
    status: data.status,
    representativeWorkDescription:
      typeof data.representativeWorkDescription === 'string'
        ? data.representativeWorkDescription
        : '',
    workItems: Array.isArray(data.workItems)
      ? (data.workItems.filter(
          (item): item is KyRecordWorkItem =>
            Boolean(item) && typeof item === 'object',
        ) as KyRecordWorkItem[])
      : [],
    primeContractorStamps: Array.isArray(data.primeContractorStamps)
      ? (data.primeContractorStamps.filter(
          (stamp): stamp is PrimeContractorStamp =>
            Boolean(stamp) && typeof stamp === 'object',
        ) as PrimeContractorStamp[])
      : [],
    updatedAt:
      data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null,
  }
}

function getTodayWorkDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatJapaneseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return value
  }

  return `${Number(match[1])}年 ${Number(match[2])}月 ${Number(match[3])}日`
}
