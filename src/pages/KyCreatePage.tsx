import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '../auth/AuthContext'
import { useCompany } from '../hooks/useCompany'
import { db } from '../lib/firebase'
import type { KyRecordDraftInput } from '../types/kyRecord'

const initialFormState: KyRecordDraftInput = {
  workDate: new Date().toISOString().slice(0, 10),
  workName: '',
  workDescription: '',
  riskFactors: '',
  countermeasures: '',
  keyPoints: '',
}

export function KyCreatePage() {
  const navigate = useNavigate()
  const { companyId, siteId } = useParams()
  const { appUser, user } = useAuth()
  const canCreateKy = appUser?.role === 'admin'
  const { company, errorMessage, isLoading, isMissing } = useCompany(
    companyId,
    canCreateKy,
  )
  const [formState, setFormState] =
    useState<KyRecordDraftInput>(initialFormState)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(field: keyof KyRecordDraftInput, value: string) {
    setFormState((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user || !appUser || !siteId || !companyId || !company) {
      setSubmitError('保存に必要な情報が不足しています。')
      return
    }

    setSubmitError('')
    setIsSubmitting(true)

    try {
      await addDoc(collection(db, 'kyRecords'), {
        siteId,
        companyId,
        workDate: formState.workDate,
        workName: formState.workName,
        workDescription: formState.workDescription,
        riskFactors: formState.riskFactors,
        countermeasures: formState.countermeasures,
        keyPoints: formState.keyPoints,
        status: 'draft',
        createdBy: user.uid,
        createdByName: appUser.displayName || appUser.email || user.email || '',
        createdAt: serverTimestamp(),
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
        registeredBy: null,
        registeredAt: null,
        stampedBy: null,
        stampedAt: null,
      })

      navigate(`/app/sites/${siteId}/companies/${companyId}`, {
        replace: true,
      })
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'KY下書きの保存に失敗しました。',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canCreateKy) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>KY作成はまだ利用できません</h1>
          <p>今回は管理者だけがKY下書きを作成できます。</p>
          <BackToCompanyLink companyId={companyId} siteId={siteId} />
        </div>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="page">
        <div className="status-panel">
          <h1>会社情報を読み込んでいます</h1>
          <p>Firestoreのcompanies/{'{companyId}'} を確認しています。</p>
        </div>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>会社情報を読み込めませんでした</h1>
          <p>{errorMessage}</p>
          <BackToCompanyLink companyId={companyId} siteId={siteId} />
        </div>
      </section>
    )
  }

  if (isMissing || !company) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>会社が見つかりません</h1>
          <p>指定された会社IDのドキュメントが存在しません。</p>
          <BackToCompanyLink companyId={companyId} siteId={siteId} />
        </div>
      </section>
    )
  }

  if (company.siteId !== siteId) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>この現場の会社ではありません</h1>
          <p>URLの現場IDと会社に保存されているsiteIdが一致しません。</p>
          <BackToCompanyLink companyId={companyId} siteId={siteId} />
        </div>
      </section>
    )
  }

  return (
    <section className="page ky-create-page">
      <div className="page-header">
        <p className="eyebrow">KY作成</p>
        <h1>{company.name || '会社名未設定'} のKY下書きを作成します。</h1>
        <p className="lead">
          今回は最小項目だけを保存します。署名、健康チェック、登録、PDF生成は後で実装します。
        </p>
        <div className="actions">
          <BackToCompanyLink companyId={companyId} siteId={siteId} />
        </div>
      </div>

      <form className="data-form" onSubmit={handleSubmit}>
        <label>
          <span>作業日</span>
          <input
            onChange={(event) => updateField('workDate', event.target.value)}
            required
            type="date"
            value={formState.workDate}
          />
        </label>

        <label>
          <span>作業名</span>
          <input
            onChange={(event) => updateField('workName', event.target.value)}
            required
            type="text"
            value={formState.workName}
          />
        </label>

        <label>
          <span>作業内容</span>
          <textarea
            onChange={(event) =>
              updateField('workDescription', event.target.value)
            }
            required
            rows={4}
            value={formState.workDescription}
          />
        </label>

        <label>
          <span>危険要因</span>
          <textarea
            onChange={(event) => updateField('riskFactors', event.target.value)}
            required
            rows={4}
            value={formState.riskFactors}
          />
        </label>

        <label>
          <span>対策</span>
          <textarea
            onChange={(event) =>
              updateField('countermeasures', event.target.value)
            }
            required
            rows={4}
            value={formState.countermeasures}
          />
        </label>

        <label>
          <span>本日の重点確認事項</span>
          <textarea
            onChange={(event) => updateField('keyPoints', event.target.value)}
            required
            rows={4}
            value={formState.keyPoints}
          />
        </label>

        {submitError ? (
          <p className="form-error" role="alert">
            {submitError}
          </p>
        ) : null}

        <button className="button-link primary" disabled={isSubmitting}>
          {isSubmitting ? '保存中...' : '下書き保存'}
        </button>
      </form>
    </section>
  )
}

function BackToCompanyLink({
  companyId,
  siteId,
}: {
  companyId: string | undefined
  siteId: string | undefined
}) {
  return (
    <Link
      className="button-link"
      to={
        siteId && companyId
          ? `/app/sites/${siteId}/companies/${companyId}`
          : '/app'
      }
    >
      会社作業トップへ戻る
    </Link>
  )
}
