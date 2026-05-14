import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { KyRecord } from '../types/kyRecord'
import { toKyRecord } from '../utils/kyRecord'

type KyRecordsState = {
  kyRecords: KyRecord[]
  isLoading: boolean
  errorMessage: string
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
          .filter((kyRecord) =>
            ['draft', 'signature_open', 'registered', 'stamped'].includes(
              kyRecord.status,
            ),
          )
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
