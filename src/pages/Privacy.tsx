export function Privacy() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      <h1 className="font-display text-3xl sm:text-4xl mb-2">Privacy Policy</h1>
      <p className="text-sm text-[var(--color-muted-foreground)] mb-8">Effective Date: March 15, 2026</p>

      <div className="space-y-8 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
        <p>
          MNSfantasy ("we," "us," or "our") operates a fantasy sports platform. This Privacy Policy explains how we collect, use, and protect your information.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">1. Information We Collect</h2>
          <p className="mb-2"><strong className="text-[var(--color-foreground)]">Account Information:</strong> When you sign in with Google, we collect your name, email address, and profile photo.</p>
          <p className="mb-2"><strong className="text-[var(--color-foreground)]">Game Data:</strong> We collect information about your player picks, league participation, and game preferences.</p>
          <p><strong className="text-[var(--color-foreground)]">Usage Data:</strong> We may collect information about how you interact with our platform.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>To provide and maintain our fantasy sports platform</li>
            <li>To manage your game entries and player picks</li>
            <li>To facilitate league operations and communications</li>
            <li>To send notifications about game launches and updates</li>
            <li>To process email preferences and marketing communications</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">3. Data Sharing and Disclosure</h2>
          <p className="mb-2">We do not sell your personal information. We may share information:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>With other league members (team names, rosters, and public league data)</li>
            <li>With service providers (Neon, Vercel, Clerk) who help us operate the platform</li>
            <li>When required by law or to protect our rights</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">4. Data Security</h2>
          <p>We use industry-standard security measures to protect your information. Your data is stored securely using Clerk Authentication and PostgreSQL with appropriate access controls to restrict unauthorized access.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">5. Third-Party Services</h2>
          <p className="mb-2">Our platform uses the following third-party services:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-[var(--color-foreground)]">Google Authentication:</strong> For secure sign-in</li>
            <li><strong className="text-[var(--color-foreground)]">Clerk:</strong> For authentication and user management</li>
            <li><strong className="text-[var(--color-foreground)]">Neon:</strong> For database hosting</li>
            <li><strong className="text-[var(--color-foreground)]">Vercel:</strong> For application hosting</li>
            <li><strong className="text-[var(--color-foreground)]">Resend:</strong> For transactional and marketing emails</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">6. Your Rights</h2>
          <p className="mb-2">You have the right to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Access your personal information</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and data</li>
            <li>Opt out of non-essential communications</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">7. Cookies and Tracking</h2>
          <p>We use local storage to maintain your session and store user preferences. We do not use third-party tracking or advertising cookies.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">8. Children's Privacy</h2>
          <p>Our platform is not intended for users under the age of 18. We do not knowingly collect information from children.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify users of any material changes by updating the "Effective Date" at the top of this policy.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">10. Contact Us</h2>
          <p className="mb-2">If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact us at:</p>
          <a href="mailto:sean.munley@protonmail.com" className="text-neon-green hover:underline">sean.munley@protonmail.com</a>
        </section>

        <p>By using MNSfantasy, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.</p>
      </div>
    </div>
  )
}
