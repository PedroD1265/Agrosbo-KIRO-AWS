import { RDSDataClient } from '@aws-sdk/client-rds-data';
import { drizzle as drizzleAws } from 'drizzle-orm/aws-data-api/pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@agrosbo/shared';
import { env } from './env.js';

let dbInstance: any = null;

function getDbInstance() {
  const currentUrl = process.env.DATABASE_URL || env.databaseUrl;
  if (currentUrl) {
    if (!dbInstance || dbInstance._url !== currentUrl) {
      const pool = new pg.Pool({ connectionString: currentUrl, max: 20 });
      const d = drizzlePg(pool, { schema }) as any;
      d._url = currentUrl;
      dbInstance = d;
    }
    return dbInstance;
  }
  if (env.awsRdsSecretArn && env.awsRdsResourceArn && env.awsRdsDatabase) {
    if (!dbInstance) {
      const rdsClient = new RDSDataClient({});
      dbInstance = drizzleAws(rdsClient, {
        schema,
        secretArn: env.awsRdsSecretArn,
        resourceArn: env.awsRdsResourceArn,
        database: env.awsRdsDatabase,
      });
    }
    return dbInstance;
  }
  return null;
}

export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL || env.hasDatabase);

export const db: any = new Proxy(
  {},
  {
    get(_target, prop) {
      const instance = getDbInstance();
      if (!instance) return undefined;
      const val = instance[prop];
      return typeof val === 'function' ? val.bind(instance) : val;
    },
  },
);
