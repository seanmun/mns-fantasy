import type { GameConfig } from '../lib/games-config'

interface GameLaunchEmailProps {
  game: GameConfig
  unsubscribeUrl: string
}

export function buildGameLaunchEmail({ game, unsubscribeUrl }: GameLaunchEmailProps): {
  subject: string
  html: string
} {
  return {
    subject: `New: ${game.name} is live on MNSfantasy`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #f5f5f7;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px;">${game.icon}</span>
        </div>

        <h1 style="font-size: 28px; text-align: center; margin-bottom: 8px;">
          ${game.name} is <span style="color: #00ff87;">Live!</span>
        </h1>

        <p style="color: #8e8e9a; font-size: 14px; text-align: center; line-height: 1.6; margin-bottom: 24px;">
          ${game.description}
        </p>

        <div style="background: #141419; border: 1px solid #2a2a35; border-left: 3px solid ${game.accentColor}; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="font-size: 13px; color: #8e8e9a; margin: 0;">
            <strong style="color: #f5f5f7;">Season:</strong> ${game.season}<br/>
            <strong style="color: #f5f5f7;">Starts:</strong> ${new Date(game.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}<br/>
            <strong style="color: #f5f5f7;">Ends:</strong> ${new Date(game.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${game.url}" style="display: inline-block; background: #00ff87; color: #0a0a0f; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 700;">
            Play Now &rarr;
          </a>
        </div>

        <div style="text-align: center;">
          <p style="font-size: 13px; color: #8e8e9a; line-height: 1.6;">
            <strong style="color: #f5f5f7;">How it works:</strong><br/>
            Join a league &rarr; Pick your roster &rarr; Track live stats &rarr; Win!
          </p>
        </div>

        <p style="color: #8e8e9a; font-size: 12px; margin-top: 32px; border-top: 1px solid #2a2a35; padding-top: 16px; text-align: center;">
          &copy; ${new Date().getFullYear()} MNSfantasy &middot; Powered by MoneyNeverSleeps.app<br/>
          <a href="https://mnsfantasy.com/preferences" style="color: #8e8e9a; text-decoration: underline;">Manage preferences</a>
          &middot;
          <a href="${unsubscribeUrl}" style="color: #8e8e9a; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    `,
  }
}
