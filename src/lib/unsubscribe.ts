import { createHmac } from 'crypto'

const SECRET = process.env.UNSUBSCRIBE_HMAC_SECRET!

export function generateUnsubscribeToken(userId: string): string {
  const payload = `${userId}:${Date.now()}`
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

export function verifyUnsubscribeToken(token: string): { userId: string; valid: boolean } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const [userId, ts, sig] = decoded.split(':')
    const payload = `${userId}:${ts}`
    const expected = createHmac('sha256', SECRET).update(payload).digest('hex')
    const age = Date.now() - parseInt(ts)
    const valid = sig === expected && age < 30 * 24 * 60 * 60 * 1000 // 30 days
    return { userId, valid }
  } catch {
    return { userId: '', valid: false }
  }
}
