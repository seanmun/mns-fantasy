import type { VercelRequest, VercelResponse } from '@vercel/node'
import { clerkClient } from '@clerk/clerk-sdk-node'

const ADMIN_IDS = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '')
    if (!sessionToken) {
      return res.status(200).json({ isAdmin: false })
    }

    const session = await clerkClient.sessions.getSession(sessionToken)
    return res.status(200).json({ isAdmin: ADMIN_IDS.includes(session.userId) })
  } catch {
    return res.status(200).json({ isAdmin: false })
  }
}
