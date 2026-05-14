import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { AppUser, UserRole } from '../types/user'

type AppUserStatus =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'missing'
  | 'inactive'
  | 'error'

type AuthContextValue = {
  user: User | null
  appUser: AppUser | null
  appUserStatus: AppUserStatus
  appUserError: string
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const validRoles: UserRole[] = [
  'admin',
  'prime_manager',
  'subcontractor_manager',
]

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && validRoles.includes(value as UserRole)
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [appUserStatus, setAppUserStatus] = useState<AppUserStatus>('idle')
  const [appUserError, setAppUserError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setIsLoading(false)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    let isActive = true

    async function loadAppUser(currentUser: User) {
      setAppUser(null)
      setAppUserError('')
      setAppUserStatus('loading')

      try {
        const snapshot = await getDoc(doc(db, 'users', currentUser.uid))

        if (!isActive) {
          return
        }

        if (!snapshot.exists()) {
          setAppUserStatus('missing')
          return
        }

        const data = snapshot.data()

        if (!isUserRole(data.role)) {
          setAppUserError('ユーザー情報のroleが正しくありません。')
          setAppUserStatus('error')
          return
        }

        const loadedUser: AppUser = {
          role: data.role,
          displayName:
            typeof data.displayName === 'string' ? data.displayName : '',
          email: typeof data.email === 'string' ? data.email : currentUser.email ?? '',
          siteIds: toStringArray(data.siteIds),
          companyIds: toStringArray(data.companyIds),
          active: data.active === true,
        }

        setAppUser(loadedUser)
        setAppUserStatus(loadedUser.active ? 'loaded' : 'inactive')
      } catch (error) {
        if (!isActive) {
          return
        }

        setAppUserError(
          error instanceof Error
            ? error.message
            : 'ユーザー情報の読み込みに失敗しました。',
        )
        setAppUserStatus('error')
      }
    }

    if (!user) {
      setAppUser(null)
      setAppUserError('')
      setAppUserStatus('idle')
      return
    }

    void loadAppUser(user)

    return () => {
      isActive = false
    }
  }, [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      appUser,
      appUserStatus,
      appUserError,
      isLoading,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password)
      },
      signOutUser: async () => {
        await signOut(auth)
      },
    }),
    [appUser, appUserError, appUserStatus, isLoading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)

  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return value
}
