/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOW_AUTO_CHECK: string | undefined
  // add other VITE_ env vars here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
