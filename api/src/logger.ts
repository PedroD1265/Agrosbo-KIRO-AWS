import { createHash, randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { env } from "./env.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const ACTIVE_LEVEL: LogLevel = env.isProd ? "info" : "debug";
const ACTIVE_THRESHOLD = LEVEL_ORDER[ACTIVE_LEVEL];

const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[90m",
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};
const RESET = "\x1b[0m";

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: env.isProd ? undefined : err.stack,
    };
  }
  return { value: String(err) };
}

function emit(
  level: LogLevel,
  scope: string,
  message: string,
  fields?: Record<string, unknown>,
) {
  if (LEVEL_ORDER[level] < ACTIVE_THRESHOLD) return;

  const time = new Date().toISOString();
  const enriched: Record<string, unknown> = { ...fields };
  if (enriched.err !== undefined) {
    enriched.err = serializeError(enriched.err);
  }

  if (env.isProd) {
    const line = JSON.stringify({
      time,
      level,
      scope,
      msg: message,
      ...enriched,
    });
    if (level === "error" || level === "warn") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
    return;
  }

  const color = COLORS[level];
  const tail =
    enriched && Object.keys(enriched).length > 0
      ? " " + JSON.stringify(enriched)
      : "";
  const line = `${color}${level.toUpperCase()}${RESET} [${scope}] ${message}${tail}`;
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
  child(scope: string): Logger;
}

export function createLogger(scope: string): Logger {
  return {
    debug: (msg, fields) => emit("debug", scope, msg, fields),
    info: (msg, fields) => emit("info", scope, msg, fields),
    warn: (msg, fields) => emit("warn", scope, msg, fields),
    error: (msg, fields) => emit("error", scope, msg, fields),
    child: (childScope) => createLogger(`${scope}:${childScope}`),
  };
}

export const log = createLogger("server");

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
    log?: Logger;
  }
}

const httpLog = createLogger("http");

export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const reqId =
      (req.headers["x-request-id"] as string | undefined) ?? randomUUID();
    req.requestId = reqId;
    req.log = createLogger(`http:${reqId.slice(0, 8)}`);
    res.setHeader("X-Request-Id", reqId);

    const start = process.hrtime.bigint();

    res.on("finish", () => {
      const durMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      // Strip query string to avoid leaking tokens/PII; fall back to req.path
      // when originalUrl is not available.
      const fullPath = req.originalUrl ?? req.url ?? req.path ?? "";
      const cleanPath = fullPath.split("?")[0];
      const fields: Record<string, unknown> = {
        reqId,
        method: req.method,
        path: cleanPath,
        status: res.statusCode,
        durationMs: Math.round(durMs * 10) / 10,
      };
      const rawQuery = fullPath.includes("?")
        ? fullPath.slice(fullPath.indexOf("?") + 1)
        : "";
      if (rawQuery) fields.queryLen = rawQuery.length;

      const idemKey = req.headers["x-idempotency-key"];
      if (typeof idemKey === "string") {
        // Hash to avoid leaking caller-controlled secrets while preserving
        // ability to correlate retries.
        fields.idempotencyKeyHash = createHash("sha256")
          .update(idemKey)
          .digest("hex")
          .slice(0, 12);
      }

      const level: LogLevel =
        res.statusCode >= 500
          ? "error"
          : res.statusCode >= 400
            ? "warn"
            : "info";
      httpLog[level](`${req.method} ${fields.path} ${res.statusCode}`, fields);
    });

    next();
  };
}
