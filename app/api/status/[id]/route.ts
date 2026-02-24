import { NextResponse } from "next/server";
import { resonate } from "../../../../lib/resonate";
import type { ReportResult } from "../../../../lib/workflow";

// ---------------------------------------------------------------------------
// GET /api/status/:id
// ---------------------------------------------------------------------------
// Polls for the workflow result. The client polls this until status === "done".
//
// The promise ID is `report/${id}`. resonate.get() finds the existing promise
// and checks whether it has completed.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const handle = await resonate.get(`report/${id}`);
    const done = await handle.done();

    if (!done) {
      return NextResponse.json({ status: "processing" });
    }

    const result = (await handle.result()) as ReportResult;
    return NextResponse.json({ status: "done", result });
  } catch {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
}
