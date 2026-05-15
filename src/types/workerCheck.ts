export type HealthChecks = {
  conditionOk: boolean
  sleepOk: boolean
  breakfastOk: boolean
}

export type MedicationStatus = 'taken' | 'forgot' | 'none'

export type SubmittedByAuthType = 'anonymous' | 'password' | 'unknown'

export type WorkerCheck = {
  id: string
  temperatureC: number | null
  alcoholMg: number | null
  healthChecks: HealthChecks
  medicationStatus: MedicationStatus
  medicationNote: string
  healthNote: string
  signatureFormat: 'svg'
  signatureData: string
  submittedByUid: string
  submittedByAuthType: SubmittedByAuthType
  createdAt: Date | null
  updatedAt: Date | null
}
