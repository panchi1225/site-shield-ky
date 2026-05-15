import { Timestamp } from 'firebase/firestore'
import type {
  KyRecord,
  KyRecordStatus,
  KyRecordWorkItem,
} from '../types/kyRecord'

export const maxWorkItems = 5

export const possibilityOptions = [
  { value: 1, label: 'ほとんど起こらない' },
  { value: 2, label: 'たまに起こる' },
  { value: 3, label: 'かなり起こる' },
] as const

export const severityOptions = [
  { value: 1, label: '休業4日未満' },
  { value: 2, label: '休業4日以上' },
  { value: 3, label: '死亡、傷害' },
] as const

export const riskLevelDescriptions = {
  I: '計画的に改善が必要',
  II: '何らか対策が必要',
  III: '抜本的な対策が必要',
  IV: '直ちに対策が必要',
} as const

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

function toRatingValue(value: unknown): 1 | 2 | 3 {
  return value === 2 || value === 3 ? value : 1
}

export function calculateRiskScore(possibility: 1 | 2 | 3, severity: 1 | 2 | 3) {
  return possibility * severity
}

export function calculateRiskLevel(score: number): KyRecordWorkItem['riskLevel'] {
  if (score >= 9) {
    return 'IV'
  }

  if (score >= 6) {
    return 'III'
  }

  if (score >= 3) {
    return 'II'
  }

  return 'I'
}

export function getPossibilityLabel(value: number) {
  return possibilityOptions.find((option) => option.value === value)?.label ?? '未設定'
}

export function getSeverityLabel(value: number) {
  return severityOptions.find((option) => option.value === value)?.label ?? '未設定'
}

function toWorkItem(value: unknown, index: number): KyRecordWorkItem | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const data = value as Record<string, unknown>
  const order = typeof data.order === 'number' ? data.order : index + 1
  const possibility = toRatingValue(data.possibility)
  const severity = toRatingValue(data.severity)
  const riskScore = calculateRiskScore(possibility, severity)

  return {
    id: typeof data.id === 'string' ? data.id : `item-${order}`,
    order,
    workDescription:
      typeof data.workDescription === 'string' ? data.workDescription : '',
    riskPoint:
      typeof data.riskPoint === 'string'
        ? data.riskPoint
        : typeof data.riskFactors === 'string'
          ? data.riskFactors
          : '',
    possibility,
    severity,
    riskScore,
    riskLevel: calculateRiskLevel(riskScore),
    countermeasures:
      typeof data.countermeasures === 'string' ? data.countermeasures : '',
  }
}

function legacyWorkItem(data: Record<string, unknown>): KyRecordWorkItem {
  const possibility = toRatingValue(data.possibility)
  const severity = toRatingValue(data.severity)
  const riskScore = calculateRiskScore(possibility, severity)

  return {
    id: 'legacy-item-1',
    order: 1,
    workDescription:
      typeof data.workDescription === 'string'
        ? data.workDescription
        : typeof data.workName === 'string'
          ? data.workName
          : '',
    riskPoint:
      typeof data.riskPoint === 'string'
        ? data.riskPoint
        : typeof data.riskFactors === 'string'
          ? data.riskFactors
          : '',
    possibility,
    severity,
    riskScore,
    riskLevel: calculateRiskLevel(riskScore),
    countermeasures:
      typeof data.countermeasures === 'string' ? data.countermeasures : '',
  }
}

export function createEmptyWorkItem(order: number): KyRecordWorkItem {
  const riskScore = calculateRiskScore(1, 1)

  return {
    id: `item-${order}`,
    order,
    workDescription: '',
    riskPoint: '',
    possibility: 1,
    severity: 1,
    riskScore,
    riskLevel: calculateRiskLevel(riskScore),
    countermeasures: '',
  }
}

export function normalizeWorkItems(workItems: KyRecordWorkItem[]) {
  return workItems
    .slice(0, maxWorkItems)
    .map((item, index) => {
      const possibility = toRatingValue(item.possibility)
      const severity = toRatingValue(item.severity)
      const riskScore = calculateRiskScore(possibility, severity)

      return {
        id: item.id || `item-${index + 1}`,
        order: index + 1,
        workDescription: item.workDescription,
        riskPoint: item.riskPoint,
        possibility,
        severity,
        riskScore,
        riskLevel: calculateRiskLevel(riskScore),
        countermeasures: item.countermeasures,
      }
    })
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
    weather: typeof data.weather === 'string' ? data.weather : '',
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
  return kyRecord.workItems[0]?.workDescription || '作業内容未設定'
}
