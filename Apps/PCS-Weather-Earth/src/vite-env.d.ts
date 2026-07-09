/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the deployed pcs-backend Cloudflare worker, e.g. https://pcs-backend.YOUR_ACCOUNT.workers.dev */
  readonly VITE_PCS_BACKEND_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
