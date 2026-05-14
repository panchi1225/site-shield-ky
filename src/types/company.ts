export type CompanyType = 'prime' | 'subcontractor'

export type Company = {
  id: string
  siteId: string
  name: string
  type: CompanyType
  managerUserIds: string[]
  active: boolean
}
