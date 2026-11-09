// import.meta.env で読める環境変数の型。値は .env.local に書く（.env.example を参照）

interface ImportMetaEnv {
  /** Google Cloud で作った OAuth クライアントID */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
