import { Timestamp } from 'firebase/firestore'
import type {
  KyRecord,
  KyRecordStatus,
  KyRecordWorkItem,
} from '../types/kyRecord'

export const maxWorkItems = 5

const validStatuses: KyRecordStatus[] = [
  'draft',
  'signature_open',
  'registered',
  'stamped',
]

function isKyRecordStatus(value: unknown): value is KyRecordStatus {
  return typeof value === 'string' && validStatuses.includes(value as KyRecordStatus)
}

function toDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : null
}

function toNullableString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function toWorkItem(value: unknown, index: number): KyRecordWorkItem | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const data = value as Record<string, unknown>
  const order = typeof data.order === 'number' ? data.order : index + 1

  return {
    id: typeof data.id === 'string' ? data.id : `item-${order}`,
    order,
    workName: typeof data.workName === 'string' ? data.workName : '',
    workDescription:
      typeof data.workDescription === 'string' ? data.workDescription : '',
    riskFactors: typeof data.riskFactors === 'string' ? data.riskFactors : '',
    countermeasures:
      typeof data.countermeasures === 'string' ? data.countermeasures : '',
    keyPoints: typeof data.keyPoints === 'string' ? data.keyPoints : '',
  }
}

function legacyWorkItem(data: Record<string, unknown>): KyRecordWorkItem {
  return {
    id: 'legacy-item-1',
    order: 1,
    workName: typeof data.workName === 'string' ? data.workName : '',
    workDescription:
      typeof data.workDescription === 'string' ? data.workDescription : '',
    riskFactors: typeof data.riskFactors === 'string' ? data.riskFactors : '',
    countermeasures:
      typeof data.countermeasures === 'string' ? data.countermeasures : '',
    keyPoints: typeof data.keyPoints === 'string' ? data.keyPoints : '',
  }
}

export function createEmptyWorkItem(order: number): KyRecordWorkItem {
  return {
    id: `item-${order}`,
    order,
    workName: '',
    workDescription: '',
    riskFactors: '',
    countermeasures: '',
    keyPoints: '',
  }
}

export function normalizeWorkItems(workItems: KyRecordWorkItem[]) {
  return workItems
    .slice(0, maxWorkItems)
    .map((item, index) => ({
      id: item.id || `item-${index + 1}`,
      order: index + 1,
      workName: item.workName,
      workDescription: item.workDescription,
      riskFactors: item.riskFactors,
      countermeasures: item.countermeasures,
      keyPoints: item.keyPoints,
    }))
}

export function toKyRecord(
  id: string,
  data: Record<string, unknown>,
): KyRecord {
  const rawWorkItems = Array.isArray(data.workItems)
    ? data.workItems
        .map((item, index) => toWorkItem(item, index))
        .filter((item): item is KyRecordWorkItem => item !== null)
    : []

  const workItems =
    rawWorkItems.length > 0 ? rawWorkItems : [legacyWorkItem(data)]

  return {
    id,
    siteId: typeof data.siteId === 'string' ? data.siteId : '',
    companyId: typeof data.companyId === 'string' ? data.companyId : '',
    workDate: typeof data.workDate === 'string' ? data.workDate : '',
    status: isKyRecordStatus(data.status) ? data.status : 'draft',
    workItems: normalizeWorkItems(
      workItems.sort((a, b) => a.order - b.order),
    ),
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
    createdByName:
      typeof data.createdByName === 'string' ? data.createdByName : '',
    createdAt: toDate(data.createdAt),
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : '',
    updatedAt: toDate(data.updatedAt),
    signatureSessionId: toNullableString(data.signatureSessionId),
    signatureOpenedBy: toNullableString(data.signatureOpenedBy),
    signatureOpenAt: toDate(data.signatureOpenAt),
    registeredBy: toNullableString(data.registeredBy),
    registeredAt: toDate(data.registeredAt),
    stampedBy: toNullableString(data.stampedBy),
    stampedAt: toDate(data.stampedAt),
  }
}

export function getPrimaryWorkName(kyRecord: KyRecord) {
  return kyRecord.workItems[0]?.workName || '作業名未設定'
}
