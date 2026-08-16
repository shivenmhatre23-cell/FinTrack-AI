import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getGoals,
  createGoal,
  updateGoalProgress,
  deleteGoal,
} from "@/lib/finance.functions";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Trash2, X, Target } from "lucide-react";

const goalsQueryOptions = queryOptions({
  queryKey: ["goals"],
  queryFn: () => getGoals(),
});

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: [
      { title: "Savings Goals — FinTrack AI" },
      {
        name: "description",
        content: "Set savings goals and track your progress.",
      },
      {
        property: "og:title",
        content: "Savings Goals — FinTrack AI",
      },
      {
        property: "og:description",
        content: "Set savings goals and track your progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),

  loader: ({ context }) =>
    context.queryClient.ensureQueryData(goalsQueryOptions),

  component: GoalsPage,
});

function GoalsPage() {
  const { data, refetch } = useSuspenseQuery(goalsQueryOptions);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");

  const createGoalFn = useServerFn(createGoal);
  const updateGoalFn = useServerFn(updateGoalProgress);
  const deleteGoalFn = useServerFn(deleteGoal);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const targetAmount = Number(target);

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      toast.error("Please enter a valid target amount.");
      return;
    }

    try {
      await createGoalFn({
        data: {
          name: name.trim(),
          target: targetAmount,
          current: 0,
        },
      });

      toast.success("Goal created");

      setName("");
      setTarget("");
      setShowAdd(false);
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create goal",
      );
    }
  }

  async function handleAddProgress(id: string, current: number) {
    const add = prompt("Add to current amount:", "0");

    if (!add) return;

    const amount = Number(add);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    try {
      await updateGoalFn({
        data: {
          id,
          current: current + amount,
        },
      });

      toast.success("Progress updated");
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update",
      );
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteGoalFn({ data: { id } });

      toast.success("Goal deleted");
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete",
      );
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-8 py-4 backdrop-blur-xl">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Savings Goals
          </h1>
          <p className="text-xs text-muted-foreground">
            Plan and achieve your financial targets
          </p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New goal
        </button>
      </header>

      <main className="p-8">
        {showAdd && (
          <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                New goal
              </h2>

              <button
                onClick={() => setShowAdd(false)}
                aria-label="Close new goal form"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-4 md:grid-cols-4"
            >
              <div className="md:col-span-2">
                <label
                  htmlFor="goal-name"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Goal name
                </label>

                <input
                  id="goal-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="e.g. Emergency fund"
                />
              </div>

              <div>
                <label
                  htmlFor="goal-target"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Target amount
                </label>

                <input
                  id="goal-target"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Create goal
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No savings goals yet. Create one to get started.
            </p>
          )}

          {data.map((g) => {
            const targetAmount = Number(g.target);
            const currentAmount = Number(g.current);

            const pct =
              targetAmount > 0
                ? Math.min(
                    100,
                    Math.round((currentAmount / targetAmount) * 100),
                  )
                : 0;

            return (
              <div
                key={g.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <Target className="h-4 w-4 text-primary" />
                    </div>

                    <span className="font-medium text-foreground">
                      {g.name}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDelete(g.id)}
                    aria-label={`Delete ${g.name} goal`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-2xl font-semibold text-foreground">
                  {formatCurrency(currentAmount)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    / {formatCurrency(targetAmount)}
                  </span>
                </p>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {pct}% saved
                  </span>

                  <button
                    onClick={() =>
                      handleAddProgress(g.id, currentAmount)
                    }
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                  >
                    Add progress
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}