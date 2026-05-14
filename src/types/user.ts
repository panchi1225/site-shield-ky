export type UserRole = 'admin' | 'prime_manager' | 'subcontractor_manager'

export type AppUser = {
  role: UserRole
  displayName: string
  email: string
  siteIds: string[]
  companyIds: string[]
  active: boolean
}
