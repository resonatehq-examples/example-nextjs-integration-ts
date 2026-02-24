import { Resonate } from "@resonatehq/sdk";
import { generateReport } from "./workflow";

// ---------------------------------------------------------------------------
// Singleton Resonate instance
// ---------------------------------------------------------------------------
//
// Node.js module cache ensures this is created once per process.
// The same instance is shared across all Server Actions and API routes.
//
// In development, Next.js hot-reloads the server; in production, the module
// cache is stable for the lifetime of the server process.

const resonate = new Resonate();
// Pass an explicit name — Next.js minification strips function.name at build time
resonate.register("generateReport", generateReport);

export { resonate };
