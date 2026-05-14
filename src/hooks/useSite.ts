import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Site } from '../types/site'

type SiteState = {
  site: Site | null
  isLoading: boolean
  errorMessage: string
  isMissing: boolean
}

function toSite(id: string, data: Record<string, unknown>): Site {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    address: typeof data.address === 'string' ? data.address : '',
    active: data.active === true,
  }
}

export function useSite(siteId: string | undefined, enabled: boolean) {
  const [state, setState] = useState<SiteState>({
    site: null,
    isLoading: false,
    errorMessage: '',
    isMissing: false,
  })

  useEffect(() => {
    let isActive = true

    async function loadSite(currentSiteId: string) {
      setState({
        site: null,
        isLoading: true,
        errorMessage: '',
        isMissing: false,
      })

      try {
        const snapshot = await getDoc(doc(db, 'sites', currentSiteId))

        if (!isActive) {
          return
        }

        if (!snapshot.exists()) {
          setState({
            site: null,
            isLoading: false,
            errorMessage: '',
            isMissing: true,
          })
          return
        }

        setState({
          site: toSite(snapshot.id, snapshot.data()),
          isLoading: false,
          errorMessage: '',
          isMissing: false,
        })
      } catch (error) {
        if (!isActive) {
          return
        }

        setState({
          site: null,
          isLoading: false,
          errorMessage:
            error instanceof Error
              ? error.message
              : '現場情報を読み込めませんでした。',
          isMissing: false,
        })
      }
    }

    if (!enabled || !siteId) {
      setState({
        site: null,
        isLoading: false,
        errorMessage: '',
        isMissing: false,
      })
      return
    }

    void loadSite(siteId)

    return () => {
      isActive = false
    }
  }, [enabled, siteId])

  return state
}
