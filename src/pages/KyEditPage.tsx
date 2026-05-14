import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { useAuth } from '../auth/AuthContext'
import { useKyRecord } from '../hooks/useKyRecord'
import { db } from '../lib/firebase'
import type { KyRecordDraftInput } from '../types/kyRecord'

const emptyFormState: KyRecordDraftInput = {
  workDate: '',
  workName: '',
  workDescription: '',
  riskFactors: '',
  countermeasures: '',
  keyPoints: '',
}

export function KyEditPage() {
  const navigate = useNavigate()
  const { companyId, kyRecordId, siteId } = useParams()
  const { appUser, user } = useAuth()
  const canEditKy = appUser?.role === 'admin'
  const { errorMessage, isLoading, isMissing, kyRecord } = useKyRecord(
    kyRecordId,
    canEditKy,
  )
  const [formState, setFormState] =
    useState<KyRecordDraftInput>(emptyFormState)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!kyRecord) {
      return
    }

    setFormState({
      workDate: kyRecord.workDate,
      workName: kyRecord.workName,
      workDescription: kyRecord.workDescription,
      riskFactors: kyRecord.riskFactors,
      countermeasures: kyRecord.countermeasures,
      keyPoints: kyRecord.keyPoints,
    })
  }, [kyRecord])

  function updateField(field: keyof KyRecordDraftInput, value: string) {
    setFormState((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user || !kyRecordId || !kyRecord) {
      setSubmitError('保存に必要な情報が不足しています。')
      return
    }

    setSubmitError('')
    setIsSubmitting(true)

    try {
      await updateDoc(doc(db, 'kyRecords', kyRecordId), {
        workDate: formState.workDate,
        workName: formState.workName,
        workDescription: formState.workDescription,
        riskFactors: formState.riskFactors,
        countermeasures: formState.countermeasures,
        keyPoints: formState.keyPoints,
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      })

      navigate(`/app/sites/${siteId}/companies/${companyId}/ky/${kyRecordId}`, {
        replace: true,
      })
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'KY下書きの更新に失敗しました。',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canEditKy) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>KY編集はまだ利用できません</h1>
          <p>今回は管理者だけがKY下書きを編集できます。</p>
          <BackToKyDetailLink
            companyId={companyId}
            kyRecordId={kyRecordId}
            siteId={siteId}
          />
        </div>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="page">
        <div className="status-panel">
          <h1>KY情報を読み込んでいます</h1>
          <p>FirestoreのkyRecords/{'{kyRecordId}'} を確認しています。</p>
        </div>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>KY情報を読み込めませんでした</h1>
          <p>{errorMessage}</p>
          <BackToKyDetailLink
            companyId={companyId}
            kyRecordId={kyRecordId}
            siteId={siteId}
          />
        </div>
      </section>
    )
  }

  if (isMissing || !kyRecord) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>KYが見つかりません</h1>
          <p>指定されたKY IDのドキュメントが存在しません。</p>
          <BackToCompanyLink companyId={companyId} siteId={siteId} />
        </div>
      </section>
    )
  }

  if (kyRecord.siteId !== siteId || kyRecord.companyId !== companyId) {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>この会社のKYではありません</h1>
          <p>URLの現場ID・会社IDとKYに保存されている情報が一致しません。</p>
          <BackToCompanyLink companyId={companyId} siteId={siteId} />
        </div>
      </section>
    )
  }

  if (kyRecord.status !== 'draft') {
    return (
      <section className="page">
        <div className="status-panel warning-panel">
          <h1>このKYは編集できません</h1>
          <p>下書き状態のKYだけ編集できます。</p>
          <BackToKyDetailLink
            companyId={companyId}
            kyRecordId={kyRecordId}
            siteId={siteId}
          />
        </div>
      </section>
    )
  }

  return (
    <section className="page ky-edit-page">
      <div className="page-header">
        <p className="eyebrow">KY編集</p>
        <h1>{kyRecord.workName || '作業名未設定'} を編集します。</h1>
        <p className="lead">
          下書き状態のKYだけ編集できます。署名受付、登録、PDF出力は後で実装します。
        </p>
        <div className="actions">
          <BackToKyDetailLink
            companyId={companyId}
            kyRecordId={kyRecordId}
            siteId={siteId}
          />
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
          {isSubmitting ? '保存中...' : '変更を保存'}
        </button>
      </form>
    </section>
  )
}

function BackToKyDetailLink({
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
