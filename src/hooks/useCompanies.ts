import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Company, CompanyType } from '../types/company'
import type { UserRole } from '../types/user'

type CompaniesState = {
  companies: Company[]
  isLoading: boolean
  errorMessage: string
}

type UseCompaniesOptions = {
  role?: UserRole
  companyIds?: string[]
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

export function useCompanies(
  siteId: string | undefined,
  enabled: boolean,
  options: UseCompaniesOptions = {},
) {
  const role = options.role ?? 'admin'
  const companyIds = options.companyIds ?? []
  const companyIdsKey = companyIds.join('|')
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
        if (role === 'subcontractor_manager') {
          const uniqueCompanyIds = Array.from(new Set(companyIds)).filter(
            Boolean,
          )
          const loadedCompanies = await Promise.all(
            uniqueCompanyIds.map(async (companyId) => {
              try {
                const companySnapshot = await getDoc(
                  doc(db, 'companies', companyId),
                )

                if (!companySnapshot.exists()) {
                  return null
                }

                const company = toCompany(
                  companySnapshot.id,
                  companySnapshot.data(),
                )

                return company.siteId === currentSiteId ? company : null
              } catch {
                return null
              }
            }),
          )

          if (!isActive) {
            return
          }

          const companies = loadedCompanies
            .filter((company): company is Company => company !== null)
            .sort((a, b) => a.name.localeCompare(b.name, 'ja'))

          setState({ companies, isLoading: false, errorMessage: '' })
          return
        }

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
  }, [companyIdsKey, enabled, role, siteId])

  return state
}
