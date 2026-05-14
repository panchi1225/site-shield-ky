import { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { KyRecord, KyRecordStatus } from '../types/kyRecord'

type KyRecordsState = {
  kyRecords: KyRecord[]
  isLoading: boolean
  errorMessage: string
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

export function useKyRecords(
  siteId: string | undefined,
  companyId: string | undefined,
  enabled: boolean,
) {
  const [state, setState] = useState<KyRecordsState>({
    kyRecords: [],
    isLoading: false,
    errorMessage: '',
  })

  useEffect(() => {
    let isActive = true

    async function loadKyRecords(currentSiteId: string, currentCompanyId: string) {
      setState({ kyRecords: [], isLoading: true, errorMessage: '' })

      try {
        const kyRecordsQuery = query(
          collection(db, 'kyRecords'),
          where('siteId', '==', currentSiteId),
          where('companyId', '==', currentCompanyId),
        )
        const snapshot = await getDocs(kyRecordsQuery)

        if (!isActive) {
          return
        }

        const kyRecords = snapshot.docs
          .map((kyRecordDoc) => toKyRecord(kyRecordDoc.id, kyRecordDoc.data()))
          .filter((kyRecord) => kyRecord.status === 'draft')
          .sort((a, b) => {
            const dateCompare = b.workDate.localeCompare(a.workDate)

            if (dateCompare !== 0) {
              return dateCompare
            }

            return (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0)
          })

        setState({ kyRecords, isLoading: false, errorMessage: '' })
      } catch (error) {
        if (!isActive) {
          return
        }

        setState({
          kyRecords: [],
          isLoading: false,
          errorMessage:
            error instanceof Error
              ? error.message
              : 'KY下書き一覧を読み込めませんでした。',
        })
      }
    }

    if (!enabled || !siteId || !companyId) {
      setState({ kyRecords: [], isLoading: false, errorMessage: '' })
      return
    }

    void loadKyRecords(siteId, companyId)

    return () => {
      isActive = false
    }
  }, [companyId, enabled, siteId])

  return state
}
