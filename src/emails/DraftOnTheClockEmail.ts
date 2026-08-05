export interface DraftPickLine {
  round: number
  pickInRound: number
  teamName: string
  golferName: string
}

interface OnTheClockEmailProps {
  teamName: string
  draftName: string
  round: number
  pickInRound: number
  overall: number
  totalPicks: number
  totalRounds: number
  lobbyUrl: string
  /** When the pick auto-fills, already formatted for the reader. */
  deadlineText: string
  /** Their top still-available queued golfer, if they have one. */
  nextInQueue?: string | null
  /** Completed picks before theirs, oldest first. */
  recentPicks?: DraftPickLine[]
  /** What the recipient has drafted so far, earliest round first. */
  myTeam?: Array<{ round: number; golferName: string }>
  /** Their queue in order, drafted names already removed. */
  myQueue?: string[]
}

const MONO = `'JetBrains Mono', 'DM Sans', Arial, monospace`
const DISPLAY = `'Bebas Neue', 'DM Sans', Verdana, sans-serif`
const GREEN = '#00ff87'
const PURPLE = '#bf5af2'
const AMBER = '#ff9f0a'
const INK = '#1c1c24'
const HAIRLINE = '#f0f0f0'

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const kicker = (text: string) =>
  `<p style="font-family: ${MONO}; font-size: 10px; font-weight: 700; color: ${PURPLE}; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 12px 0;">${text}</p>`

const line = (html: string) =>
  `<p style="font-family: ${MONO}; font-size: 13px; color: ${INK}; margin: 0 0 6px 0; line-height: 1.7;">${html}</p>`

const empty = (text: string) =>
  `<p style="font-family: ${MONO}; font-size: 13px; color: #666666; margin: 0; line-height: 1.7;">${text}</p>`

