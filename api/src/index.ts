import express, { Router } from "express";
import path from "node:path";
import { createServer } from "node:http";
import { env, parsePort } from "./env.js";
import { log, requestLogger } from "./logger.js";
import { registerRoutes } from "./routes.js";
import { setupViteDev, setupStatic } from "./vite.js";
import { seedDatabase } from "./dbStorage.js";
import { initIdempotency } from "./idempotency.js";
import { UPLOADS_DIR } from "./attachments.js";
import { attachUser, initRevokedSessions } from "./auth.js";

export const app = express();
app.use(express.json({ limit: "15mb" }));
app.use("/api", requestLogger());
app.use("/api", attachUser());

// Global auth guard. When AUTH_ENFORCEMENT=off, this no-ops. When 'on',
// only the whitelisted public paths bypass; everything else needs req.user.
const AUTH_PUBLIC = new Set([
  "/health",
  "/crops",
  "/auth/login",
  "/auth/me",
  "/auth/logout",
]);
app.use("/api", (req, res, next) => {
  if (env.authEnforcement === "off") return next();
  if (AUTH_PUBLIC.has(req.path)) return next();
  if (!req.user) return res.status(401).json({ error: "No autenticado" });
  next();
});
app.use("/uploads", express.static(path.resolve(UPLOADS_DIR), {
  index: false,
  maxAge: "1h",
  setHeaders(res) { res.setHeader("X-Content-Type-Options", "nosniff"); },
}));

const apiRouter = Router();
registerRoutes(apiRouter);
app.use("/api", apiRouter);

const httpServer = createServer(app);

function resolvePort(): number {
  // Parse port from CLI flags or fallback to env.port.
  // All sources go through parsePort to enforce integer 1..65535.
  const argv = process.argv;
  const flagIdx = argv.findIndex((a) => a === "--port" || a === "-p");
  if (flagIdx !== -1 && argv[flagIdx + 1]) {
    return parsePort(argv[flagIdx + 1], env.port);
  }
  for (const a of argv) {
    if (a.startsWith("--port=")) {
      return parsePort(a.slice("--port=".length), env.port);
    }
  }
  return env.port;
}
const PORT = resolvePort();

async function start() {
  if (env.hasDatabase) {
    try {
      await seedDatabase();
      log.info("database seed verified");
    } catch (err) {
      log.error("seed failed", { err });
    }
    try {
      await initIdempotency();
      log.info("idempotency cache initialized");
    } catch (err) {
      log.error("FATAL: idempotency init failed", { err });
      log.error("refusing to start — protected writes would all fail with 503");
      process.exit(1);
    }
    try {
      await initRevokedSessions();
    } catch (err) {
      log.warn("revoked sessions init failed — blocklist empty after restart", { err });
    }
  } else {
    log.info("skipping DB seed (in-memory mode)");
  }

  if (env.isProd) {
    setupStatic(app);
  } else {
    await setupViteDev(app, httpServer);
  }

  if (env.authEnforcement === "off") {
    log.warn(
      "AUTH_ENFORCEMENT=off — API is open access (set to 'on' in production)",
    );
  }

  if (!process.env.LAMBDA_TASK_ROOT) {
    httpServer.listen(PORT, "0.0.0.0", () => {
      log.info(`listening on http://0.0.0.0:${PORT}`, {
        port: PORT,
        env: env.nodeEnv,
        storage: env.hasDatabase ? "postgres" : "memory",
        auth: env.authEnforcement,
      });
    });
  } else {
    log.info("Running in Lambda mode (listen skipped)");
  }
}

if (!process.env.LAMBDA_TASK_ROOT) {
  start().catch((err) => {
    log.error("fatal startup error", { err });
    process.exit(1);
  });
}
