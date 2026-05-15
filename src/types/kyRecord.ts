export type KyRecordStatus =
  | 'draft'
  | 'signature_open'
  | 'registered'
  | 'stamped'

export type KyRecordWorkItem = {
  id: string
  order: number
  workName: string
  workDescription: string
  riskFactors: string
  countermeasures: string
  keyPoints: string
}

export type KyRecordDraftInput = {
  workDate: string
  workItems: KyRecordWorkItem[]
}

export type KyRecord = {
  id: string
  siteId: string
  companyId: string
  workDate: string
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
