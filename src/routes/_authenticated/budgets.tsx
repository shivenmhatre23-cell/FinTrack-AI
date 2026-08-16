import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getBudgets,
  createBudget,
  deleteBudget,
} from "@/lib/finance.functions";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Trash2, X, TrendingUp } from "lucide-react";

const budgetsQueryOptions = queryOptions({
  queryKey: ["budgets"],
  queryFn: () => getBudgets(),
});

const categories = [
  "Groceries",
  "Rent & Housing",
  "Entertainment",
  "Food & Drink",
  "Transportation",
  "Utilities",
  "Healthcare",
  "Shopping",
  "Travel",
];

export const Route = createFileRoute("/_authenticated/budgets")({
  head: () => ({
    meta: [
      { title: "Budgets — FinTrack AI" },
      {
        name: "description",
        content: "Set monthly spending limits and track progress.",
      },
      {
        property: "og:title",
        content: "Budgets — FinTrack AI",
      },
      {
        property: "og:description",
        content: "Set monthly spending limits and track progress.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
  }),

  loader: ({ context }) =>
    context.queryClient.ensureQueryData(budgetsQueryOptions),

  component: BudgetsPage,
});

function BudgetsPage() {
  const { data, refetch } = useSuspenseQuery(budgetsQueryOptions);

  const [showAdd, setShowAdd] = useState(false);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");

  const createBudgetFn = useServerFn(createBudget);
  const deleteBudgetFn = useServerFn(deleteBudget);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      await createBudgetFn({
        data: {
          category,
          amount: Number(amount),
          period: "monthly",
        },
      });

      toast.success("Budget created");

      setCategory("");
      setAmount("");
      setShowAdd(false);

      await refetch();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to create budget",
      );
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteBudgetFn({
        data: { id },
      });

      toast.success("Budget deleted");

      await refetch();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to delete budget",
      );
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-8 py-4 backdrop-blur-xl">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Budgets
          </h1>

          <p className="text-xs text-muted-foreground">
            Set spending limits and stay on track
          </p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New budget
        </button>
      </header>

      <main className="p-8">
        {showAdd && (
          <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                New budget
              </h2>

              <button
                type="button"
                onClick={() => setShowAdd(false)}
                aria-label="Close new budget form"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-4 md:grid-cols-4"
            >
              <div>
                <label
                  htmlFor="budget-category"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Category
                </label>

                <select
                  id="budget-category"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select category</option>

                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="budget-amount"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Monthly limit
                </label>

                <input
                  id="budget-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="0.00"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Create budget
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No budgets yet. Create one to start tracking.
            </p>
          )}

          {data.map((budget) => {
            const amount = Number(budget.amount);
            const spent = Number(budget.spent);

            const pct =
              amount > 0
                ? Math.min(100, Math.round((spent / amount) * 100))
                : 0;

            return (
              <div
                key={budget.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>

                    <span className="font-medium text-foreground">
                      {budget.category}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(budget.id)}
                    aria-label={`Delete ${budget.category} budget`}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-2xl font-semibold text-foreground">
                  {formatCurrency(spent)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    / {formatCurrency(amount)}
                  </span>
                </p>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct >= 90
                        ? "bg-destructive"
                        : pct >= 70
                          ? "bg-amber-500"
                          : "bg-primary"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {pct}% used
                  </p>

                  {spent > amount && (
                    <p className="text-xs font-medium text-destructive">
                      Over budget
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}