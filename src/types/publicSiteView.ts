import type { KyRecordStatus, KyRecordWorkItem, PrimeContractorStamp } from './kyRecord'

export type PublicKySummaryStatus = Extract<
  KyRecordStatus,
  'registered' | 'stamped'
>

export type PublicSiteView = {
  id: string
  siteId: string
  siteName: string
  active: boolean
  createdBy: string
  createdAt: Date | null
  updatedAt: Date | null
}

export type PublicKySummary = {
  id: string
  kyRecordId: string
  siteId: string
  companyId: string
  companyName: string
  workDate: string
  weather: string
  status: PublicKySummaryStatus
  representativeWorkDescription: string
  workItems: KyRecordWorkItem[]
  primeContractorStamps: PrimeContractorStamp[]
  updatedAt: Date | null
}
