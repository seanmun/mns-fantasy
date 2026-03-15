import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { toast } from 'sonner'
import { Download, Send, Users, BarChart3, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { GAMES } from '@/lib/games-config'

interface SubscriberStats {
  total: number
  optedIn: number
  optedOut: number
  recentSignups: Array<{
    id: string
    email: string
    source: string
    createdAt: string
    globalOptIn: boolean
  }>
}

const ADMIN_IDS = (import.meta.env.VITE_ADMIN_USER_IDS || '').split(',').filter(Boolean)

export function Admin() {
  const { user } = useUser()
  const [stats, setStats] = useState<SubscriberStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedGame, setSelectedGame] = useState(GAMES[0]?.slug || '')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [confirmSend, setConfirmSend] = useState(false)

  const isAdmin = user?.id && ADMIN_IDS.includes(user.id)

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false)
      return
    }
    fetchStats()
  }, [isAdmin])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        setStats(await res.json())
      }
    } catch {
      toast.error('Failed to load admin stats')
    } finally {
      setLoading(false)
    }
  }

  const handleSendLaunchEmail = async () => {
    if (!confirmSend) {
      setConfirmSend(true)
      return
    }
    setSendingEmail(true)
    try {
      const res = await fetch('/api/admin/send-launch-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameSlug: selectedGame }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      toast.success(`Launch email sent to ${data.recipientCount} subscribers`)
    } catch {
      toast.error('Failed to send launch email')
    } finally {
      setSendingEmail(false)
      setConfirmSend(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/admin/export')
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mnsfantasy-subscribers-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to export subscribers')
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4 text-center">
        <ShieldAlert size={48} className="text-red-400 mb-4" />
        <h1 className="font-display text-3xl mb-2">Access Denied</h1>
        <p className="text-[var(--color-muted-foreground)]">You don't have permission to view this page.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-green" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <h1 className="font-display text-3xl sm:text-4xl mb-8">Admin Dashboard</h1>

      {/* Subscriber Overview */}
      <section className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={20} className="text-neon-green" />
          <h2 className="font-semibold text-lg">Subscriber Overview</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[var(--color-muted)] rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-neon-green">{stats?.total || 0}</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">Total Subscribers</p>
          </div>
          <div className="bg-[var(--color-muted)] rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-neon-green">{stats?.optedIn || 0}</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">Opted In</p>
          </div>
          <div className="bg-[var(--color-muted)] rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats?.optedOut || 0}</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">Opted Out</p>
          </div>
        </div>

        {stats?.recentSignups && stats.recentSignups.length > 0 && (
          <>
            <h3 className="text-sm font-medium mb-2">Recent Signups</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]">
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Source</th>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSignups.map((sub) => (
                    <tr key={sub.id} className="border-b border-[var(--color-border)]/50">
                      <td className="py-2 pr-4 font-mono text-xs">{sub.email}</td>
                      <td className="py-2 pr-4 text-[var(--color-muted-foreground)]">{sub.source}</td>
                      <td className="py-2 pr-4 text-[var(--color-muted-foreground)]">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2">
                        <span className={sub.globalOptIn ? 'text-neon-green' : 'text-red-400'}>
                          {sub.globalOptIn ? 'Active' : 'Opted out'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Game Launch Email */}
      <section className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Send size={20} className="text-neon-green" />
          <h2 className="font-semibold text-lg">Send Game Launch Email</h2>
        </div>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm text-[var(--color-muted-foreground)] mb-1">Select Game</label>
            <select
              value={selectedGame}
              onChange={(e) => { setSelectedGame(e.target.value); setConfirmSend(false) }}
              className="w-full px-3 py-2 bg-[var(--color-muted)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-neon-green/50"
            >
              {GAMES.map((g) => (
                <option key={g.slug} value={g.slug}>{g.name} ({g.season})</option>
              ))}
            </select>
          </div>
          {confirmSend ? (
            <div className="flex gap-2">
              <Button variant="danger" onClick={handleSendLaunchEmail} disabled={sendingEmail}>
                {sendingEmail ? 'Sending...' : 'Confirm Send'}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmSend(false)}>Cancel</Button>
            </div>
          ) : (
            <Button onClick={handleSendLaunchEmail}>
              Send Launch Email
            </Button>
          )}
        </div>
      </section>

      {/* Export */}
      <section className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={20} className="text-neon-green" />
          <h2 className="font-semibold text-lg">Data Export</h2>
        </div>
        <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
          Download a CSV of all subscribers for compliance and data requests.
        </p>
        <Button variant="secondary" onClick={handleExportCSV}>
          <Download size={14} className="mr-2" /> Export Subscribers CSV
        </Button>
      </section>
    </div>
  )
}
