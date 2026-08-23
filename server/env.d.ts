interface Env {
  SESSION_SECRET: string;
  ADMIN_API_KEY?: string;
  RESEND_API_KEY?: string;
  GOOGLE_MAPS_API_KEY?: string;
  MAPS_KEY_ALLOWED_HOSTS?: string;
}

declare namespace Cloudflare {
  interface Env {
    SESSION_SECRET: string;
    ADMIN_API_KEY?: string;
    RESEND_API_KEY?: string;
    GOOGLE_MAPS_API_KEY?: string;
    MAPS_KEY_ALLOWED_HOSTS?: string;
  }
}

declare namespace NodeJS {
  interface ProcessEnv {
    SESSION_SECRET?: string;
    ADMIN_API_KEY?: string;
    RESEND_API_KEY?: string;
    GOOGLE_MAPS_API_KEY?: string;
    MAPS_KEY_ALLOWED_HOSTS?: string;
  }
}
