import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getTransactions, createTransaction, deleteTransaction, scanReceipt } from "@/lib/finance.functions";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Trash2, Upload, X, Receipt } from "lucide-react";

const transactionsQueryOptions = queryOptions({
  queryKey: ["transactions"],
  queryFn: () => getTransactions(),
});

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — FinTrack AI" },
      { name: "description", content: "Track, manage, and categorize your income and expenses." },
      { property: "og:title", content: "Transactions — FinTrack AI" },
      { property: "og:description", content: "Track, manage, and categorize your income and expenses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(transactionsQueryOptions),
  component: TransactionsPage,
});

function TransactionsPage() {
  const { data, refetch } = useSuspenseQuery(transactionsQueryOptions);
  const [showAdd, setShowAdd] = useState(false);
  const [scanning, setScanning] = useState(false);
  const createTx = useServerFn(createTransaction);
  const deleteTx = useServerFn(deleteTransaction);
  const scanReceiptFn = useServerFn(scanReceipt);

  const [form, setForm] = useState({
    amount: "",
    type: "expense" as "income" | "expense",
    category: "",
    description: "",
    merchant: "",
    date: new Date().toISOString().split("T")[0],
  });

  const expenseCategories = ["Groceries", "Rent & Housing", "Entertainment", "Food & Drink", "Transportation", "Utilities", "Healthcare", "Shopping", "Travel"];
  const incomeCategories = ["Salary", "Freelance", "Investments", "Dividends"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createTx({
        data: {
          amount: Number(form.amount),
          type: form.type,
          category: form.category,
          description: form.description,
          merchant: form.merchant,
          date: form.date,
        },
      });
      toast.success("Transaction added");
      setForm({
        amount: "",
        type: "expense",
        category: "",
        description: "",
        merchant: "",
        date: new Date().toISOString().split("T")[0],
      });
      setShowAdd(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add transaction");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTx({ data: { id } });
      toast.success("Transaction deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await scanReceiptFn({ data: { imageBase64: base64 } });
      if (result) {
        setForm({
          amount: result.amount ? String(result.amount) : "",
          type: "expense",
          category: result.category || "",
          description: result.description || "",
          merchant: result.merchant || "",
          date: result.date || new Date().toISOString().split("T")[0],
        });
        setShowAdd(true);
        toast.success("Receipt scanned");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Receipt scan failed");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-8 py-4 backdrop-blur-xl">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Transactions</h1>
          <p className="text-xs text-muted-foreground">Track and manage every dollar</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            <Upload className="h-4 w-4" />
            {scanning ? "Scanning..." : "Scan receipt"}
            <input type="file" aria-label="Upload receipt image" accept="image/*" className="hidden" onChange={handleReceiptUpload} disabled={scanning} />
          </label>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add transaction
          </button>
        </div>
      </header>

      <main className="p-8">
        {showAdd && (
          <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Add transaction</h2>
              <button onClick={() => setShowAdd(false)} aria-label="Close add transaction form" className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="tx-amount" className="mb-1.5 block text-sm font-medium text-foreground">Amount</label>
                <input
                  id="tx-amount"
                  type="number"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="tx-type" className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
                <select
                  id="tx-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as "income" | "expense", category: "" })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label htmlFor="tx-category" className="mb-1.5 block text-sm font-medium text-foreground">Category</label>
                <select
                  id="tx-category"
                  required
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select category</option>
                  {(form.type === "expense" ? expenseCategories : incomeCategories).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tx-merchant" className="mb-1.5 block text-sm font-medium text-foreground">Merchant</label>
                <input
                  id="tx-merchant"
                  type="text"
                  value={form.merchant}
                  onChange={(e) => setForm({ ...form, merchant: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="tx-description" className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                <input
                  id="tx-description"
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="tx-date" className="mb-1.5 block text-sm font-medium text-foreground">Date</label>
                <input
                  id="tx-date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="md:col-span-3">
                <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Save transaction
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="divide-y divide-border">
            {data.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">No transactions yet. Add one or scan a receipt.</p>
            )}
            {data.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.merchant || t.description || t.category}</p>
                    <p className="text-xs text-muted-foreground">{t.category} • {new Date(t.date).toLocaleDateString("en-US")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-semibold ${t.type === "income" ? "text-emerald-600" : "text-foreground"}`}>
                    {t.type === "income" ? "+" : "-"}{formatCurrency(Number(t.amount))}
                  </span>
                  <button
                    onClick={() => handleDelete(t.id)}
                    aria-label="Delete transaction"
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