export function buildOnTheClockEmail({
  teamName,
  draftName,
  round,
  pickInRound,
  overall,
  totalPicks,
  totalRounds,
  lobbyUrl,
  deadlineText,
  nextInQueue,
  recentPicks = [],
  myTeam = [],
  myQueue = [],
}: OnTheClockEmailProps): { subject: string; html: string } {
  // Each tab's body, rendered once and reused by both the interactive
  // and the stacked fallback so the two can never drift.
  const pickedBody =
    recentPicks.length > 0
      ? recentPicks
          .map((p) =>
            line(
              `${p.round}.${p.pickInRound} &middot; <strong style="font-weight: 700;">${esc(p.golferName)}</strong> &middot; <span style="color: #666666;">${esc(p.teamName)}</span>`
            )
          )
          .join('')
      : empty(`Nothing yet — you're opening this draft.`)

  const teamBody =
    myTeam.length > 0
      ? myTeam
          .map((p) =>
            line(
              `R${p.round} &middot; <strong style="font-weight: 700;">${esc(p.golferName)}</strong>`
            )
          )
          .join('')
      : empty('No picks yet.')

  const queueBody =
    myQueue.length > 0
      ? myQueue
          .map((name, i) =>
            line(`${i + 1}. <strong style="font-weight: 700;">${esc(name)}</strong>`)
          )
          .join('')
      : empty('Your queue is empty. Add names so a missed pick still goes your way.')

  const teamLabel = `Team ${myTeam.length}/${totalRounds}`
  const queueLabel = `Queue ${myQueue.length}`

  const closing = nextInQueue
    ? `Don't get to it and <strong style="color: ${INK}; font-weight: 700;">${esc(nextInQueue)}</strong> comes off your queue automatically.`
    : `Don't get to it and the best available golfer is picked for you. Queue a few names to decide that yourself.`

  const tabLabel = (id: string, text: string) =>
    `<label for="${id}" style="flex: 1; text-align: center; padding: 14px 8px; cursor: pointer; font-family: ${MONO}; font-size: 12px; font-weight: 700; color: #ffffff; letter-spacing: 1px; text-transform: uppercase; border-bottom: 2px solid transparent; background-color: ${INK};" class="tab-label-cell">${text}</label>`

  const fallbackSection = (title: string, body: string, last = false) => `
                <tr>
                  <td style="padding: 24px 32px ${last ? '24px' : '0'} 32px;${last ? '' : ` border-bottom: 1px solid ${HAIRLINE};`}">
                    ${kicker(title)}
                    <div style="margin-bottom: ${last ? '0' : '24px'};">${body}</div>
                  </td>
                </tr>`

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
  <title>You're on the clock — ${esc(draftName)}</title>

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

    /* Interactive branch is hidden until the lightswitch proves support. */
    .kinetic { display: none; max-height: 0; overflow: hidden; }
    .fallback { display: table-row; }
    .interactive { display: none; max-height: 0; overflow: hidden; }
    input { display: none !important; max-height: 0 !important; overflow: hidden !important; }

    @media only screen and (max-width: 600px) {
      .tab-label-cell { padding: 10px 6px !important; font-size: 10px !important; }
      .pad { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>

  <!-- Lightswitch: clients that honour :checked get the tabs. -->
  <style type="text/css">
    #Kinetic:checked ~ * .fallback { display: none !important; max-height: 0 !important; overflow: hidden !important; }
    #Kinetic:checked ~ * .interactive { display: table-row !important; max-height: none !important; overflow: visible !important; }
  </style>

  <!-- Tabs -->
  <style type="text/css">
    .content-div { display: none !important; max-height: 0 !important; overflow: hidden !important; }
    #tab1:checked ~ * .content1,
    #tab2:checked ~ * .content2,
    #tab3:checked ~ * .content3 { display: block !important; max-height: none !important; overflow: visible !important; }
    #tab1:checked ~ * label[for="tab1"],
    #tab2:checked ~ * label[for="tab2"],
    #tab3:checked ~ * label[for="tab3"] { background-color: ${GREEN} !important; color: ${INK} !important; border-bottom: 2px solid ${GREEN} !important; }
  </style>
</head>
<body id="body" class="body" xml:lang="en" style="margin:0;padding:0;background-color:#f5f5f7;" bgcolor="#f5f5f7">

  <div id="body-fix" role="article" aria-roledescription="email" aria-label="You're on the clock" lang="en" dir="ltr" style="font-size:medium; font-size:max(16px, 1rem)">

    <!-- Preheader -->
    <div style="display: none; max-height: 0; overflow: hidden;">
      Round ${round}, pick ${pickInRound}. ${esc(deadlineText)}.
      &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847;
      &shy; &shy; &shy; &shy; &shy; &shy; &shy; &shy; &shy; &shy;
    </div>

    <!--[if !mso]><!-->
    <input type="checkbox" class="kinetic" name="interactive" id="Kinetic" checked style="display:none;">
    <!--<![endif]-->

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f7;" bgcolor="#f5f5f7">
      <tr>
        <td align="center" style="padding: 24px 20px 40px 20px;">

          <!--[if (gte mso 9) | IE]>
          <table align="center" width="600" style="margin-left:auto; margin-right:auto;" role="none"><tr><td>
          <![endif]-->

          <table id="email-container" role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto;">

            <!-- HERO -->
            <tr>
              <td style="padding: 0; background-color: #000000;" bgcolor="#000000">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding: 28px 32px 0 32px;" class="pad">
                      <img src="https://www.moneyneversleeps.app/icons/mns-icon.webp" alt="MNSfantasy" width="48" style="width: 48px; max-width: 48px; height: auto; display: inline-block; border: 0;">
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 32px 0 32px;" class="pad">
                      <span style="font-family: ${MONO}; font-size: 11px; font-weight: 700; color: ${GREEN}; letter-spacing: 2px; text-transform: uppercase; border: 1px solid ${GREEN}; padding: 3px 8px; border-radius: 2px;">Fantasy Golf Draft</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 32px 0 32px;" class="pad">
                      <h1 style="font-family: ${DISPLAY}; font-size: 48px; font-weight: 400; color: ${GREEN}; margin: 0; line-height: 1; letter-spacing: 1px;">You're on the clock</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 32px 0 32px;" class="pad">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr><td style="height: 1px; background-color: ${GREEN}; font-size: 0; line-height: 0;">&nbsp;</td></tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 32px 32px 32px;" class="pad">
                      <p style="font-family: ${MONO}; font-size: 16px; font-weight: 500; color: #ffffff; margin: 0; letter-spacing: 0.5px;">${esc(draftName)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- DETAIL CARD -->
            <tr>
              <td style="padding: 0; background-color: #ffffff;" bgcolor="#ffffff">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding: 24px 32px 0 32px; border-top: 3px solid ${GREEN};" class="pad">
                      ${kicker('Your Pick')}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 32px 0 32px; border-bottom: 1px solid ${HAIRLINE};" class="pad">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td width="120" style="padding-bottom: 16px; vertical-align: top;">
                            <span style="font-family: ${MONO}; font-size: 11px; font-weight: 700; color: #666666; text-transform: uppercase; letter-spacing: 1px;">Team</span>
                          </td>
                          <td style="padding-bottom: 16px; vertical-align: top;">
                            <span style="font-family: ${MONO}; font-size: 14px; font-weight: 500; color: ${INK};">${esc(teamName)}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 32px 0 32px; border-bottom: 1px solid ${HAIRLINE};" class="pad">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td width="120" style="padding-bottom: 16px; vertical-align: top;">
                            <span style="font-family: ${MONO}; font-size: 11px; font-weight: 700; color: #666666; text-transform: uppercase; letter-spacing: 1px;">Pick</span>
                          </td>
                          <td style="padding-bottom: 16px; vertical-align: top;">
                            <span style="font-family: ${MONO}; font-size: 14px; font-weight: 500; color: ${INK};">Round ${round}, pick ${pickInRound} &middot; ${overall} of ${totalPicks}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 32px 24px 32px;" class="pad">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td width="120" style="vertical-align: top;">
                            <span style="font-family: ${MONO}; font-size: 11px; font-weight: 700; color: #666666; text-transform: uppercase; letter-spacing: 1px;">Auto-picks</span>
                          </td>
                          <td style="vertical-align: top;">
                            <span style="font-family: ${MONO}; font-size: 14px; font-weight: 700; color: ${AMBER};">${esc(deadlineText)}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- TABS (interactive) -->
            <!--[if !mso]><!-->
            <tr class="interactive">
              <td style="padding: 0; background-color: #ffffff; border-top: 1px solid #e8e8e8;" bgcolor="#ffffff">
                <input type="radio" name="tabs" id="tab1" checked style="display:none;">
                <input type="radio" name="tabs" id="tab2" style="display:none;">
                <input type="radio" name="tabs" id="tab3" style="display:none;">
                <div>
                  <div style="display: flex; background-color: ${INK};">
                    ${tabLabel('tab1', 'Picked')}
                    ${tabLabel('tab2', teamLabel)}
                    ${tabLabel('tab3', queueLabel)}
                  </div>
                  <div class="content-div content1" style="padding: 24px 32px;">${pickedBody}</div>
                  <div class="content-div content2" style="padding: 24px 32px;">${teamBody}</div>
                  <div class="content-div content3" style="padding: 24px 32px;">${queueBody}</div>
                </div>
              </td>
            </tr>
            <!--<![endif]-->

            <!-- TABS (stacked fallback) -->
            <tr class="fallback">
              <td style="padding: 0; background-color: #ffffff; border-top: 1px solid #e8e8e8;" bgcolor="#ffffff">
                <table width="100%" role="presentation" cellpadding="0" cellspacing="0" border="0">${fallbackSection('Picked', pickedBody)}${fallbackSection(`Team (${myTeam.length} of ${totalRounds})`, teamBody)}${fallbackSection(`Queue (${myQueue.length})`, queueBody, true)}
                </table>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td style="padding: 32px; background-color: #ffffff; text-align: center; border-top: 1px solid #e8e8e8;" bgcolor="#ffffff" class="pad">
                <a href="${lobbyUrl}" style="display: inline-block; padding: 14px 28px; background-color: ${GREEN}; color: ${INK}; font-family: ${MONO}; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 2px; letter-spacing: 1px; text-transform: uppercase;"><!--[if mso]><i style="letter-spacing: 22px;mso-font-width:-100%;mso-text-raise:30pt">&nbsp;</i><![endif]--><span style="mso-text-raise:15pt;">Make Your Pick &rarr;</span><!--[if mso]><i style="letter-spacing: 22px;mso-font-width:-100%">&nbsp;</i><![endif]--></a>
              </td>
            </tr>

            <!-- CLOSING -->
            <tr>
              <td style="padding: 0 32px 32px 32px; background-color: #ffffff;" bgcolor="#ffffff" class="pad">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding: 16px 0 0 0; border-top: 1px solid ${HAIRLINE};">
                      <p style="font-family: ${MONO}; font-size: 13px; color: #666666; margin: 0; line-height: 1.6;">${closing}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="padding: 24px 32px; background-color: ${INK}; border-top: 3px solid ${GREEN};" bgcolor="${INK}" class="pad">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="text-align: center; padding-bottom: 12px;">
                      <p style="font-family: ${MONO}; font-size: 12px; color: ${GREEN}; margin: 0; letter-spacing: 0.5px;">&copy; ${new Date().getFullYear()} MNSfantasy &middot; Powered by MoneyNeverSleeps.app</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding-bottom: 14px;">
                      <a href="https://mnsfantasy.com/preferences" style="font-family: ${MONO}; font-size: 11px; color: ${GREEN}; text-decoration: underline; letter-spacing: 1px;">Manage preferences</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; border-top: 1px solid #2e2e3a; padding-top: 14px;">
                      <p style="font-family: ${MONO}; font-size: 10px; color: #8e8e9a; margin: 0; letter-spacing: 1px;">Powered by <a href="https://kinetic.email/" style="color: #8e8e9a; text-decoration: underline;">KINETIC.email</a></p>
                    </td>
                  </tr>
                </table>
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
