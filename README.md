# Next.js + Resonate Integration

Durable background workflows from Next.js Server Actions — powered by Resonate.

A form submission triggers a 4-step report generation workflow that runs durably in the background. The page polls for status until the report is ready. If the server crashes mid-generation, the workflow resumes from the last checkpoint.

```
User fills form
      ↓
Server Action (app/actions.ts)
  resonate.run("report/rpt_123", generateReport, req)
      ↓
Workflow runs in background (validate → query → generate → notify)
      ↓
Client polls GET /api/status/rpt_123
      ↓
{ status: "done", result: { reportId, rowCount, fileUrl, ... } }
```

## The integration pattern

```typescript
// lib/resonate.ts — singleton (module cache ensures one instance per process)
const resonate = new Resonate();
resonate.register("generateReport", generateReport);  // explicit name survives minification
export { resonate };

// app/actions.ts — Server Action
"use server";
export async function submitReport(formData: FormData) {
  const req = { id: `rpt_${Date.now()}`, ...parseForm(formData) };
  resonate.run(`report/${req.id}`, generateReport, req).catch(console.error);
  return { id: req.id };  // client polls with this ID
}

// app/api/status/[id]/route.ts — status endpoint
export async function GET(req, { params }) {
  const handle = await resonate.get(`report/${params.id}`);
  const done = await handle.done();
  if (!done) return NextResponse.json({ status: "processing" });
  return NextResponse.json({ status: "done", result: await handle.result() });
}
```

**Compare to Trigger.dev:** Trigger.dev requires a dedicated `/trigger` directory, running `trigger.dev dev` alongside your app, and defining tasks with `task({ id, run })`. With Resonate, there's no separate process — call `resonate.run()` from any Server Action.

**Compare to Inngest:** Inngest requires mounting a `serve()` handler at `/api/inngest`, defining functions with `inngest.createFunction()`, and emitting events with `inngest.send()`. With Resonate, there's no event schema and no serve endpoint — call `resonate.run()` directly.

## Important: explicit function names

Next.js minifies function names in production builds. When registering with Resonate, always pass an explicit string name:

```typescript
// ✅ Correct — explicit name survives minification
resonate.register("generateReport", generateReport);

// ❌ Wrong — function.name is empty after minification
resonate.register(generateReport);
```

## How it works

The workflow is a generator function. Each `yield* ctx.run(step, args)` creates a durable checkpoint:

```typescript
export function* generateReport(ctx, req) {
  yield* ctx.run(validateRequest, req);              // Step 1 — checkpointed
  const rowCount = yield* ctx.run(queryDataWarehouse, req);  // Step 2 — slow DB query
  const fileUrl  = yield* ctx.run(generateFile, req, rowCount);  // Step 3
  yield* ctx.run(notifyUser, req, fileUrl);          // Step 4
  return { reportId: req.id, rowCount, fileUrl, ... };
}
```

If the server crashes after step 2, it resumes at step 3 on restart. The database query does not run again.

**Files:** 6 source files (4 app/, 2 lib/), ~170 LOC total

## Prerequisites

- Node.js 18+
- `npm install`

## Run it

### Development mode

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), select a report type, click "Generate Report", and watch the status update in real time.

**What to observe in the server terminal:**
```
[validate]  report rpt_1234 — type: sales, period: 2025-Q4
[query]     report rpt_1234 — querying sales data for 2025-Q4
[query]     report rpt_1234 — 23,847 rows retrieved
[generate]  report rpt_1234 — building sales report (23,847 rows)
[generate]  report rpt_1234 — saved to /reports/rpt_1234.csv
[notify]    report rpt_1234 — download ready at /reports/rpt_1234.csv
```

### Production mode

```bash
npm run build
npm start
```

## Project structure

```
app/
  page.tsx              — Client component with form + polling UI
  actions.ts            — Server Action: submitReport() calls resonate.run()
  layout.tsx            — Root layout
  api/status/[id]/
    route.ts            — GET /api/status/:id — polls workflow result

lib/
  resonate.ts           — Singleton Resonate instance (shared across routes/actions)
  workflow.ts           — 4-step report generation workflow
```

## Compared to Trigger.dev and Inngest

| | Trigger.dev | Inngest | Resonate |
|---|-------------|---------|----------|
| **Define workflow** | `task({ id, run })` in `/trigger/` | `inngest.createFunction()` | Generator function anywhere |
| **Trigger from action** | `tasks.trigger("id", data)` | `inngest.send({ name, data })` | `resonate.run("id", fn, args)` |
| **Separate process** | Yes — `trigger.dev dev` | No (HTTP-based) | No — runs embedded |
| **Event schema** | Optional but encouraged | Required (named events) | None — just call the function |
| **Status polling** | Via run ID from API | Via run ID from API | Via promise ID from `resonate.get()` |
| **External service** | Trigger.dev platform | Inngest cloud/self-hosted | Embedded or Resonate server |

[Try Resonate →](https://resonatehq.io) · [Resonate SDK →](https://github.com/resonatehq/resonate-sdk-ts)
