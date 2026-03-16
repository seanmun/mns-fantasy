import { useAuth } from '@clerk/clerk-react'
import { useCallback } from 'react'

export function useApi() {
  const { getToken } = useAuth()

  const apiFetch = useCallback(
    async (path: string, options?: RequestInit) => {
      const token = await getToken()
      const res = await fetch(path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options?.headers,
        },
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Request failed' }))
        throw new Error(error.message || `API error: ${res.status}`)
      }

      return res.json()
    },
    [getToken]
  )

  return { apiFetch }
}
