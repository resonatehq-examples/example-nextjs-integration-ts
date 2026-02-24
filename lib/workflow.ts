import type { Context } from "@resonatehq/sdk";

// ---------------------------------------------------------------------------
// Report Generation Workflow
// ---------------------------------------------------------------------------
//
// A multi-step background job triggered from a Next.js Server Action.
// Each step is checkpointed — crashes don't restart from zero.
//
// This is the same generator pattern as every other Resonate example.
// No framework-specific wrappers. The same code works in Express, Next.js,
// Fastify, Lambda, or a plain Node.js script.

export interface ReportRequest {
  id: string;
  type: "sales" | "inventory" | "analytics";
  period: string;
}

export interface ReportResult {
  reportId: string;
  type: string;
  period: string;
  rowCount: number;
  fileUrl: string;
  completedAt: string;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Step 1: Validate request and check permissions
async function validateRequest(_ctx: unknown, req: ReportRequest): Promise<boolean> {
  console.log(`[validate]  report ${req.id} — type: ${req.type}, period: ${req.period}`);
  await sleep(300);
  return true;
}

// Step 2: Query the data warehouse
async function queryDataWarehouse(_ctx: unknown, req: ReportRequest): Promise<number> {
  console.log(`[query]     report ${req.id} — querying ${req.type} data for ${req.period}`);
  await sleep(1200); // simulates a slow DB query
  const rowCount = Math.floor(Math.random() * 50000) + 1000;
  console.log(`[query]     report ${req.id} — ${rowCount.toLocaleString()} rows retrieved`);
  return rowCount;
}

// Step 3: Generate the report file
async function generateFile(
  _ctx: unknown,
  req: ReportRequest,
  rowCount: number,
): Promise<string> {
  console.log(`[generate]  report ${req.id} — building ${req.type} report (${rowCount.toLocaleString()} rows)`);
  await sleep(800);
  const fileUrl = `/reports/${req.id}.csv`;
  console.log(`[generate]  report ${req.id} — saved to ${fileUrl}`);
  return fileUrl;
}

// Step 4: Send notification
async function notifyUser(_ctx: unknown, req: ReportRequest, fileUrl: string): Promise<void> {
  console.log(`[notify]    report ${req.id} — download ready at ${fileUrl}`);
  await sleep(200);
}

// ---------------------------------------------------------------------------
// The workflow — registered once, called from any Next.js route/action
// ---------------------------------------------------------------------------

export function* generateReport(
  ctx: Context,
  req: ReportRequest,
): Generator<any, ReportResult, any> {
  yield* ctx.run(validateRequest, req);

  const rowCount = yield* ctx.run(queryDataWarehouse, req);

  const fileUrl = yield* ctx.run(generateFile, req, rowCount);

  yield* ctx.run(notifyUser, req, fileUrl);

  return {
    reportId: req.id,
    type: req.type,
    period: req.period,
    rowCount,
    fileUrl,
    completedAt: new Date().toISOString(),
  };
}
