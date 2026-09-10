import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from '@clerk/clerk-react'
import { useApi } from '@/hooks/useApi'
import { AssistantChat } from '@/ui/components'

const SUGGESTIONS = [
  'What are the biggest spreads this week?',
  'Show me the standings',
  'How many picks do I have in?',
]

// The platform assistant, full-page flavor (chat-first users, desktop).
// The bar-button + sheet flavor lives in each game via mns-ui; both
// speak to the same /api/chat, which acts with the member's own
// session and nothing more.
function ChatContent() {
  const { apiFetch } = useApi()
  const { getToken } = useAuth()

  // Custom voice: null on any non-200 (unconfigured, quota, hiccup) —
  // AssistantChat then falls back to the free device voice.
  const tts = async (text: string): Promise<Blob | null> => {
    const token = await getToken()
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text }),
    })
    return res.ok ? res.blob() : null
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-4 pt-24 pb-6 flex flex-col min-h-screen">
      <div className="mb-2">
        <h1 className="font-display text-3xl tracking-wide text-[var(--color-foreground)]">
          Assistant
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Ask about your pools — lines, standings, picks. It acts as you and sees only what you can.
        </p>
      </div>
      <AssistantChat
        suggestions={SUGGESTIONS}
        tts={tts}
        send={async (messages) => {
          const result = (await apiFetch('/api/chat', {
            method: 'POST',
            body: JSON.stringify({ messages }),
          })) as { reply: string }
          return result.reply
        }}
      />
    </div>
  )
}

export function Chat() {
  return (
    <>
      <SignedIn>
        <ChatContent />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  )
}
