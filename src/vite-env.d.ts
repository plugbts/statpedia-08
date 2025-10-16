/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_ENDPOINT?: string;
  readonly VITE_GRAPHQL_ENDPOINT?: string;
  readonly VITE_STORAGE_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
