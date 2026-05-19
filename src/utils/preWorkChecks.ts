import type { PreWorkCheckKey, PreWorkChecks } from '../types/workerCheck'

export const preWorkCheckItems: Array<{
  key: PreWorkCheckKey
  label: string
}> = [
  {
    key: 'properClothing',
    label: '作業に適した服装・保護具を着用しているか',
  },
  {
    key: 'qualifiedPersonnel',
    label: '必要な資格者の配置（資格証の確認）をしているか',
  },
  {
    key: 'understandsRisksAndMeasures',
    label: '作業内容・危険ポイントと対策は把握しているか',
  },
  {
    key: 'understandsProcedure',
    label: '作業手順は把握しているか',
  },
  {
    key: 'signalCoordination',
    label: '合図の統一はされているか',
  },
  {
    key: 'commandSystem',
    label: '指揮系統・報告体制は確立されているか',
  },
]

export const initialPreWorkChecks: PreWorkChecks = {
  properClothing: false,
  qualifiedPersonnel: false,
  understandsRisksAndMeasures: false,
  understandsProcedure: false,
  signalCoordination: false,
  commandSystem: false,
}

export function areAllPreWorkChecksDone(preWorkChecks: PreWorkChecks) {
  return preWorkCheckItems.every((item) => preWorkChecks[item.key])
}

