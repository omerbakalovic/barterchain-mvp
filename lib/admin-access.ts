export const ADMIN_SIGNALS_ACCESS_KEY_ENV = "ADMIN_SIGNALS_ACCESS_KEY";

export function canAccessAdminSignals(input: {
  key?: string | null;
  env?: NodeJS.ProcessEnv;
}) {
  const env = input.env ?? process.env;
  const configuredKey = env[ADMIN_SIGNALS_ACCESS_KEY_ENV]?.trim();

  if (env.NODE_ENV !== "production") {
    return true;
  }

  if (!configuredKey) {
    return false;
  }

  return input.key === configuredKey;
}
