import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getBills,
  createBill,
  payBill,
  deleteBill,
} from "@/lib/finance.functions";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  X,
  CheckCircle2,
  Bell,
  CalendarClock,
} from "lucide-react";

const billsQueryOptions = queryOptions({
  queryKey: ["bills"],
  queryFn: () => getBills(),
});

export const Route = createFileRoute("/_authenticated/bills")({
  head: () => ({
    meta: [
      { title: "Bills — FinTrack AI" },
      {
        name: "description",
        content: "Track upcoming bills and payment status.",
      },
      {
        property: "og:title",
        content: "Bills — FinTrack AI",
      },
      {
        property: "og:description",
        content: "Track upcoming bills and payment status.",
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
    context.queryClient.ensureQueryData(billsQueryOptions),

  component: BillsPage,
});

function BillsPage() {
  const { data, refetch } = useSuspenseQuery(billsQueryOptions);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const createBillFn = useServerFn(createBill);
  const payBillFn = useServerFn(payBill);
  const deleteBillFn = useServerFn(deleteBill);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      await createBillFn({
        data: {
          name,
          amount: Number(amount),
          dueDate,
        },
      });

      toast.success("Bill added");

      setName("");
      setAmount("");
      setDueDate("");
      setShowAdd(false);

      await refetch();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to add bill",
      );
    }
  }

  async function handlePay(id: string) {
    try {
      await payBillFn({
        data: { id },
      });

      toast.success("Bill marked as paid");

      await refetch();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to update bill",
      );
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteBillFn({
        data: { id },
      });

      toast.success("Bill deleted");

      await refetch();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to delete bill",
      );
    }
  }

  const upcoming = data.filter((bill) => !bill.is_paid);
  const paid = data.filter((bill) => bill.is_paid);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-8 py-4 backdrop-blur-xl">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Bills
          </h1>

          <p className="text-xs text-muted-foreground">
            Never miss a payment
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add bill
        </button>
      </header>

      <main className="p-8">
        {showAdd && (
          <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                New bill
              </h2>

              <button
                type="button"
                onClick={() => setShowAdd(false)}
                aria-label="Close new bill form"
                className="text-muted-foreground transition-colors hover:text-foreground"
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
                  htmlFor="bill-name"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Bill name
                </label>

                <input
                  id="bill-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="e.g. Rent"
                />
              </div>

              <div>
                <label
                  htmlFor="bill-amount"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Amount
                </label>

                <input
                  id="bill-amount"
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

              <div>
                <label
                  htmlFor="bill-due"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Due date
                </label>

                <input
                  id="bill-due"
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="md:col-span-4">
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Save bill
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Upcoming bills */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />

              <h2 className="text-base font-semibold text-foreground">
                Upcoming
              </h2>
            </div>

            <div className="divide-y divide-border">
              {upcoming.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No upcoming bills. Great job!
                </p>
              )}

              {upcoming.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {bill.name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Due{" "}
                      {new Date(bill.due_date).toLocaleDateString(
                        "en-US",
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(Number(bill.amount))}
                    </span>

                    <button
                      type="button"
                      onClick={() => handlePay(bill.id)}
                      aria-label={`Mark ${bill.name} as paid`}
                      className="text-emerald-600 transition-colors hover:text-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(bill.id)}
                      aria-label={`Delete ${bill.name} bill`}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Paid bills */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />

              <h2 className="text-base font-semibold text-foreground">
                Paid
              </h2>
            </div>

            <div className="divide-y divide-border">
              {paid.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No paid bills yet.
                </p>
              )}

              {paid.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {bill.name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Paid •{" "}
                      {new Date(
                        bill.due_date,
                      ).toLocaleDateString("en-US")}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {formatCurrency(Number(bill.amount))}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDelete(bill.id)}
                      aria-label={`Delete ${bill.name} bill`}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}