import type {
  KyRecordStatus,
  KyRecordWorkItem,
  PrimeContractorStamp,
} from './kyRecord'
import type { HealthChecks, MedicationStatus, PreWorkChecks } from './workerCheck'

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
  participantCount: number
  updatedAt: Date | null
}

export type PublicParticipantCheck = {
  id: string
  temperatureC: number | null
  alcoholMg: number | null
  healthChecks: HealthChecks
  medicationStatus: MedicationStatus
  medicationNote: string
  healthNote: string
  preWorkChecks: PreWorkChecks
  signatureFormat: 'svg'
  signatureData: string
  createdAtText: string
}
