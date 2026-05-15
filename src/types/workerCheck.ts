export type HealthChecks = {
  conditionOk: boolean
  sleepOk: boolean
  alcoholOk: boolean
  medicationOk: boolean
}

export type SubmittedByAuthType = 'anonymous' | 'password' | 'unknown'
