import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Site } from '../types/site'
import type { UserRole } from '../types/user'

type SitesState = {
  sites: Site[]
  isLoading: boolean
  errorMessage: string
}

type UseSitesOptions = {
  role?: UserRole
  siteIds?: string[]
}

function toSite(id: string, data: Record<string, unknown>): Site {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    address: typeof data.address === 'string' ? data.address : '',
    active: data.active === true,
    primeContractorStampOptions: [],
    publicSiteViewToken:
      typeof data.publicSiteViewToken === 'string'
        ? data.publicSiteViewToken
        : null,
    publicSiteViewCreatedAt: null,
    publicSiteViewCreatedBy:
      typeof data.publicSiteViewCreatedBy === 'string'
        ? data.publicSiteViewCreatedBy
        : null,
  }
}

export function useSites(enabled: boolean, options: UseSitesOptions = {}) {
  const role = options.role ?? 'admin'
  const siteIds = options.siteIds ?? []
  const siteIdsKey = siteIds.join('|')
  const [state, setState] = useState<SitesState>({
    sites: [],
    isLoading: false,
    errorMessage: '',
  })

  useEffect(() => {
    let isActive = true

    async function loadSites() {
      setState({ sites: [], isLoading: true, errorMessage: '' })

      try {
        if (role === 'admin') {
          const sitesQuery = query(collection(db, 'sites'), orderBy('name'))
          const snapshot = await getDocs(sitesQuery)

          if (!isActive) {
            return
          }

          setState({
            sites: snapshot.docs.map((siteDoc) =>
              toSite(siteDoc.id, siteDoc.data()),
            ),
            isLoading: false,
            errorMessage: '',
          })
          return
        }

        const uniqueSiteIds = Array.from(new Set(siteIds)).filter(Boolean)
        const loadedSites = await Promise.all(
          uniqueSiteIds.map(async (siteId) => {
            try {
              const siteSnapshot = await getDoc(doc(db, 'sites', siteId))

              if (!siteSnapshot.exists()) {
                return null
              }

              return toSite(siteSnapshot.id, siteSnapshot.data())
            } catch {
              return null
            }
          }),
        )

        if (!isActive) {
          return
        }

        const sites = loadedSites
          .filter((site): site is Site => site !== null)
          .sort((a, b) => a.name.localeCompare(b.name, 'ja'))

        setState({
          sites,
          isLoading: false,
          errorMessage: '',
        })
      } catch (error) {
        if (!isActive) {
          return
        }

        setState({
          sites: [],
          isLoading: false,
          errorMessage:
            error instanceof Error
              ? error.message
              : '現場一覧を読み込めませんでした。',
        })
      }
    }

    if (!enabled) {
      setState({ sites: [], isLoading: false, errorMessage: '' })
      return
    }

    void loadSites()

    return () => {
      isActive = false
    }
  }, [enabled, role, siteIdsKey])

  return state
}
