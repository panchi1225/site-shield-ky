import { useEffect, useState } from 'react'
import { collection, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type {
  HealthChecks,
  SubmittedByAuthType,
  WorkerCheck,
} from '../types/workerCheck'

type WorkerChecksState = {
  errorMessage: string
  isLoading: boolean
  workerChecks: WorkerCheck[]
}

function toDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : null
}

function toHealthChecks(value: unknown): HealthChecks {
  if (!value || typeof value !== 'object') {
    return {
      conditionOk: false,
      sleepOk: false,
      alcoholOk: false,
      medicationOk: false,
    }
  }

  const data = value as Record<string, unknown>

  return {
    conditionOk: data.conditionOk === true,
    sleepOk: data.sleepOk === true,
    alcoholOk: data.alcoholOk === true,
    medicationOk: data.medicationOk === true,
  }
}

function toSubmittedByAuthType(value: unknown): SubmittedByAuthType {
  return value === 'anonymous' || value === 'password' || value === 'unknown'
    ? value
    : 'unknown'
}

function toWorkerCheck(id: string, data: Record<string, unknown>): WorkerCheck {
  return {
    id,
    healthChecks: toHealthChecks(data.healthChecks),
    healthNote: typeof data.healthNote === 'string' ? data.healthNote : '',
    signatureFormat: 'svg',
    signatureData:
      typeof data.signatureData === 'string' ? data.signatureData : '',
    submittedByUid:
      typeof data.submittedByUid === 'string' ? data.submittedByUid : '',
    submittedByAuthType: toSubmittedByAuthType(data.submittedByAuthType),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

export function useWorkerChecks(
  signatureSessionId: string | null | undefined,
  enabled: boolean,
) {
  const [state, setState] = useState<WorkerChecksState>({
    errorMessage: '',
    isLoading: false,
    workerChecks: [],
  })

  useEffect(() => {
    let isActive = true

    async function loadWorkerChecks(currentSignatureSessionId: string) {
      setState({
        errorMessage: '',
        isLoading: true,
        workerChecks: [],
      })

      try {
        const snapshot = await getDocs(
          collection(
            db,
            'signatureSessions',
            currentSignatureSessionId,
            'workerChecks',
          ),
        )

        if (!isActive) {
          return
        }

        const workerChecks = snapshot.docs
          .map((workerCheckDoc) =>
            toWorkerCheck(workerCheckDoc.id, workerCheckDoc.data()),
          )
          .sort(
            (a, b) =>
              (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
          )

        setState({
          errorMessage: '',
          isLoading: false,
          workerChecks,
        })
      } catch (error) {
        if (!isActive) {
          return
        }

        setState({
          errorMessage:
            error instanceof Error
              ? error.message
              : '署名一覧を読み込めませんでした。',
          isLoading: false,
          workerChecks: [],
        })
      }
    }

    if (!enabled || !signatureSessionId) {
      setState({
        errorMessage: '',
        isLoading: false,
        workerChecks: [],
      })
      return
    }

    void loadWorkerChecks(signatureSessionId)

    return () => {
      isActive = false
    }
  }, [enabled, signatureSessionId])

  return state
}
