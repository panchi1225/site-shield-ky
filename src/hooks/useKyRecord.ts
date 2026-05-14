import { useEffect, useState } from 'react'
import { doc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { KyRecord, KyRecordStatus } from '../types/kyRecord'

type KyRecordState = {
  kyRecord: KyRecord | null
  isLoading: boolean
  errorMessage: string
  isMissing: boolean
}

const validStatuses: KyRecordStatus[] = [
  'draft',
  'signature_open',
  'registered',
  'stamped',
]

function isKyRecordStatus(value: unknown): value is KyRecordStatus {
  return typeof value === 'string' && validStatuses.includes(value as KyRecordStatus)
}

function toDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : null
}

function toNullableString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function toKyRecord(id: string, data: Record<string, unknown>): KyRecord {
  return {
    id,
    siteId: typeof data.siteId === 'string' ? data.siteId : '',
    companyId: typeof data.companyId === 'string' ? data.companyId : '',
    workDate: typeof data.workDate === 'string' ? data.workDate : '',
    workName: typeof data.workName === 'string' ? data.workName : '',
    workDescription:
      typeof data.workDescription === 'string' ? data.workDescription : '',
    riskFactors: typeof data.riskFactors === 'string' ? data.riskFactors : '',
    countermeasures:
      typeof data.countermeasures === 'string' ? data.countermeasures : '',
    keyPoints: typeof data.keyPoints === 'string' ? data.keyPoints : '',
    status: isKyRecordStatus(data.status) ? data.status : 'draft',
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
    createdByName:
      typeof data.createdByName === 'string' ? data.createdByName : '',
    createdAt: toDate(data.createdAt),
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : '',
    updatedAt: toDate(data.updatedAt),
    registeredBy: toNullableString(data.registeredBy),
    registeredAt: toDate(data.registeredAt),
    stampedBy: toNullableString(data.stampedBy),
    stampedAt: toDate(data.stampedAt),
  }
}

export function useKyRecord(
  kyRecordId: string | undefined,
  enabled: boolean,
) {
  const [state, setState] = useState<KyRecordState>({
    kyRecord: null,
    isLoading: false,
    errorMessage: '',
    isMissing: false,
  })

  useEffect(() => {
    let isActive = true

    async function loadKyRecord(currentKyRecordId: string) {
      setState({
        kyRecord: null,
        isLoading: true,
        errorMessage: '',
        isMissing: false,
      })

      try {
        const snapshot = await getDoc(doc(db, 'kyRecords', currentKyRecordId))

        if (!isActive) {
          return
        }

        if (!snapshot.exists()) {
          setState({
            kyRecord: null,
            isLoading: false,
            errorMessage: '',
            isMissing: true,
          })
          return
        }

        setState({
          kyRecord: toKyRecord(snapshot.id, snapshot.data()),
          isLoading: false,
          errorMessage: '',
          isMissing: false,
        })
      } catch (error) {
        if (!isActive) {
          return
        }

        setState({
          kyRecord: null,
          isLoading: false,
          errorMessage:
            error instanceof Error
              ? error.message
              : 'KY情報を読み込めませんでした。',
          isMissing: false,
        })
      }
    }

    if (!enabled || !kyRecordId) {
      setState({
        kyRecord: null,
        isLoading: false,
        errorMessage: '',
        isMissing: false,
      })
      return
    }

    void loadKyRecord(kyRecordId)

    return () => {
      isActive = false
    }
  }, [enabled, kyRecordId])

  return state
}
