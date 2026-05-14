import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { useAuth } from '../auth/AuthContext'
import { useCompany } from '../hooks/useCompany'
import { db } from '../lib/firebase'
import type { KyRecordDraftInput, KyRecordWorkItem } from '../types/kyRecord'
import {
  createEmptyWorkItem,
  maxWorkItems,
  normalizeWorkItems,
} from '../utils/kyRecord'

const initialFormState: KyRecordDraftInput = {
  workDate: new Date().toISOString().slice(0, 10),
  workItems: [createEmptyWorkItem(1)],
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

  function updateWorkDate(value: string) {
    setFormState((current) => ({ ...current, workDate: value }))
  }

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

    if (!user || !appUser || !siteId || !companyId || !company) {
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

    const kyRecordId = `${siteId}_${companyId}_${formState.workDate}`

    try {
      const kyRecordRef = doc(db, 'kyRecords', kyRecordId)
      const snapshot = await getDoc(kyRecordRef)

      if (snapshot.exists()) {
        navigate(`/app/sites/${siteId}/companies/${companyId}/ky/${kyRecordId}`, {
          replace: true,
        })
        return
      }

      await setDoc(kyRecordRef, {
        siteId,
        companyId,
        workDate: formState.workDate,
        status: 'draft',
        workItems,
        createdBy: user.uid,
        createdByName: appUser.displayName || appUser.email || user.email || '',
        createdAt: serverTimestamp(),
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
        registeredBy: null,
        registeredAt: null,
        stampedBy: null,
        stampedAt: null,
        signatureOpenedBy: null,
        signatureOpenAt: null,
      })

      navigate(`/app/sites/${siteId}/companies/${companyId}/ky/${kyRecordId}`, {
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
          1日のKYを1枚作成し、その中に作業項目を最大5件まで登録します。署名、健康チェック、登録、PDF生成は後で実装します。
        </p>
        <div className="actions">
          <BackToCompanyLink companyId={companyId} siteId={siteId} />
        </div>
      </div>

      <form className="data-form" onSubmit={handleSubmit}>
        <label>
          <span>作業日</span>
          <input
            onChange={(event) => updateWorkDate(event.target.value)}
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
          {isSubmitting ? '保存中...' : '下書き保存'}
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
