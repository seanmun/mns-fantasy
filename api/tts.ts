import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyCors, requireUser } from './_draft.js'

// Custom-voice TTS for the assistant, proxied so the ElevenLabs key
// never reaches a browser. Members-only (a signed-in session is the
// price of spending the character quota), and the client treats any
// non-200 as "use the free device voice instead" — this endpoint being
// unconfigured is a feature state, not an error state.
//
// POST /api/tts { text } → audio/mpeg
//
// Env (hub only): ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID,
// optional ELEVENLABS_MODEL_ID (default eleven_flash_v2_5 — the fast,
// half-price model; chat replies don't need studio narration).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await requireUser(req)
  if (!userId) return res.status(401).json({ error: 'Sign in to continue.' })

  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID
  if (!apiKey || !voiceId) {
    return res.status(503).json({ error: 'Custom voice is not configured.' })
  }

  const text = String(req.body?.text ?? '').trim().slice(0, 1200)
  if (!text) return res.status(400).json({ error: 'Nothing to say.' })

  try {
    const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5'
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_64`,
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model_id: modelId }),
      }
    )
    if (!r.ok) {
      const detail = await r.text().catch(() => '')
      console.error('ElevenLabs TTS failed:', r.status, detail.slice(0, 300))
      return res.status(502).json({ error: 'Voice generation failed.' })
    }
    const audio = Buffer.from(await r.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(audio)
  } catch (error) {
    console.error('POST /api/tts failed:', error)
    return res.status(500).json({ error: 'Voice generation failed.' })
  }
}
