import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Company, CompanyType } from '../types/company'

type CompaniesState = {
  companies: Company[]
  isLoading: boolean
  errorMessage: string
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

export function useCompanies(siteId: string | undefined, enabled: boolean) {
  const [state, setState] = useState<CompaniesState>({
    companies: [],
    isLoading: false,
    errorMessage: '',
  })

  useEffect(() => {
    let isActive = true

    async function loadCompanies(currentSiteId: string) {
      setState({ companies: [], isLoading: true, errorMessage: '' })

      try {
        const companiesQuery = query(
          collection(db, 'companies'),
          where('siteId', '==', currentSiteId),
        )
        const snapshot = await getDocs(companiesQuery)

        if (!isActive) {
          return
        }

        const companies = snapshot.docs
          .map((companyDoc) => toCompany(companyDoc.id, companyDoc.data()))
          .sort((a, b) => a.name.localeCompare(b.name, 'ja'))

        setState({ companies, isLoading: false, errorMessage: '' })
      } catch (error) {
        if (!isActive) {
          return
        }

        setState({
          companies: [],
          isLoading: false,
          errorMessage:
            error instanceof Error
              ? error.message
              : '会社一覧を読み込めませんでした。',
        })
      }
    }

    if (!enabled || !siteId) {
      setState({ companies: [], isLoading: false, errorMessage: '' })
      return
    }

    void loadCompanies(siteId)

    return () => {
      isActive = false
    }
  }, [enabled, siteId])

  return state
}
