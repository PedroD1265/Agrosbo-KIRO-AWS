import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import type { Server } from "node:http";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

export async function setupViteDev(app: Express, httpServer: Server) {
  const vite: ViteDevServer = await createViteServer({
    configFile: path.resolve(projectRoot, "web", "vite.config.ts"),
    root: path.resolve(projectRoot, "web"),
    server: {
      middlewareMode: true,
      hmr: { server: httpServer },
      allowedHosts: true,
    },
    appType: "spa",
  });

  app.use(vite.middlewares);

  app.use(async (req, res, next) => {
    try {
      const url = req.originalUrl;
      const indexPath = path.resolve(projectRoot, "web", "index.html");
      const fs = await import("node:fs/promises");
      let html = await fs.readFile(indexPath, "utf-8");
      html = await vite.transformIndexHtml(url, html);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      console.error("Vite HTML serve error:", e);
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  return vite;
}

export function setupStatic(app: Express) {
  const distDir = path.resolve(projectRoot, "web", "dist", "public");
  app.use(express.static(distDir));
  app.use((_req, res) => {
    res.sendFile(path.resolve(distDir, "index.html"));
  });
}
