export type HealthChecks = {
  conditionOk: boolean
  sleepOk: boolean
  alcoholOk: boolean
  medicationOk: boolean
}

export type SubmittedByAuthType = 'anonymous' | 'password' | 'unknown'

export type WorkerCheck = {
  id: string
  healthChecks: HealthChecks
  healthNote: string
  signatureFormat: 'svg'
  signatureData: string
  submittedByUid: string
  submittedByAuthType: SubmittedByAuthType
  createdAt: Date | null
  updatedAt: Date | null
}
