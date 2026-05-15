import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { useAuth } from '../auth/AuthContext'
import { useKyRecord } from '../hooks/useKyRecord'
import { db } from '../lib/firebase'
import type { KyRecordDraftInput, KyRecordWorkItem } from '../types/kyRecord'
import {
  createEmptyWorkItem,
  getPrimaryWorkName,
  maxWorkItems,
  normalizeWorkItems,
} from '../utils/kyRecord'

const emptyFormState: KyRecordDraftInput = {
  workDate: '',
  workItems: [createEmptyWorkItem(1)],
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
      workItems: normalizeWorkItems(kyRecord.workItems),
    })
  }, [kyRecord])

  function updateWorkItem(
    index: number,
    field: keyof Omit<KyRecordWorkItem, 'id' | 'order'>,
    value: string,
  ) {
    setFormState((current) => ({
      ...current,
      workItems: current.workItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }))
  }

  function addWorkItem() {
    setFormState((current) => {
      if (current.workItems.length >= maxWorkItems) {
        return current
      }

      return {
        ...current,
        workItems: [
          ...current.workItems,
          createEmptyWorkItem(current.workItems.length + 1),
        ],
      }
    })
  }

  function removeWorkItem(index: number) {
    setFormState((current) => {
      if (current.workItems.length <= 1) {
        return current
      }

      return {
        ...current,
        workItems: normalizeWorkItems(
          current.workItems.filter((_, itemIndex) => itemIndex !== index),
        ),
      }
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user || !kyRecordId || !kyRecord) {
      setSubmitError('保存に必要な情報が不足しています。')
      return
    }

    const workItems = normalizeWorkItems(formState.workItems)

    if (workItems.length < 1) {
      setSubmitError('作業項目は最低1件必要です。')
      return
    }

    setSubmitError('')
    setIsSubmitting(true)

    try {
      await updateDoc(doc(db, 'kyRecords', kyRecordId), {
        workItems,
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
        <h1>{getPrimaryWorkName(kyRecord)} を編集します。</h1>
        <p className="lead">
          下書き状態のKYだけ編集できます。作業項目は最大5件までです。
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
            disabled
            required
            type="date"
            value={formState.workDate}
          />
        </label>

        <div className="work-item-list">
          {formState.workItems.map((workItem, index) => (
            <WorkItemFields
              canRemove={formState.workItems.length > 1}
              index={index}
              key={workItem.id}
              onRemove={() => removeWorkItem(index)}
              onUpdate={(field, value) => updateWorkItem(index, field, value)}
              workItem={workItem}
            />
          ))}
        </div>

        <button
          className="button-link"
          disabled={formState.workItems.length >= maxWorkItems}
          onClick={addWorkItem}
          type="button"
        >
          作業内容を追加
        </button>

        {formState.workItems.length >= maxWorkItems ? (
          <p>作業項目は最大5件までです。</p>
        ) : null}

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

function WorkItemFields({
  canRemove,
  index,
  onRemove,
  onUpdate,
  workItem,
}: {
  canRemove: boolean
  index: number
  onRemove: () => void
  onUpdate: (
    field: keyof Omit<KyRecordWorkItem, 'id' | 'order'>,
    value: string,
  ) => void
  workItem: KyRecordWorkItem
}) {
  return (
    <fieldset className="work-item-fields">
      <div className="work-item-header">
        <legend>作業項目 {index + 1}</legend>
        {canRemove ? (
          <button className="button-link" onClick={onRemove} type="button">
            この作業項目を削除
          </button>
        ) : null}
      </div>

      <label>
        <span>作業名</span>
        <input
          onChange={(event) => onUpdate('workName', event.target.value)}
          required
          type="text"
          value={workItem.workName}
        />
      </label>

      <label>
        <span>作業内容</span>
        <textarea
          onChange={(event) => onUpdate('workDescription', event.target.value)}
          required
          rows={4}
          value={workItem.workDescription}
        />
      </label>

      <label>
        <span>危険要因</span>
        <textarea
          onChange={(event) => onUpdate('riskFactors', event.target.value)}
          required
          rows={4}
          value={workItem.riskFactors}
        />
      </label>

      <label>
        <span>対策</span>
        <textarea
          onChange={(event) => onUpdate('countermeasures', event.target.value)}
          required
          rows={4}
          value={workItem.countermeasures}
        />
      </label>

      <label>
        <span>本日の重点確認事項</span>
        <textarea
          onChange={(event) => onUpdate('keyPoints', event.target.value)}
          required
          rows={4}
          value={workItem.keyPoints}
        />
      </label>
    </fieldset>
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
