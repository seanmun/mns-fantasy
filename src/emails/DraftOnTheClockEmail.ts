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
  /** Their top still-available queued golfer, if they have one. */
  nextInQueue?: string | null
  /** The picks immediately before theirs, oldest first. */
  recentPicks?: Array<{
    round: number
    pickInRound: number
    teamName: string
    golferName: string
  }>
}

const SANS = `'Segoe UI', Roboto, 'Helvetica Neue', sans-serif`
const SERIF = `Georgia, 'Times New Roman', serif`
const GREEN = '#43e316'
const RULE = '#dcdcdb'
const MUTED = '#666666'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
  const team = escapeHtml(teamName)
  const draft = escapeHtml(draftName)

  const detailRow = (label: string, value: string, last = false) => `
                  <tr>
                    <td style="padding: 12px 0; border-top: 1px solid ${RULE};${last ? ` border-bottom: 1px solid ${RULE};` : ''} vertical-align: top; width: 110px;">
                      <span style="font-family: ${SANS}; font-size: 13px; font-weight: 700; color: ${MUTED}; text-transform: uppercase; letter-spacing: 1px;">${label}</span>
                    </td>
                    <td style="padding: 12px 0 12px 16px; border-top: 1px solid ${RULE};${last ? ` border-bottom: 1px solid ${RULE};` : ''} vertical-align: top;">
                      <span style="font-family: ${SANS}; font-size: 16px; font-weight: 600; color: #000000;">${value}</span>
                    </td>
                  </tr>`

  // Omitted entirely on the opening pick of a draft.
  const recentBlock =
    recentPicks.length === 0
      ? ''
      : `
            <tr>
              <td style="background-color: #ffffff; padding: 28px 48px 0 48px;" bgcolor="#ffffff" class="mobile-pad">
                <p style="margin: 0 0 16px 0; font-family: ${SANS}; font-size: 11px; font-weight: 700; letter-spacing: 3px; color: ${MUTED}; text-transform: uppercase;">Just Picked</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${recentPicks
                    .map(
                      (p) => `<tr>
                    <td style="padding: 10px 0; border-top: 1px solid ${RULE};">
                      <span style="font-family: ${SANS}; font-size: 15px; font-weight: 400; color: #000000;">${p.round}.${p.pickInRound} &middot; <strong style="font-weight: 600;">${escapeHtml(p.golferName)}</strong> &middot; <span style="color: ${MUTED};">${escapeHtml(p.teamName)}</span></span>
                    </td>
                  </tr>`
                    )
                    .join('')}
                </table>
              </td>
            </tr>`

  const closing = nextInQueue
    ? `Don't get to it and <strong style="font-weight: 600;">${escapeHtml(nextInQueue)}</strong> comes off your queue automatically.`
    : `Don't get to it and the best available golfer is picked for you. Queue a few names to decide that yourself.`

  return {
    subject: `You're on the clock — ${draftName}`,
    html: `<!DOCTYPE html>
<html lang="en" dir="ltr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=yes">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>You're on the clock — make your pick</title>

  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->

  <!--[if mso]>
  <style type="text/css">
    sup { font-size: 100% !important; }
    body { font-family: Arial, sans-serif; font-size: 16px; }
    .ExternalClass * { line-height: 100%; padding: 0px; margin: 0px; }
  </style>
  <![endif]-->

  <style type="text/css">
    html, body { margin: 0 auto; padding: 0; height: 100%; width: 100%; -webkit-text-size-adjust: none; -ms-text-size-adjust: none; }
    body { margin: 0; padding: 0; background-color: #f5f5f7; }
    table { border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; }
    #root [x-apple-data-detectors=true], a[x-apple-data-detectors=true] { color: inherit !important; text-decoration: inherit !important; }
    u + .body a { color: inherit; text-decoration: none; font-size: inherit; font-weight: inherit; line-height: inherit; }
    .body { word-wrap: normal; word-spacing: normal; }
    div[style*="margin: 16px 0"] { margin: 0 !important; }
    @media only screen and (max-width: 600px) {
      .full { width: 100% !important; float: none !important; display: block !important; margin-right: auto !important; margin-left: auto !important; padding-left: 0px !important; padding-right: 0px !important; text-align: center !important; }
      .fluid { width: 100% !important; }
      .hidemobile { display: none !important; width: 0px !important; height: 0px !important; }
      .mobile-pad { padding-left: 24px !important; padding-right: 24px !important; }
    }
  </style>
</head>
<body id="body" class="body" xml:lang="en" style="margin: 0; padding: 0; background-color: #f5f5f7;" bgcolor="#f5f5f7">

  <div id="body-fix" role="article" aria-roledescription="email" aria-label="You're on the clock — make your pick" lang="en" dir="ltr" style="font-size: medium; font-size: max(16px, 1rem);">

    <!-- Preheader -->
    <div style="display: none; max-height: 0; overflow: hidden;">
      Your turn to draft. Round ${round}, pick ${pickInRound}.
      &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847;
      &shy; &shy; &shy; &shy; &shy; &shy; &shy; &shy; &shy; &shy;
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f7;" bgcolor="#f5f5f7">
      <tr>
        <td align="center" style="padding: 32px 20px 48px 20px;">

          <!--[if (gte mso 9) | IE]>
          <table align="center" width="600" style="margin-left:auto; margin-right:auto;" role="none"><tr><td>
          <![endif]-->

          <table id="email-container" role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto;">

            <!-- HERO -->
            <tr>
              <td style="background-color: #000000; padding: 48px 48px 40px 48px;" bgcolor="#000000" class="mobile-pad">
                <p style="margin: 0 0 20px 0; font-family: ${SANS}; font-size: 28px; line-height: 1;">&#9971;</p>
                <p style="margin: 0 0 12px 0; font-family: ${SANS}; font-size: 11px; font-weight: 700; letter-spacing: 3px; color: ${GREEN}; text-transform: uppercase;">Fantasy Golf Draft</p>
                <h1 style="margin: 0 0 16px 0; font-family: ${SERIF}; font-size: 48px; font-weight: 700; line-height: 1.1; color: ${GREEN};">You're on the clock</h1>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 20px 0;">
                  <tr>
                    <td style="border-top: 1px solid ${GREEN}; font-size: 0; line-height: 0;">&nbsp;</td>
                  </tr>
                </table>
                <p style="margin: 0; font-family: ${SANS}; font-size: 18px; font-weight: 400; color: #dcdcdb; line-height: 1.4;">${draft}</p>
              </td>
            </tr>

            <!-- DETAIL CARD -->
            <tr>
              <td style="background-color: #ffffff; padding: 40px 48px 0 48px;" bgcolor="#ffffff" class="mobile-pad">
                <p style="margin: 0 0 24px 0; font-family: ${SANS}; font-size: 11px; font-weight: 700; letter-spacing: 3px; color: ${MUTED}; text-transform: uppercase;">Your Pick</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailRow('Team', team)}${detailRow('Pick', `Round ${round}, pick ${pickInRound} &middot; ${overall} of ${totalPicks}`)}${detailRow('Auto-picks', deadlineText, true)}
                </table>
              </td>
            </tr>
${recentBlock}
            <!-- CTA -->
            <tr>
              <td style="background-color: #ffffff; padding: 36px 48px 36px 48px;" bgcolor="#ffffff" class="mobile-pad">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                  <tr>
                    <td style="border-top: 1px solid ${RULE}; font-size: 0; line-height: 0;">&nbsp;</td>
                  </tr>
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background-color: #000000; border-radius: 0px;" bgcolor="#000000">
                      <a href="${lobbyUrl}" style="display: inline-block; padding: 12px 24px; color: ${GREEN}; font-family: ${SANS}; font-size: 18px; font-weight: 700; text-decoration: none; letter-spacing: 0.5px;">
                        <!--[if mso]><i style="letter-spacing: 0px;mso-font-width:-100%;mso-text-raise:17pt">&nbsp;</i><![endif]-->
                        <span style="mso-text-raise:9pt;">Make Your Pick &rarr;</span>
                        <!--[if mso]><i style="letter-spacing: 0px;mso-font-width:-100%">&nbsp;</i><![endif]-->
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CLOSING -->
            <tr>
              <td style="background-color: #f5f5f7; padding: 32px 48px 32px 48px;" bgcolor="#f5f5f7" class="mobile-pad">
                <p style="margin: 0; font-family: ${SANS}; font-size: 14px; color: #000000; line-height: 1.6;">${closing}</p>
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="background-color: #f5f5f7; padding: 0 48px 40px 48px;" bgcolor="#f5f5f7" class="mobile-pad">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                  <tr>
                    <td style="border-top: 1px solid ${RULE}; font-size: 0; line-height: 0;">&nbsp;</td>
                  </tr>
                </table>
                <p style="margin: 0 0 6px 0; font-family: ${SANS}; font-size: 13px; color: ${MUTED}; line-height: 1.6;">&copy; ${new Date().getFullYear()} MNSfantasy &middot; Powered by MoneyNeverSleeps.app</p>
                <p style="margin: 0; font-family: ${SANS}; font-size: 13px; color: ${MUTED}; line-height: 1.6;"><a href="https://mnsfantasy.com/preferences" style="color: #000000; text-decoration: underline;">Manage preferences</a></p>
              </td>
            </tr>

          </table>

          <!--[if (gte mso 9) | IE]>
          </td></tr></table>
          <![endif]-->

        </td>
      </tr>
    </table>

  </div>
</body>
</html>`,
  }
}
