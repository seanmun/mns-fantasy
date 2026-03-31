import type { VercelRequest, VercelResponse } from '@vercel/node'
import getHandler from './get.js'
import updateHandler from './update.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return getHandler(req, res)
  if (req.method === 'PUT') return updateHandler(req, res)
  return res.status(405).json({ error: 'Method not allowed' })
}
