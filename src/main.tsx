import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { AppShell } from '@/components/layout/AppShell'
import { Landing } from '@/pages/Landing'
import { Preferences } from '@/pages/Preferences'
import { SignIn } from '@/pages/SignIn'
import { SignUp } from '@/pages/SignUp'
import { Dashboard } from '@/pages/Dashboard'
import { Admin } from '@/pages/Admin'
import { About } from '@/pages/About'
import { Privacy } from '@/pages/Privacy'
import { Changelog } from '@/pages/Changelog'
import { NotFound } from '@/pages/NotFound'
import './index.css'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={clerkPubKey}
      allowedRedirectOrigins={[
        'https://ncaa.mnsfantasy.com',
        'https://wncaa.mnsfantasy.com',
        'https://pga.mnsfantasy.com',
        'https://nfl.mnsfantasy.com',
        'http://localhost:5173',
        'http://localhost:5174',
      ]}
    >
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/preferences" element={<Preferences />} />
            <Route path="/sign-in/*" element={<SignIn />} />
            <Route path="/sign-up/*" element={<SignUp />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>
)
