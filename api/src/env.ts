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
  let u: URL;
  try {
    u = new URL(v);
    if (!u.protocol.startsWith('postgres')) {
      throw new Error(`unsupported protocol '${u.protocol}'`);
    }
    if (!u.hostname) throw new Error('missing hostname');
  } catch (err) {
    throw new Error(
      `[env] DATABASE_URL is set but invalid: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  // Return the canonical URL string via URL.toString() to preserve encoded
  // username/password (e.g. special chars like @, %, #) without manual interpolation.
  return u.toString();
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
  awsRegion: string;
  // Provider configuration
  authProvider: 'local-session' | 'cognito-jwt';
  attachmentsStorageDriver: 'local' | 's3';
  documentExtractionProvider: 'none' | 'textract' | 'azure';
  // Cognito (required when authProvider=cognito-jwt)
  cognitoUserPoolId: string | null;
  cognitoAppClientId: string | null;
  cognitoIssuer: string | null;
  // S3 attachments (required when attachmentsStorageDriver=s3)
  attachmentsS3Bucket: string | null;
  // Document extraction
  textractEnabled: boolean;
  azureDocIntelligenceEndpoint: string | null;
  azureDocIntelligenceKey: string | null;
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
  const awsRegion = process.env.AWS_REGION || 'us-east-1';

  // --- Provider configuration ---
  const authProvider = parseAuthProvider(process.env.APP_AUTH_PROVIDER, nodeEnv);
  const attachmentsStorageDriver = parseStorageDriver(
    process.env.ATTACHMENTS_STORAGE_DRIVER,
    nodeEnv,
  );
  const documentExtractionProvider = parseDocExtraction(process.env.DOCUMENT_EXTRACTION_PROVIDER);

  // Cognito variables (required when authProvider=cognito-jwt)
  const cognitoUserPoolId = process.env.COGNITO_USER_POOL_ID || null;
  const cognitoAppClientId = process.env.COGNITO_APP_CLIENT_ID || null;
  const cognitoIssuer = process.env.COGNITO_ISSUER || null;

  // S3 attachments
  const attachmentsS3Bucket = process.env.ATTACHMENTS_S3_BUCKET || null;

  // Document extraction
  const textractEnabled = parseBoolFlag(process.env.TEXTRACT_ENABLED);
  const azureDocIntelligenceEndpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || null;
  const azureDocIntelligenceKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY || null;

  // --- Fail-closed production validation ---
  const hasAwsRds = Boolean(awsRdsSecretArn && awsRdsResourceArn && awsRdsDatabase);

  if (nodeEnv === 'production' && !databaseUrl && !hasAwsRds && !memFlag) {
    throw new Error(
      '[env] DATABASE_URL is required in production. Set USE_MEM_STORAGE=1 to override (data will not persist).',
    );
  }

  if (nodeEnv === 'production' && authProvider === 'local-session') {
    throw new Error(
      '[env] APP_AUTH_PROVIDER=local-session is not allowed in production. Use cognito-jwt.',
    );
  }

  if (nodeEnv === 'production' && attachmentsStorageDriver === 'local') {
    throw new Error('[env] ATTACHMENTS_STORAGE_DRIVER=local is not allowed in production. Use s3.');
  }

  if (authProvider === 'cognito-jwt' && (!cognitoUserPoolId || !cognitoAppClientId)) {
    throw new Error(
      '[env] APP_AUTH_PROVIDER=cognito-jwt requires COGNITO_USER_POOL_ID and COGNITO_APP_CLIENT_ID.',
    );
  }

  if (attachmentsStorageDriver === 's3' && !attachmentsS3Bucket) {
    throw new Error('[env] ATTACHMENTS_STORAGE_DRIVER=s3 requires ATTACHMENTS_S3_BUCKET.');
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
    awsRegion,
    authProvider,
    attachmentsStorageDriver,
    documentExtractionProvider,
    cognitoUserPoolId,
    cognitoAppClientId,
    cognitoIssuer,
    attachmentsS3Bucket,
    textractEnabled,
    azureDocIntelligenceEndpoint,
    azureDocIntelligenceKey,
  };
}

function parseAuthProvider(
  raw: string | undefined,
  nodeEnv: 'development' | 'production' | 'test',
): 'local-session' | 'cognito-jwt' {
  if (!raw || raw.trim() === '') return 'local-session';
  const v = raw.trim().toLowerCase();
  if (v === 'local-session' || v === 'local') return 'local-session';
  if (v === 'cognito-jwt' || v === 'cognito') return 'cognito-jwt';
  throw new Error(`[env] APP_AUTH_PROVIDER must be 'local-session' or 'cognito-jwt' (got: ${raw})`);
}

function parseStorageDriver(
  raw: string | undefined,
  nodeEnv: 'development' | 'production' | 'test',
): 'local' | 's3' {
  if (!raw || raw.trim() === '') return 'local';
  const v = raw.trim().toLowerCase();
  if (v === 'local') return 'local';
  if (v === 's3') return 's3';
  throw new Error(`[env] ATTACHMENTS_STORAGE_DRIVER must be 'local' or 's3' (got: ${raw})`);
}

function parseDocExtraction(raw: string | undefined): 'none' | 'textract' | 'azure' {
  if (!raw || raw.trim() === '') return 'none';
  const v = raw.trim().toLowerCase();
  if (v === 'none') return 'none';
  if (v === 'textract') return 'textract';
  if (v === 'azure' || v === 'azure-di') return 'azure';
  throw new Error(
    `[env] DOCUMENT_EXTRACTION_PROVIDER must be 'none', 'textract', or 'azure' (got: ${raw})`,
  );
}

export const env: AppEnv = loadEnv();
