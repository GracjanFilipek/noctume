import { startServer } from "./app.ts";

// Standalone server for development (`npm run dev`); the desktop app imports startServer() directly.
await startServer({ port: Number(process.env.PORT ?? 3001) });
