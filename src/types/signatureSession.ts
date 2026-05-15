export type SignatureSession = {
  id: string
  siteId: string
  companyId: string
  kyRecordId: string
  workDate: string
  active: boolean
  createdBy: string
  createdAt: Date | null
  expiresAt: Date | null
  closedAt: Date | null
  closedBy: string | null
}
