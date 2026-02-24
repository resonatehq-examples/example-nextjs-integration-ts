"use server";

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------
//
// Server Actions run in the Node.js runtime — same process as the Resonate
// singleton in lib/resonate.ts. Calling resonate.run() from a Server Action
// starts a durable workflow that runs in the background.
//
// Compare to Trigger.dev:
//   import { tasks } from "@trigger.dev/sdk/v3";
//   export async function submitReport() {
//     const run = await tasks.trigger("generate-report", { ...data });
//     return run.id;
//   }
//
// Compare to Inngest:
//   export async function submitReport() {
//     await inngest.send({ name: "report/requested", data });
//   }
//
// With Resonate: call resonate.run() directly. No event schema.
// No separate task definition file. No trigger.dev dev server.

import { resonate } from "../lib/resonate";
import { generateReport, type ReportRequest } from "../lib/workflow";

export async function submitReport(formData: FormData): Promise<{ id: string }> {
  const type = formData.get("type") as ReportRequest["type"];
  const period = formData.get("period") as string;

  const req: ReportRequest = {
    id: `rpt_${Date.now()}`,
    type: type ?? "sales",
    period: period ?? "2025-Q4",
  };

  // Fire-and-forget: workflow runs in background.
  // The report ID is the promise ID — polling uses it for status.
  resonate.run(`report/${req.id}`, generateReport, req).catch(console.error);

  return { id: req.id };
}
