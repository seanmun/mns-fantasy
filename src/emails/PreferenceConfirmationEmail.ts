interface PreferenceEmailProps {
  email: string
  globalOptIn: boolean
  prefNewGames: boolean
  prefLeagueInvites: boolean
  prefPlatformNews: boolean
  prefMnsInsights: boolean
  unsubscribeUrl: string
}

export function buildPreferenceConfirmationEmail(props: PreferenceEmailProps): string {
  const pref = (label: string, enabled: boolean) =>
    `<tr><td style="padding: 4px 0; color: #8e8e9a; font-size: 14px;">${label}</td><td style="padding: 4px 0; text-align: right; font-size: 14px; color: ${enabled ? '#00ff87' : '#ff2d55'};">${enabled ? 'ON' : 'OFF'}</td></tr>`

  return `
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #f5f5f7;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">Preferences Updated</h1>
      <p style="color: #8e8e9a; font-size: 14px; margin-bottom: 24px;">Your MNSfantasy email preferences have been saved.</p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="border-bottom: 1px solid #2a2a35;">
            <th style="text-align: left; padding-bottom: 8px; font-size: 12px; color: #8e8e9a; text-transform: uppercase; letter-spacing: 0.05em;">Setting</th>
            <th style="text-align: right; padding-bottom: 8px; font-size: 12px; color: #8e8e9a; text-transform: uppercase; letter-spacing: 0.05em;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${pref('All MNSfantasy emails', props.globalOptIn)}
          ${pref('New game announcements', props.prefNewGames)}
          ${pref('League invites', props.prefLeagueInvites)}
          ${pref('Platform news', props.prefPlatformNews)}
          ${pref('MNS insights', props.prefMnsInsights)}
        </tbody>
      </table>

      <a href="https://mnsfantasy.com/preferences" style="display: inline-block; background: #00ff87; color: #0a0a0f; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
        Manage Preferences
      </a>

      <p style="color: #8e8e9a; font-size: 12px; margin-top: 32px; border-top: 1px solid #2a2a35; padding-top: 16px;">
        &copy; ${new Date().getFullYear()} MNSfantasy &middot; Powered by MoneyNeverSleeps.app<br/>
        <a href="${props.unsubscribeUrl}" style="color: #8e8e9a; text-decoration: underline;">Unsubscribe from all emails</a>
      </p>
    </div>
  `
}
