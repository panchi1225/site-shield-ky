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
