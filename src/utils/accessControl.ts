import type { AppUser } from '../types/user'

function safeStringArray(value: string[] | undefined) {
  return Array.isArray(value) ? value : []
}

export function canAccessSite(
  appUser: AppUser | null,
  siteId: string | undefined,
) {
  if (!appUser || !siteId) {
    return false
  }

  if (appUser.role === 'admin') {
    return true
  }

  return safeStringArray(appUser.siteIds).includes(siteId)
}

export function canAccessCompany(
  appUser: AppUser | null,
  siteId: string | undefined,
  companyId: string | undefined,
) {
  if (!appUser || !siteId || !companyId) {
    return false
  }

  if (appUser.role === 'admin') {
    return true
  }

  const siteIds = safeStringArray(appUser.siteIds)
  const companyIds = safeStringArray(appUser.companyIds)

  if (!siteIds.includes(siteId)) {
    return false
  }

  if (appUser.role === 'prime_manager') {
    return true
  }

  return companyIds.includes(companyId)
}

export function canUsePrimeContractorActions(
  appUser: AppUser | null,
  siteId: string | undefined,
) {
  if (!appUser || !siteId) {
    return false
  }

  if (appUser.role === 'admin') {
    return true
  }

  if (appUser.role !== 'prime_manager') {
    return false
  }

  return safeStringArray(appUser.siteIds).includes(siteId)
}
