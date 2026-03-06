import { execSync } from 'node:child_process';

function withStagingEnv(baseEnv: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    ...baseEnv,
    DATABASE_URL: baseEnv.DATABASE_URL ?? baseEnv.STAGING_DATABASE_URL ?? baseEnv.E2E_DATABASE_URL,
    DIRECT_URL: baseEnv.DIRECT_URL ?? baseEnv.STAGING_DIRECT_URL ?? baseEnv.E2E_DIRECT_URL,
    SESSION_SECRET: baseEnv.SESSION_SECRET ?? baseEnv.STAGING_SESSION_SECRET ?? baseEnv.E2E_SESSION_SECRET,
    E2E_ADMIN_LOGIN: baseEnv.E2E_ADMIN_LOGIN ?? baseEnv.STAGING_E2E_ADMIN_LOGIN,
    E2E_ADMIN_PASSWORD: baseEnv.E2E_ADMIN_PASSWORD ?? baseEnv.STAGING_E2E_ADMIN_PASSWORD,
    E2E_ADMIN_NEW_PASSWORD: baseEnv.E2E_ADMIN_NEW_PASSWORD ?? baseEnv.STAGING_E2E_ADMIN_NEW_PASSWORD,
  };
}

async function globalSetup(): Promise<void> {
  const env = withStagingEnv(process.env);

  execSync('npm run testdb:reset:staging', {
    stdio: 'inherit',
    env,
  });
}

export default globalSetup;
