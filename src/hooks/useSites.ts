import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Site } from '../types/site'

type SitesState = {
  sites: Site[]
  isLoading: boolean
  errorMessage: string
}

function toSite(id: string, data: Record<string, unknown>): Site {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    address: typeof data.address === 'string' ? data.address : '',
    active: data.active === true,
  }
}

export function useSites(enabled: boolean) {
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
  }, [enabled])

  return state
}
