/// <reference types="vite/client" />
// ↑ 画像(.svg など)を import できるようにする Vite の型。import すると、ビルド後の画像の URL が文字列で受け取れる

// import.meta.env で読める環境変数の型。値は .env.local に書く（.env.example を参照）

interface ImportMetaEnv {
  /** Google Cloud で作った OAuth クライアントID */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
