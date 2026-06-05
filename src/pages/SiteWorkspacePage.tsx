import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { useAuth } from '../auth/AuthContext'
import { useCompanies } from '../hooks/useCompanies'
import { useSite } from '../hooks/useSite'
import { toWorkerCheck } from '../hooks/useWorkerChecks'
import { db } from '../lib/firebase'
import type { Company } from '../types/company'
import type { KyRecord } from '../types/kyRecord'
import type { WorkerCheck } from '../types/workerCheck'
import { getPrimaryWorkName, toKyRecord } from '../utils/kyRecord'
import { createSiteViewToken, createSiteViewUrl } from '../utils/siteViewToken'

const companyTypeLabels: Record<Company['type'], string> = {
  prime: '元請',
  subcontractor: '下請',
}

export function SiteWorkspacePage() {
  const { siteId } = useParams()
  const { appUser, user } = useAuth()
  const siteIds = appUser?.siteIds ?? []
  const companyIds = appUser?.companyIds ?? []
  const currentSiteId = siteId ?? ''
  const isAdmin = appUser?.role === 'admin'
  const isPrimeManager = appUser?.role === 'prime_manager'
  const isSubcontractorManager = appUser?.role === 'subcontractor_manager'
  const canViewSite =
    isAdmin || (currentSiteId ? siteIds.includes(currentSiteId) : false)
  const canManagePublicSiteView = isAdmin || isPrimeManager
  const { errorMessage, isLoading, isMissing, site } = useSite(
    siteId,
    canViewSite,
  )

  if (!canViewSite) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>この現場ページはまだ利用できません</h1>
          <p>
            このアカウントには、この現場を閲覧する権限が紐づいていません。管理者または元請責任者に確認してください。
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
          <p>Firestoreのsites/{'{siteId}'} を確認しています。</p>
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
          <Link className="button-link" to="/app">
            現場選択へ戻る
          </Link>
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

  return (
    <section className="page site-workspace">
      <div className="page-header">
        <p className="eyebrow">現場作業トップ</p>
        <h1>{site.name || '名称未設定'}</h1>
        <p className="lead">
          このページは、今後この現場内でKY作成、閲覧、印刷、会社管理、下請け責任者登録を行うための入口です。
        </p>
        <div className="actions">
          <Link className="button-link" to="/app">
            現場選択へ戻る
          </Link>
        </div>
      </div>

      <div className="status-panel role-panel">
        <h2>現場情報</h2>
        <ul className="status-list">
          <li>
            <span className="status-label">現場ID</span>
            <span className="status-value token">{site.id}</span>
          </li>
          <li>
            <span className="status-label">住所</span>
            <span className="status-value">{site.address || '住所未設定'}</span>
          </li>
          <li>
            <span className="status-label">状態</span>
            <span className="status-value">{site.active ? '有効' : '無効'}</span>
          </li>
        </ul>
      </div>

      <SiteCompaniesPanel
        companyIds={companyIds}
        isSubcontractorManager={isSubcontractorManager}
        siteId={site.id}
      />

      {canManagePublicSiteView ? (
        <PublicSiteViewPanel
          createdToken={site.publicSiteViewToken}
          siteId={site.id}
          siteName={site.name}
          userId={user?.uid ?? ''}
        />
      ) : null}

      <div className="workspace-grid">
        {isSubcontractorManager ? (
          <>
            <section className="status-panel placeholder">
              <h2>自社KY作成・署名確認・登録</h2>
              <p>
                自社分のKY作成、署名確認、KY登録は会社カードから進みます。
              </p>
            </section>

            <section className="status-panel placeholder">
              <h2>他社・他現場の操作制限</h2>
              <p>
                下請け責任者は、紐づいた現場と会社の範囲だけを操作する想定です。
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="status-panel placeholder">
              <h2>KY作成・閲覧・印刷</h2>
              <p>この現場のKY作成・閲覧・印刷機能は後で実装します。</p>
            </section>

            <section className="status-panel placeholder">
              <h2>会社管理・下請け責任者登録</h2>
              <p>会社の新規作成・編集・削除、下請け責任者登録は後で実装します。</p>
            </section>

            <section className="status-panel placeholder">
              <h2>署名確認・電子印鑑・掲示QR</h2>
              <p>署名確認、電子印鑑、現場掲示用QR管理は後で実装します。</p>
            </section>
          </>
        )}
      </div>
    </section>
  )
}

