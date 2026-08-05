interface OnTheClockEmailProps {
  teamName: string
  draftName: string
  round: number
  pickInRound: number
  overall: number
  totalPicks: number
  lobbyUrl: string
  /** When the pick auto-fills, already formatted for the reader. */
  deadlineText: string
  /** Their top queued golfer, if they have one. */
  nextInQueue?: string | null
  /** The picks immediately before theirs, oldest first. */
  recentPicks?: Array<{
    round: number
    pickInRound: number
    teamName: string
    golferName: string
  }>
}

export function buildOnTheClockEmail({
  teamName,
  draftName,
  round,
  pickInRound,
  overall,
  totalPicks,
  lobbyUrl,
  deadlineText,
  nextInQueue,
  recentPicks = [],
}: OnTheClockEmailProps): { subject: string; html: string } {
  return {
    subject: `You're on the clock — ${draftName}`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #f5f5f7;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 40px;">&#9971;</span>
        </div>

        <h1 style="font-size: 26px; text-align: center; margin: 0 0 6px;">
          You're <span style="color: #00ff87;">on the clock</span>
        </h1>
        <p style="color: #8e8e9a; font-size: 14px; text-align: center; margin: 0 0 24px;">
          ${draftName}
        </p>

        <div style="background: #141419; border: 1px solid #2a2a35; border-left: 3px solid #00ff87; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <table style="width: 100%; font-size: 13px; color: #8e8e9a;">
            <tr>
              <td style="padding: 2px 0;">Team</td>
              <td style="padding: 2px 0; text-align: right; color: #f5f5f7; font-weight: 700;">${teamName}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0;">Pick</td>
              <td style="padding: 2px 0; text-align: right; color: #f5f5f7; font-weight: 700;">
                Round ${round}, pick ${pickInRound} &middot; ${overall} of ${totalPicks}
              </td>
            </tr>
            <tr>
              <td style="padding: 2px 0;">Auto-picks</td>
              <td style="padding: 2px 0; text-align: right; color: #ff9f0a; font-weight: 700;">${deadlineText}</td>
            </tr>
          </table>
        </div>

        ${
          recentPicks.length > 0
            ? `<div style="margin-bottom: 20px;">
          <p style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #8e8e9a; margin: 0 0 8px;">
            Just picked
          </p>
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            ${recentPicks
              .map(
                (p) => `<tr>
              <td style="padding: 5px 0; color: #8e8e9a; width: 44px; font-family: ui-monospace, Menlo, monospace;">${p.round}.${p.pickInRound}</td>
              <td style="padding: 5px 0; color: #f5f5f7; font-weight: 600;">${p.golferName}</td>
              <td style="padding: 5px 0; color: #8e8e9a; text-align: right;">${p.teamName}</td>
            </tr>`
              )
              .join('')}
          </table>
        </div>`
            : ''
        }

        <div style="text-align: center; margin-bottom: 20px;">
          <a href="${lobbyUrl}" style="display: inline-block; background: #00ff87; color: #0a0a0f; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 700;">
            Make Your Pick &rarr;
          </a>
        </div>

        <p style="color: #8e8e9a; font-size: 13px; line-height: 1.6; text-align: center; margin: 0 0 8px;">
          ${
            nextInQueue
              ? `Miss the deadline and <strong style="color: #f5f5f7;">${nextInQueue}</strong> is taken from your queue automatically.`
              : `Miss the deadline and the best available golfer is picked for you. Add golfers to your queue to control what happens if you're away.`
          }
        </p>

        <p style="color: #8e8e9a; font-size: 12px; margin-top: 28px; border-top: 1px solid #2a2a35; padding-top: 16px; text-align: center;">
          &copy; ${new Date().getFullYear()} MNSfantasy &middot; Powered by MoneyNeverSleeps.app<br/>
          <a href="https://mnsfantasy.com/preferences" style="color: #8e8e9a; text-decoration: underline;">Manage preferences</a>
        </p>
      </div>
    `,
  }
}
