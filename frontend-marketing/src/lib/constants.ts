function requirePublicEnv(
  value: string | undefined,
  name: string,
  fallback: string,
): string {
  if (value && value.trim()) return value.trim();

  // Prevent accidental production deploys with localhost URLs baked into the build output.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }

  return fallback;
}

// NOTE: Use direct `process.env.NEXT_PUBLIC_*` access so Next can inline these
// values in client bundles. Dynamic key access (`process.env[name]`) will not.
export const APP_URL = requirePublicEnv(
  process.env.NEXT_PUBLIC_APP_URL,
  'NEXT_PUBLIC_APP_URL',
  'http://localhost:5175',
);
export const API_URL = requirePublicEnv(
  process.env.NEXT_PUBLIC_API_URL,
  'NEXT_PUBLIC_API_URL',
  'http://localhost:8001',
);
