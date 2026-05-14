import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Company, CompanyType } from '../types/company'

type CompanyState = {
  company: Company | null
  isLoading: boolean
  errorMessage: string
  isMissing: boolean
}

function isCompanyType(value: unknown): value is CompanyType {
  return value === 'prime' || value === 'subcontractor'
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function toCompany(id: string, data: Record<string, unknown>): Company {
  return {
    id,
    siteId: typeof data.siteId === 'string' ? data.siteId : '',
    name: typeof data.name === 'string' ? data.name : '',
    type: isCompanyType(data.type) ? data.type : 'subcontractor',
    managerUserIds: toStringArray(data.managerUserIds),
    active: data.active === true,
  }
}

export function useCompany(companyId: string | undefined, enabled: boolean) {
  const [state, setState] = useState<CompanyState>({
    company: null,
    isLoading: false,
    errorMessage: '',
    isMissing: false,
  })

  useEffect(() => {
    let isActive = true

    async function loadCompany(currentCompanyId: string) {
      setState({
        company: null,
        isLoading: true,
        errorMessage: '',
        isMissing: false,
      })

      try {
        const snapshot = await getDoc(doc(db, 'companies', currentCompanyId))

        if (!isActive) {
          return
        }

        if (!snapshot.exists()) {
          setState({
            company: null,
            isLoading: false,
            errorMessage: '',
            isMissing: true,
          })
          return
        }

        setState({
          company: toCompany(snapshot.id, snapshot.data()),
          isLoading: false,
          errorMessage: '',
          isMissing: false,
        })
      } catch (error) {
        if (!isActive) {
          return
        }

        setState({
          company: null,
          isLoading: false,
          errorMessage:
            error instanceof Error
              ? error.message
              : '会社情報を読み込めませんでした。',
          isMissing: false,
        })
      }
    }

    if (!enabled || !companyId) {
      setState({
        company: null,
        isLoading: false,
        errorMessage: '',
        isMissing: false,
      })
      return
    }

    void loadCompany(companyId)

    return () => {
      isActive = false
    }
  }, [companyId, enabled])

  return state
}
