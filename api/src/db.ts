import { RDSDataClient } from "@aws-sdk/client-rds-data";
import { drizzle as drizzleAws } from "drizzle-orm/aws-data-api/pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@agrosbo/shared";
import { env } from "./env.js";

export const hasDatabaseUrl = env.hasDatabase;

let dbInstance: any = null;

if (env.hasDatabase) {
  if (env.awsRdsSecretArn && env.awsRdsResourceArn && env.awsRdsDatabase) {
    const rdsClient = new RDSDataClient({});
    dbInstance = drizzleAws(rdsClient, {
      schema,
      secretArn: env.awsRdsSecretArn,
      resourceArn: env.awsRdsResourceArn,
      database: env.awsRdsDatabase,
    });
  } else if (env.databaseUrl) {
    const pool = new pg.Pool({ connectionString: env.databaseUrl });
    dbInstance = drizzlePg(pool, { schema });
  }
}

export const db = dbInstance;
