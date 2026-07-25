/**
 * Public entrypoint for importing the Express app without starting a server.
 * Tests and the Lambda handler import this module to get the `app` instance.
 *
 * To START the server (dev/production), run server.ts directly or use
 * `npm run dev` which invokes `tsx watch src/server.ts`.
 *
 * MUST NOT import server.ts as a side-effect here — that would start
 * listening on a port whenever any module imports index.ts (including tests).
 */
export { app } from './app.js';
export { startServer } from './server.js';
