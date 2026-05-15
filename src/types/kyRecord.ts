export type KyRecordStatus =
  | 'draft'
  | 'signature_open'
  | 'registered'
  | 'stamped'

export type KyRecordWorkItem = {
  id: string
  order: number
  workDescription: string
  riskPoint: string
  possibility: 1 | 2 | 3
  severity: 1 | 2 | 3
  riskScore: number
  riskLevel: 'I' | 'II' | 'III' | 'IV'
  countermeasures: string
}

export type KyRecordDraftInput = {
  workDate: string
  weather: string
  workItems: KyRecordWorkItem[]
}

export type KyRecord = {
  id: string
  siteId: string
  companyId: string
  workDate: string
  weather: string
  status: KyRecordStatus
  workItems: KyRecordWorkItem[]
  createdBy: string
  createdByName: string
  createdAt: Date | null
  updatedBy: string
  updatedAt: Date | null
  signatureSessionId: string | null
  signatureOpenedBy: string | null
  signatureOpenAt: Date | null
  registeredBy: string | null
  registeredAt: Date | null
  stampedBy: string | null
  stampedAt: Date | null
}
