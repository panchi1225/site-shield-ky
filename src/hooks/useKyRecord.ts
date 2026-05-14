import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { KyRecord } from '../types/kyRecord'
import { toKyRecord } from '../utils/kyRecord'

type KyRecordState = {
  kyRecord: KyRecord | null
  isLoading: boolean
  errorMessage: string
  isMissing: boolean
}

export function useKyRecord(
  kyRecordId: string | undefined,
  enabled: boolean,
  reloadKey = 0,
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
  }, [enabled, kyRecordId, reloadKey])

  return state
}
