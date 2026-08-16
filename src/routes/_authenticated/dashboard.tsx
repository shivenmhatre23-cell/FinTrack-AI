import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { getDashboardData } from "@/lib/finance.functions";
import {
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Landmark,
  PiggyBank,
  Sparkles,
  TrendingUp,
  CalendarClock,
  Target,
  Plus,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const dashboardQueryOptions = queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => getDashboardData(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — FinTrack AI" },
      { name: "description", content: "Your personal finance dashboard with AI insights, budgets, and spending overview." },
      { property: "og:title", content: "Dashboard — FinTrack AI" },
      { property: "og:description", content: "Your personal finance dashboard with AI insights, budgets, and spending overview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQueryOptions),
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useSuspenseQuery(dashboardQueryOptions);

  const spendingByCategory = data.recentTransactions
    .filter((t) => t.type === "expense")
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {});

  const topSpending = Object.entries(spendingByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-8 py-4 backdrop-blur-xl">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground">Welcome back, {data.profile?.full_name || "there"}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/transactions"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Add transaction
          </Link>
        </div>
      </header>

      <main className="p-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Net worth"
            value={formatCurrency(data.totalBalance)}
            trend={data.totalBalance >= 0 ? "positive" : "negative"}
            icon={Landmark}
            subtitle="All time income minus expenses"
          />
          <MetricCard
            title="This month income"
            value={formatCurrency(data.monthlyIncome)}
            trend="positive"
            icon={ArrowUpRight}
            subtitle="Total income"
          />
          <MetricCard
            title="This month spending"
            value={formatCurrency(data.monthlySpending)}
            trend="negative"
            icon={ArrowDownRight}
            subtitle="Total expenses"
          />
          <MetricCard
            title="Savings rate"
            value={
              data.monthlyIncome > 0
                ? `${Math.round(((data.monthlyIncome - data.monthlySpending) / data.monthlyIncome) * 100)}%`
                : "—"
            }
            trend="positive"
            icon={PiggyBank}
            subtitle="Income not spent"
          />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Recent transactions</h2>
              <Link to="/transactions" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-border">
              {data.recentTransactions.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No transactions yet. Add your first one.</p>
              )}
              {data.recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.merchant || t.description || t.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.category} • {new Date(t.date).toLocaleDateString("en-US")}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${t.type === "income" ? "text-emerald-600" : "text-foreground"}`}>
                    {t.type === "income" ? "+" : "-"}
                    {formatCurrency(Number(t.amount))}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Top spending</h2>
              </div>
              <div className="space-y-3">
                {topSpending.length === 0 && (
                  <p className="text-sm text-muted-foreground">No spending data yet.</p>
                )}
                {topSpending.map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{category}</span>
                    <span className="text-sm font-medium text-foreground">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-semibold text-foreground">Upcoming bills</h2>
                </div>
                <Link to="/bills" className="text-sm font-medium text-primary hover:underline">
                  Manage
                </Link>
              </div>
              <div className="space-y-3">
                {data.bills.length === 0 && (
                  <p className="text-sm text-muted-foreground">No upcoming bills.</p>
                )}
                {data.bills.map((b) => (
                  <div key={b.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{b.name}</p>
                      <p className="text-xs text-muted-foreground">Due {new Date(b.due_date).toLocaleDateString("en-US")}</p>
                    </div>
                    <span className="text-sm font-medium text-foreground">{formatCurrency(Number(b.amount))}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Savings goals</h2>
              </div>
              <Link to="/goals" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {data.goals.length === 0 && <p className="text-sm text-muted-foreground">No savings goals yet.</p>}
              {data.goals.slice(0, 3).map((g) => {
                const pct = Math.min(100, Math.round((Number(g.current) / Number(g.target)) * 100));
                return (
                  <div key={g.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{g.name}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Budgets</h2>
            </div>
            <div className="space-y-4">
              {data.budgets.length === 0 && <p className="text-sm text-muted-foreground">No budgets yet.</p>}
              {data.budgets.slice(0, 3).map((b) => {
                const pct = Math.min(100, Math.round((Number(b.spent) / Number(b.amount)) * 100));
                return (
                  <div key={b.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{b.category}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(Number(b.spent))} / {formatCurrency(Number(b.amount))}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-destructive" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  title,
  value,
  trend,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string;
  trend: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
          <Icon className={`h-4 w-4 ${trend === "positive" ? "text-emerald-600" : trend === "negative" ? "text-rose-600" : "text-foreground"}`} />
        </div>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
