export type KyRecordStatus =
  | 'draft'
  | 'signature_open'
  | 'registered'
  | 'stamped'

export type KyRecordDraftInput = {
  workDate: string
  workName: string
  workDescription: string
  riskFactors: string
  countermeasures: string
  keyPoints: string
}

export type KyRecord = KyRecordDraftInput & {
  id: string
  siteId: string
  companyId: string
  status: KyRecordStatus
  createdBy: string
  createdByName: string
  createdAt: Date | null
  updatedBy: string
  updatedAt: Date | null
  signatureOpenedBy: string | null
  signatureOpenAt: Date | null
  registeredBy: string | null
  registeredAt: Date | null
  stampedBy: string | null
  stampedAt: Date | null
}
