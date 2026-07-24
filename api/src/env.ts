import { randomBytes } from 'node:crypto';

function parseBoolFlag(raw: string | undefined): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export function parsePort(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const v = Number(raw);
  if (!Number.isInteger(v) || v <= 0 || v > 65535) {
    throw new Error(`[env] port must be an integer between 1 and 65535 (got: ${raw})`);
  }
  return v;
}

function parseNodeEnv(raw: string | undefined): 'development' | 'production' | 'test' {
  const v = (raw ?? 'development').trim().toLowerCase();
  if (v === 'production' || v === 'prod') return 'production';
  if (v === 'test') return 'test';
  if (v === 'development' || v === 'dev' || v === '') return 'development';
  throw new Error(`[env] NODE_ENV must be one of: development | production | test (got: ${raw})`);
}

function parseDatabaseUrl(raw: string | undefined): string | null {
  if (!raw || raw.trim() === '') return null;
  const v = raw.trim();
  try {
    const u = new URL(v);
    if (!u.protocol.startsWith('postgres')) {
      throw new Error(`unsupported protocol '${u.protocol}'`);
    }
    if (!u.hostname) throw new Error('missing hostname');
  } catch (err) {
    throw new Error(
      `[env] DATABASE_URL is set but invalid: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return v;
}

function parseAuthEnforcement(
  raw: string | undefined,
  nodeEnv: 'development' | 'production' | 'test',
): 'on' | 'off' {
  if (raw === undefined || raw.trim() === '') {
    // Default: off in dev/test (no breaking change), off in prod too unless
    // operator opts in explicitly. We surface a warning at startup in prod.
    return 'off';
  }
  const v = raw.trim().toLowerCase();
  if (v === 'on' || v === '1' || v === 'true' || v === 'yes') return 'on';
  if (v === 'off' || v === '0' || v === 'false' || v === 'no') return 'off';
  throw new Error(`[env] AUTH_ENFORCEMENT must be 'on' or 'off' (got: ${raw})`);
}

function parseSessionSecret(raw: string | undefined, enforcement: 'on' | 'off'): string {
  if (raw && raw.trim().length >= 16) return raw.trim();
  if (enforcement === 'on') {
    throw new Error(
      '[env] AUTH_ENFORCEMENT=on requires SESSION_SECRET (>=16 chars). ' +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"",
    );
  }
  // Dev fallback: ephemeral secret. Sessions die on restart (acceptable when
  // enforcement is off and the app is open-access for development).
  return randomBytes(48).toString('hex');
}

export interface AppEnv {
  nodeEnv: 'development' | 'production' | 'test';
  isProd: boolean;
  isDev: boolean;
  isTest: boolean;
  port: number;
  databaseUrl: string | null;
  useMemStorage: boolean;
  hasDatabase: boolean;
  authEnforcement: 'on' | 'off';
  sessionSecret: string;
  awsRdsSecretArn: string | null;
  awsRdsResourceArn: string | null;
  awsRdsDatabase: string | null;
}

function loadEnv(): AppEnv {
  const nodeEnv = parseNodeEnv(process.env.NODE_ENV);
  const port = parsePort(process.env.PORT, 5000);
  const databaseUrl = parseDatabaseUrl(process.env.DATABASE_URL);
  const memFlag = parseBoolFlag(process.env.USE_MEM_STORAGE);
  const authEnforcement = parseAuthEnforcement(process.env.AUTH_ENFORCEMENT, nodeEnv);
  const sessionSecret = parseSessionSecret(process.env.SESSION_SECRET, authEnforcement);

  const awsRdsSecretArn = process.env.AWS_RDS_SECRET_ARN || null;
  const awsRdsResourceArn = process.env.AWS_RDS_RESOURCE_ARN || null;
  const awsRdsDatabase = process.env.AWS_RDS_DATABASE || null;

  // In prod, refuse to start in mem-storage mode unless explicitly opted in.
  const hasAwsRds = Boolean(awsRdsSecretArn && awsRdsResourceArn && awsRdsDatabase);

  if (nodeEnv === 'production' && !databaseUrl && !hasAwsRds && !memFlag) {
    throw new Error(
      '[env] DATABASE_URL is required in production. Set USE_MEM_STORAGE=1 to override (data will not persist).',
    );
  }

  const useMemStorage = memFlag || (!databaseUrl && !hasAwsRds);
  const hasDatabase = !useMemStorage;

  return {
    nodeEnv,
    isProd: nodeEnv === 'production',
    isDev: nodeEnv === 'development',
    isTest: nodeEnv === 'test',
    port,
    databaseUrl,
    useMemStorage,
    hasDatabase,
    authEnforcement,
    sessionSecret,
    awsRdsSecretArn,
    awsRdsResourceArn,
    awsRdsDatabase,
  };
}

export const env: AppEnv = loadEnv();
