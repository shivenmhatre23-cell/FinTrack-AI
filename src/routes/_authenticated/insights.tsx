import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTransactions, getAiInsights } from "@/lib/finance.functions";
import { Sparkles, Lightbulb, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";

const transactionsQueryOptions = queryOptions({
  queryKey: ["insights-transactions"],
  queryFn: () => getTransactions(),
});

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "AI Insights — FinTrack AI" },
      { name: "description", content: "AI-powered spending insights and personalized finance tips." },
      { property: "og:title", content: "AI Insights — FinTrack AI" },
      { property: "og:description", content: "AI-powered spending insights and personalized finance tips." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(transactionsQueryOptions),
  component: InsightsPage,
});

function InsightsPage() {
  const { data: transactions } = useSuspenseQuery(transactionsQueryOptions);
  const getInsights = useServerFn(getAiInsights);
  const [insights, setInsights] = useState<{ title: string; description: string; action?: string; amount?: number }[]>([]);
  const [loading, setLoading] = useState(false);

  async function generateInsights() {
    setLoading(true);
    try {
      const result = await getInsights({
        data: {
          transactions: transactions.map((t) => ({
            amount: Number(t.amount),
            type: t.type as "income" | "expense",
            category: t.category,
            merchant: t.merchant,
            date: t.date,
          })),
        },
      });
      setInsights(result.insights);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-8 py-4 backdrop-blur-xl">
        <div>
          <h1 className="text-lg font-semibold text-foreground">AI Insights</h1>
          <p className="text-xs text-muted-foreground">Smart analysis of your spending habits</p>
        </div>
      </header>

      <main className="p-8">
        <div className="mb-8 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Generate AI insights</h2>
              <p className="text-sm text-muted-foreground">Analyze your recent transactions to discover trends and opportunities.</p>
            </div>
          </div>
          <button
            onClick={generateInsights}
            disabled={loading || transactions.length === 0}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <Sparkles className="h-4 w-4" />
            {loading ? "Analyzing..." : "Generate insights"}
          </button>
        </div>

        {insights.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <Lightbulb className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No insights yet</p>
            <p className="text-sm text-muted-foreground">Click generate to analyze your transactions.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {insights.map((insight, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground">{insight.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{insight.description}</p>
              {insight.action && (
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                  <span>{insight.action}</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
