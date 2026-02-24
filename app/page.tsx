"use client";

import { useState, useTransition } from "react";
import { submitReport } from "./actions";

// ---------------------------------------------------------------------------
// Report Request UI
// ---------------------------------------------------------------------------
// User fills out the form → Server Action starts a durable workflow →
// client polls /api/status/:id until the report is ready.
//
// The durable workflow survives server restarts. If the server crashes while
// generating a report, it resumes from the last checkpoint on restart.
// No report request is lost.

interface ReportResult {
  reportId: string;
  type: string;
  period: string;
  rowCount: number;
  fileUrl: string;
  completedAt: string;
}

type Status = "idle" | "processing" | "done" | "error";

export default function HomePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [reportId, setReportId] = useState<string | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  async function poll(id: string) {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const res = await fetch(`/api/status/${id}`);
      const data = (await res.json()) as { status: string; result?: ReportResult };
      if (data.status === "done" && data.result) {
        setResult(data.result);
        setStatus("done");
        return;
      }
    }
    setStatus("error");
  }

  function handleSubmit(formData: FormData) {
    setStatus("processing");
    setResult(null);

    startTransition(async () => {
      const { id } = await submitReport(formData);
      setReportId(id);
      await poll(id);
    });
  }

  return (
    <main style={{ fontFamily: "monospace", maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>
      <h1 style={{ marginBottom: 4 }}>Report Generator</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Powered by Resonate — durable background workflows from Server Actions
      </p>

      <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          Report type:
          <select name="type" style={{ marginLeft: 8, fontFamily: "monospace" }}>
            <option value="sales">Sales</option>
            <option value="inventory">Inventory</option>
            <option value="analytics">Analytics</option>
          </select>
        </label>

        <label>
          Period:
          <select name="period" style={{ marginLeft: 8, fontFamily: "monospace" }}>
            <option value="2025-Q4">2025 Q4</option>
            <option value="2025-Q3">2025 Q3</option>
            <option value="2025-H2">2025 H2</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={isPending || status === "processing"}
          style={{
            padding: "8px 16px",
            cursor: isPending ? "not-allowed" : "pointer",
            fontFamily: "monospace",
            width: "fit-content",
          }}
        >
          {status === "processing" ? "Generating..." : "Generate Report"}
        </button>
      </form>

      {status === "processing" && reportId && (
        <div style={{ marginTop: 24, padding: 16, background: "#f5f5f5" }}>
          <p>⏳ Workflow running in background...</p>
          <p style={{ color: "#888", fontSize: 12 }}>
            Promise ID: report/{reportId}
          </p>
          <p style={{ color: "#888", fontSize: 12 }}>
            Polling /api/status/{reportId}
          </p>
        </div>
      )}

      {status === "done" && result && (
        <div style={{ marginTop: 24, padding: 16, background: "#f0fff0", border: "1px solid #cfc" }}>
          <p>✅ Report ready!</p>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
            <tbody>
              {Object.entries(result).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: "4px 8px", color: "#666" }}>{k}</td>
                  <td style={{ padding: "4px 8px" }}>{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {status === "error" && (
        <div style={{ marginTop: 24, padding: 16, background: "#fff0f0" }}>
          <p>❌ Report generation timed out. The workflow may still be running.</p>
        </div>
      )}
    </main>
  );
}