function PublicSiteViewPanel({
  createdToken,
  siteId,
  siteName,
  userId,
}: {
  createdToken: string | null
  siteId: string
  siteName: string
  userId: string
}) {
  const [siteViewToken, setSiteViewToken] = useState(createdToken ?? '')
  const [syncDate, setSyncDate] = useState(getTodayWorkDate())
  const [isCreating, setIsCreating] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const siteViewUrl = siteViewToken ? createSiteViewUrl(siteViewToken) : ''

  async function handleCreateSiteView() {
    if (!userId) {
      setErrorMessage('現場掲示用URLの作成にはログイン情報が必要です。')
      return
    }

    if (siteViewToken) {
      return
    }

    const token = createSiteViewToken()
    setIsCreating(true)
    setErrorMessage('')
    setMessage('')

    try {
      const batch = writeBatch(db)
      batch.set(doc(db, 'publicSiteViews', token), {
        siteId,
        siteName,
        active: true,
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      batch.update(doc(db, 'sites', siteId), {
        publicSiteViewToken: token,
        publicSiteViewCreatedAt: serverTimestamp(),
        publicSiteViewCreatedBy: userId,
        updatedAt: serverTimestamp(),
      })
      await batch.commit()

      setSiteViewToken(token)
      setMessage('現場掲示用URLを作成しました。')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '現場掲示用URLを作成できませんでした。',
      )
    } finally {
      setIsCreating(false)
    }
  }

  async function handleSyncPublicKy() {
    if (!siteViewToken) {
      setErrorMessage('先に現場掲示用URLを作成してください。')
      return
    }

    setIsSyncing(true)
    setErrorMessage('')
    setMessage('')

    try {
      const companiesSnapshot = await getDocs(
        query(collection(db, 'companies'), where('siteId', '==', siteId)),
      )
      const companyMap = new Map<string, Company>()

      companiesSnapshot.docs.forEach((companyDoc) => {
        const data = companyDoc.data()
        companyMap.set(companyDoc.id, {
          id: companyDoc.id,
          siteId: typeof data.siteId === 'string' ? data.siteId : '',
          name: typeof data.name === 'string' ? data.name : '',
          type: data.type === 'prime' ? 'prime' : 'subcontractor',
          managerUserIds: Array.isArray(data.managerUserIds)
            ? data.managerUserIds.filter(
                (managerUserId): managerUserId is string =>
                  typeof managerUserId === 'string',
              )
            : [],
          active: data.active === true,
        })
      })

      const kySnapshot = await getDocs(
        query(
          collection(db, 'kyRecords'),
          where('siteId', '==', siteId),
          where('workDate', '==', syncDate),
        ),
      )
      const publicKyRecords = kySnapshot.docs
        .map((kyDoc) => toKyRecord(kyDoc.id, kyDoc.data()))
        .filter((kyRecord) =>
          kyRecord.status === 'registered' || kyRecord.status === 'stamped',
        )
      const publicKyRecordIds = new Set(
        publicKyRecords.map((kyRecord) => kyRecord.id),
      )
      const existingPublicKySnapshot = await getDocs(
        query(
          collection(db, 'publicSiteViews', siteViewToken, 'kySummaries'),
          where('workDate', '==', syncDate),
        ),
      )

      const batch = writeBatch(db)

      for (const existingPublicKyDoc of existingPublicKySnapshot.docs) {
        const participantChecksSnapshot = await getDocs(
          collection(
            db,
            'publicSiteViews',
            siteViewToken,
            'kySummaries',
            existingPublicKyDoc.id,
            'participantChecks',
          ),
        )

        participantChecksSnapshot.docs.forEach((participantCheckDoc) => {
          batch.delete(participantCheckDoc.ref)
        })

        if (!publicKyRecordIds.has(existingPublicKyDoc.id)) {
          batch.delete(existingPublicKyDoc.ref)
        }
      }

      for (const kyRecord of publicKyRecords) {
        const company = companyMap.get(kyRecord.companyId)
        const participantChecks = await loadWorkerChecksForPublicSync(
          kyRecord.signatureSessionId,
        )

        batch.set(
          doc(
            db,
            'publicSiteViews',
            siteViewToken,
            'kySummaries',
            kyRecord.id,
          ),
          createPublicKySummary(
            kyRecord,
            company?.name ?? '',
            participantChecks.length,
          ),
        )

        participantChecks.forEach((participantCheck) => {
          batch.set(
            doc(
              db,
              'publicSiteViews',
              siteViewToken,
              'kySummaries',
              kyRecord.id,
              'participantChecks',
              participantCheck.id,
            ),
            createPublicParticipantCheck(participantCheck),
          )
        })
      }

      batch.set(
        doc(db, 'publicSiteViews', siteViewToken),
        {
          siteId,
          siteName,
          active: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      await batch.commit()

      setMessage(
        `${formatJapaneseDate(syncDate)}の公開KYを${publicKyRecords.length}件更新しました。`,
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '選択日の公開KYを更新できませんでした。',
      )
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <section className="status-panel public-site-view-panel">
      <div className="section-heading">
        <div>
          <h2>現場掲示用URL</h2>
          <p>
            現場に掲示する閲覧用URLです。公開されるのは登録済み・元請確認済みKYだけです。
          </p>
        </div>
      </div>

      {siteViewUrl ? (
        <div className="signature-url-box">
          <a className="text-link signature-url" href={siteViewUrl}>
            {siteViewUrl}
          </a>
          <div className="public-sync-date-control">
            <label htmlFor="public-sync-date">公開KY更新日</label>
            <input
              id="public-sync-date"
              onChange={(event) => setSyncDate(event.target.value)}
              type="date"
              value={syncDate}
            />
          </div>
          <div className="public-site-view-actions">
            <button
              className="button-link primary"
              disabled={isSyncing}
              onClick={handleSyncPublicKy}
              type="button"
            >
              {isSyncing ? '更新中...' : '選択日の公開KYを更新'}
            </button>
            <Link className="button-link" to={`/app/sites/${siteId}/public-qr`}>
              掲示用QRを印刷
            </Link>
          </div>
        </div>
      ) : (
        <button
          className="button-link primary"
          disabled={isCreating}
          onClick={handleCreateSiteView}
          type="button"
        >
          {isCreating ? '作成中...' : '現場掲示用URLを作成'}
        </button>
      )}

      {message ? <p className="form-success">{message}</p> : null}
      {errorMessage ? (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  )
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

async function loadWorkerChecksForPublicSync(
  signatureSessionId: string | null,
) {
  if (!signatureSessionId) {
    return []
  }

  const snapshot = await getDocs(
    collection(db, 'signatureSessions', signatureSessionId, 'workerChecks'),
  )

  return snapshot.docs
    .map((workerCheckDoc) =>
      toWorkerCheck(workerCheckDoc.id, workerCheckDoc.data()),
    )
    .sort(
      (a, b) =>
        (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
    )
}

function createPublicKySummary(
  kyRecord: KyRecord,
  companyName: string,
  participantCount: number,
) {
  return {
    kyRecordId: kyRecord.id,
    siteId: kyRecord.siteId,
    companyId: kyRecord.companyId,
    companyName,
    workDate: kyRecord.workDate,
    weather: kyRecord.weather,
    status: kyRecord.status,
    representativeWorkDescription: getPrimaryWorkName(kyRecord),
    workItems: kyRecord.workItems,
    primeContractorStamps: kyRecord.primeContractorStamps,
    participantCount,
    updatedAt: serverTimestamp(),
  }
}

function createPublicParticipantCheck(workerCheck: WorkerCheck) {
  return {
    signatureFormat: workerCheck.signatureFormat,
    signatureData: workerCheck.signatureData,
    temperatureC: workerCheck.temperatureC,
    alcoholMg: workerCheck.alcoholMg,
    healthChecks: {
      conditionOk: workerCheck.healthChecks.conditionOk,
      sleepOk: workerCheck.healthChecks.sleepOk,
      breakfastOk: workerCheck.healthChecks.breakfastOk,
    },
    medicationStatus: workerCheck.medicationStatus,
    medicationNote: workerCheck.medicationNote,
    healthNote: workerCheck.healthNote,
    preWorkChecks: {
      properClothing: workerCheck.preWorkChecks.properClothing,
      qualifiedPersonnel: workerCheck.preWorkChecks.qualifiedPersonnel,
      understandsRisksAndMeasures:
        workerCheck.preWorkChecks.understandsRisksAndMeasures,
      understandsProcedure: workerCheck.preWorkChecks.understandsProcedure,
      signalCoordination: workerCheck.preWorkChecks.signalCoordination,
      commandSystem: workerCheck.preWorkChecks.commandSystem,
    },
    createdAtText: formatJapaneseDateText(workerCheck.createdAt),
  }
}

function formatJapaneseDateText(value: Date | null) {
  if (!value) {
    return ''
  }

  return `${value.getFullYear()}年 ${value.getMonth() + 1}月 ${value.getDate()}日`
}

function SiteCompaniesPanel({
  companyIds,
  isSubcontractorManager,
  siteId,
}: {
  companyIds: string[]
  isSubcontractorManager: boolean
  siteId: string
}) {
  const { companies, errorMessage, isLoading } = useCompanies(siteId, true)
  const visibleCompanies = isSubcontractorManager
    ? companies.filter((company) => companyIds.includes(company.id))
    : companies

  if (isLoading) {
    return (
      <div className="status-panel">
        <h2>会社一覧を読み込んでいます</h2>
        <p>Firestoreのcompaniesコレクションを確認しています。</p>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="status-panel warning-panel">
        <h2>会社一覧を読み込めませんでした</h2>
        <p>{errorMessage}</p>
      </div>
    )
  }

  return (
    <div className="status-panel">
      <div className="section-heading">
        <div>
          <h2>会社一覧</h2>
          <p>
            {isSubcontractorManager
              ? 'このアカウントに紐づく会社だけを表示しています。'
              : 'この現場に紐づく会社だけを表示しています。'}
          </p>
        </div>
        <span className="status-badge">会社追加は後で実装</span>
      </div>

      {companies.length === 0 ? (
        <p>この現場に会社が登録されていません。</p>
      ) : visibleCompanies.length === 0 && isSubcontractorManager ? (
        <p>
          このアカウントに紐づく会社がありません。管理者または元請責任者に確認してください。
        </p>
      ) : (
        <div className="company-list">
          {visibleCompanies.map((company) => (
            <CompanyListItem
              company={company}
              key={company.id}
              siteId={siteId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CompanyListItem({
  company,
  siteId,
}: {
  company: Company
  siteId: string
}) {
  return (
    <Link
      className="company-item company-link"
      to={`/app/sites/${siteId}/companies/${company.id}`}
    >
      <div>
        <h3>{company.name || '会社名未設定'}</h3>
        <p>{companyTypeLabels[company.type]}</p>
      </div>
      <span
        className={company.active ? 'status-badge active' : 'status-badge'}
      >
        {company.active ? '有効' : '無効'}
      </span>
    </Link>
  )
}
