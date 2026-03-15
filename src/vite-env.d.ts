/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string
  readonly VITE_APP_URL: string
  readonly VITE_ADMIN_USER_IDS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
