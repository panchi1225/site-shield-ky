import { useEffect, useMemo, useRef, useState } from 'react'
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
import { KyPrintSheet } from '../components/KyPrintSheet'
import { db } from '../lib/firebase'
import type {
  PublicKySummary,
  PublicKySummaryStatus,
  PublicParticipantCheck,
  PublicSiteView,
} from '../types/publicSiteView'
import type { KyRecordWorkItem, PrimeContractorStamp } from '../types/kyRecord'
import type { MedicationStatus } from '../types/workerCheck'

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

type ParticipantChecksState = {
  errorMessage: string
  isLoading: boolean
  participantChecks: PublicParticipantCheck[]
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
  const [participantState, setParticipantState] =
    useState<ParticipantChecksState>({
      errorMessage: '',
      isLoading: false,
      participantChecks: [],
    })
  const today = useMemo(() => getTodayWorkDate(), [])
  const selectedKySummary =
    state.kySummaries.find((summary) => summary.id === selectedKyRecordId) ??
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
        setSelectedKyRecordId('')
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

  useEffect(() => {
    let isActive = true

    async function loadParticipantChecks(currentToken: string, kyRecordId: string) {
      setParticipantState({
        errorMessage: '',
        isLoading: true,
        participantChecks: [],
      })

      try {
        const snapshot = await getDocs(
          collection(
            db,
            'publicSiteViews',
            currentToken,
            'kySummaries',
            kyRecordId,
            'participantChecks',
          ),
        )
        const participantChecks = snapshot.docs
          .map((participantDoc) =>
            toPublicParticipantCheck(participantDoc.id, participantDoc.data()),
          )
          .sort((a, b) => a.id.localeCompare(b.id, 'ja'))

        if (!isActive) {
          return
        }

        setParticipantState({
          errorMessage: '',
          isLoading: false,
          participantChecks,
        })
      } catch (error) {
        if (!isActive) {
          return
        }

        setParticipantState({
          errorMessage:
            error instanceof Error && error.message
              ? '参加者情報を読み込めませんでした。'
              : '参加者情報を読み込めませんでした。',
          isLoading: false,
          participantChecks: [],
        })
      }
    }

    if (!siteViewToken || !selectedKySummary) {
      setParticipantState({
        errorMessage: '',
        isLoading: false,
        participantChecks: [],
      })
      return
    }

    void loadParticipantChecks(siteViewToken, selectedKySummary.id)

    return () => {
      isActive = false
    }
  }, [selectedKySummary, siteViewToken])

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
        <p className="lead">
          本日のKY登録会社一覧: {formatJapaneseDate(today)}
        </p>
      </div>

      {!selectedKySummary ? (
        <section className="status-panel public-ky-list-panel">
          <h2>本日のKY登録会社一覧</h2>
          {state.kySummaries.length === 0 ? (
            <p>本日公開されているKYはありません。</p>
          ) : (
            <div className="public-ky-list">
              {state.kySummaries.map((summary) => (
                <button
                  className={
                    summary.id === selectedKyRecordId
                      ? 'public-ky-item selected'
                      : 'public-ky-item'
                  }
                  key={summary.id}
                  onClick={() => setSelectedKyRecordId(summary.id)}
                  type="button"
                >
                  <strong>{summary.companyName || '会社名未設定'}</strong>
                  <span>
                    {summary.representativeWorkDescription || '作業内容未設定'}
                  </span>
                  <span className="status-badge">
                    {publicStatusLabels[summary.status]}
                  </span>
                  <span>{summary.participantCount}名署名</span>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {selectedKySummary ? (
        <PublicKyPrintPreview
          onBack={() => setSelectedKyRecordId('')}
          participantState={participantState}
          siteName={state.siteView?.siteName ?? ''}
          summary={selectedKySummary}
        />
      ) : null}
    </section>
  )
}

function PublicKyPrintPreview({
  onBack,
  participantState,
  siteName,
  summary,
}: {
  onBack: () => void
  participantState: ParticipantChecksState
  siteName: string
  summary: PublicKySummary
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const sheetScaleRef = useRef<HTMLDivElement | null>(null)
  const [sheetPreview, setSheetPreview] = useState({
    height: 0,
    scale: 1,
  })

  useEffect(() => {
    const viewportElement = viewportRef.current
    const sheetElement = sheetScaleRef.current

    if (!viewportElement || !sheetElement) {
      return
    }

    const viewport = viewportElement
    const sheet = sheetElement

    function updateSheetPreview() {
      const viewportWidth = viewport.clientWidth
      const sheetWidth = sheet.scrollWidth
      const sheetHeight = sheet.scrollHeight

      if (!viewportWidth || !sheetWidth || !sheetHeight) {
        return
      }

      const nextScale = Math.min(1, viewportWidth / sheetWidth)
      setSheetPreview({
        height: Math.ceil(sheetHeight * nextScale),
        scale: nextScale,
      })
    }

    updateSheetPreview()

    const resizeObserver = new ResizeObserver(updateSheetPreview)
    resizeObserver.observe(viewport)
    resizeObserver.observe(sheet)
    window.addEventListener('resize', updateSheetPreview)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateSheetPreview)
    }
  }, [
    participantState.errorMessage,
    participantState.isLoading,
    participantState.participantChecks.length,
    summary.id,
  ])

  return (
    <section className="public-print-preview">
      <div className="public-print-actions print-actions">
        <div>
          <h2>{summary.companyName || '会社名未設定'}</h2>
          <p>
            {formatJapaneseDate(summary.workDate)} /{' '}
            {publicStatusLabels[summary.status]}
          </p>
        </div>
        <div className="public-print-action-buttons">
          <button className="button-link" onClick={onBack} type="button">
            一覧に戻る
          </button>
          <button
            className="button-link primary"
            onClick={() => window.print()}
            type="button"
          >
            印刷
          </button>
        </div>
      </div>

      {participantState.isLoading ? (
        <div className="status-panel public-print-loading">
          <p>帳票を読み込んでいます。</p>
        </div>
      ) : null}

      {participantState.errorMessage ? (
        <div className="status-panel warning-panel public-print-loading">
          <p>{participantState.errorMessage}</p>
        </div>
      ) : null}

      {!participantState.isLoading && !participantState.errorMessage ? (
        <div
          className="public-print-sheet-viewport"
          ref={viewportRef}
          style={{ height: sheetPreview.height || undefined }}
        >
          <div
            className="public-print-sheet-scale"
            ref={sheetScaleRef}
            style={{
              transform:
                sheetPreview.scale < 1
                  ? `scale(${sheetPreview.scale})`
                  : undefined,
            }}
          >
            <KyPrintSheet
              companyName={summary.companyName}
              participantChecks={participantState.participantChecks}
              primeContractorStamps={summary.primeContractorStamps}
              siteName={siteName}
              weather={summary.weather}
              workDate={summary.workDate}
              workItems={summary.workItems}
            />
          </div>
        </div>
      ) : null}
    </section>
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
    participantCount:
      typeof data.participantCount === 'number' ? data.participantCount : 0,
    updatedAt:
      data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null,
  }
}

function toPublicParticipantCheck(
  id: string,
  data: Record<string, unknown>,
): PublicParticipantCheck {
  const healthChecks =
    data.healthChecks && typeof data.healthChecks === 'object'
      ? (data.healthChecks as Record<string, unknown>)
      : {}
  const preWorkChecks =
    data.preWorkChecks && typeof data.preWorkChecks === 'object'
      ? (data.preWorkChecks as Record<string, unknown>)
      : {}

  return {
    id,
    temperatureC:
      typeof data.temperatureC === 'number' ? data.temperatureC : null,
    alcoholMg: typeof data.alcoholMg === 'number' ? data.alcoholMg : null,
    healthChecks: {
      conditionOk: healthChecks.conditionOk === true,
      sleepOk: healthChecks.sleepOk === true,
      breakfastOk: healthChecks.breakfastOk === true,
    },
    medicationStatus: toMedicationStatus(data.medicationStatus),
    medicationNote:
      typeof data.medicationNote === 'string' ? data.medicationNote : '',
    healthNote: typeof data.healthNote === 'string' ? data.healthNote : '',
    preWorkChecks: {
      properClothing: preWorkChecks.properClothing === true,
      qualifiedPersonnel: preWorkChecks.qualifiedPersonnel === true,
      understandsRisksAndMeasures:
        preWorkChecks.understandsRisksAndMeasures === true,
      understandsProcedure: preWorkChecks.understandsProcedure === true,
      signalCoordination: preWorkChecks.signalCoordination === true,
      commandSystem: preWorkChecks.commandSystem === true,
    },
    signatureFormat: data.signatureFormat === 'svg' ? 'svg' : 'svg',
    signatureData:
      typeof data.signatureData === 'string' ? data.signatureData : '',
    createdAtText:
      typeof data.createdAtText === 'string' ? data.createdAtText : '',
  }
}

function toMedicationStatus(value: unknown): MedicationStatus {
  if (value === 'taken' || value === 'forgot' || value === 'none') {
    return value
  }

  return 'none'
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
