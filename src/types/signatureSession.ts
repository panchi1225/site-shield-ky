import type { KyRecordWorkItem } from './kyRecord'

export type SignatureSession = {
  id: string
  siteId: string
  siteName: string
  companyId: string
  companyName: string
  kyRecordId: string
  workDate: string
  workItems: KyRecordWorkItem[]
  active: boolean
  createdBy: string
  createdAt: Date | null
  expiresAt: Date | null
  closedAt: Date | null
  closedBy: string | null
}
