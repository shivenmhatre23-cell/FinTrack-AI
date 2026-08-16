import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { exportFinancePdf } from "@/lib/finance.functions";
import { toast } from "sonner";
import { FileText, Download, Loader2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/export")({
  head: () => ({
    meta: [
      { title: "Export PDF — FinTrack AI" },
      { name: "description", content: "Download a PDF summary of your finances." },
      { property: "og:title", content: "Export PDF — FinTrack AI" },
      { property: "og:description", content: "Download a PDF summary of your finances." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExportPage,
});

function ExportPage() {
  const exportPdf = useServerFn(exportFinancePdf);
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const { pdfBase64 } = await exportPdf();
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${pdfBase64}`;
      link.download = `fintrack-summary-${new Date().toISOString().split("T")[0]}.pdf`;
      link.click();
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Export your finances</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Download a PDF summary with your transactions, budgets, goals, and bills.
        </p>
        <button
          onClick={handleExport}
          disabled={loading}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <Download className="h-4 w-4" />
          {loading ? "Generating..." : "Download PDF"}
        </button>
      </div>
    </div>
  );
}
