import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// ---------- Schemas ----------

const CreateTransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1),
  description: z.string().optional(),
  merchant: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const CreateBudgetSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
  period: z.enum(["weekly", "monthly", "yearly"]).default("monthly"),
});

const CreateGoalSchema = z.object({
  name: z.string().min(1),
  target: z.number().positive(),
  current: z.number().default(0),
  icon: z.string().default("target"),
});

const CreateBillSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const ScanReceiptSchema = z.object({
  imageBase64: z.string().min(1),
});

// ---------- Helpers ----------

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

// ---------- Dashboard ----------

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const monthStart = startOfMonth().toISOString().split("T")[0];
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const [transactions, budgets, goals, bills, profile] = await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(5),
      supabase.from("budgets").select("*").eq("user_id", userId).limit(10),
      supabase.from("savings_goals").select("*").eq("user_id", userId).limit(10),
      supabase.from("bills").select("*").eq("user_id", userId).eq("is_paid", false).order("due_date", { ascending: true }).limit(5),
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
    ]);

    const allTransactions = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", monthStart)
      .lte("date", monthEnd);

    const income =
      allTransactions.data?.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
    const expenses =
      allTransactions.data?.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

    // Total balance is a simple income - expenses across all time (simplified net worth)
    const allTimeIncome = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "income");
    const allTimeExpenses = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "expense");

    const totalIncome = allTimeIncome.data?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
    const totalExpenses = allTimeExpenses.data?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
    const totalBalance = totalIncome - totalExpenses;

    return {
      totalBalance,
      monthlySpending: expenses,
      monthlyIncome: income,
      recentTransactions: transactions.data ?? [],
      budgets: budgets.data ?? [],
      goals: goals.data ?? [],
      bills: bills.data ?? [],
      profile: profile.data ?? null,
    };
  });

// ---------- Transactions ----------

export const getTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });
    if (error) throw error;
    return data;
  });

export const createTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateTransactionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: inserted, error } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        amount: data.amount,
        type: data.type,
        category: data.category,
        description: data.description ?? null,
        merchant: data.merchant ?? null,
        date: data.date,
      })
      .select()
      .single();
    if (error) throw error;

    // Update budget spent if it's an expense
    if (data.type === "expense") {
      const monthStart = startOfMonth().toISOString().split("T")[0];
      const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];
      const monthSpend = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .eq("type", "expense")
        .eq("category", data.category)
        .gte("date", monthStart)
        .lte("date", monthEnd);
      const spent = monthSpend.data?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
      await supabase.from("budgets").update({ spent }).eq("user_id", userId).eq("category", data.category);
    }

    return inserted;
  });

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("transactions").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Budgets ----------

export const getBudgets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("budgets").select("*").eq("user_id", userId).order("category");
    if (error) throw error;
    return data;
  });

export const createBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateBudgetSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const monthStart = startOfMonth().toISOString().split("T")[0];
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
    const monthSpend = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "expense")
      .eq("category", data.category)
      .gte("date", monthStart)
      .lte("date", monthEnd);
    const spent = monthSpend.data?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

    const { data: inserted, error } = await supabase
      .from("budgets")
      .insert({
        user_id: userId,
        category: data.category,
        amount: data.amount,
        spent,
        period: data.period,
      })
      .select()
      .single();
    if (error) throw error;
    return inserted;
  });

export const deleteBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("budgets").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Goals ----------

export const getGoals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("savings_goals").select("*").eq("user_id", userId).order("created_at");
    if (error) throw error;
    return data;
  });

export const createGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateGoalSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: inserted, error } = await supabase
      .from("savings_goals")
      .insert({
        user_id: userId,
        name: data.name,
        target: data.target,
        current: data.current,
        icon: data.icon,
      })
      .select()
      .single();
    if (error) throw error;
    return inserted;
  });

export const updateGoalProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), current: z.number().min(0) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("savings_goals")
      .update({ current: data.current })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

export const deleteGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("savings_goals").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Bills ----------

export const getBills = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: true });
    if (error) throw error;
    return data;
  });

export const createBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateBillSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: inserted, error } = await supabase
      .from("bills")
      .insert({
        user_id: userId,
        name: data.name,
        amount: data.amount,
        due_date: data.dueDate,
      })
      .select()
      .single();
    if (error) throw error;
    return inserted;
  });

export const payBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("bills")
      .update({ is_paid: true })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

export const deleteBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("bills").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

// ---------- AI Insights ----------

export const getAiInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        transactions: z.array(
          z.object({
            amount: z.number(),
            type: z.enum(["income", "expense"]),
            category: z.string(),
            merchant: z.string().nullable(),
            date: z.string(),
          }),
        ),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const workersai = createWorkersAI({
      binding: (globalThis as any).AI,
    });

    const { output } = await generateText({
      model: workersai("@cf/zai-org/glm-4.7-flash"),
      output: Output.object({
        schema: z.object({
          insights: z.array(
            z.object({
              title: z.string(),
              description: z.string(),
              action: z.string().optional(),
              amount: z.number().optional(),
            }),
          ),
        }),
      }),
      prompt: `You are a helpful personal finance analyst. Analyze the following transactions and provide 1-2 concise, actionable insights. Focus on spending patterns, unusual changes, and simple savings opportunities. Keep each insight under 2 sentences.

Transactions:
${JSON.stringify(data.transactions, null, 2)}`,
    });

    return output;
  });

// ---------- Receipt Scanning ----------

export const scanReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ScanReceiptSchema.parse(input))
  .handler(async ({ data }) => {
    const workersai = createWorkersAI({
      binding: (globalThis as any).AI,
    });

    const { output } = await generateText({
      model: workersai("@cf/moonshotai/kimi-k2.7-code"),
      output: Output.object({
        schema: z.object({
          merchant: z.string().nullable(),
          amount: z.number().nullable(),
          category: z.string().nullable(),
          date: z.string().nullable(),
          description: z.string().nullable(),
          confidence: z.enum(["high", "medium", "low"]).nullable(),
        }),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the merchant name, total amount, category, date, and a short description from this receipt. Return the date as YYYY-MM-DD if visible. Choose a category from common ones like Groceries, Food & Drink, Entertainment, Transportation, Utilities, Healthcare, Shopping, Travel, or other. Rate your confidence as high/medium/low.",
            },
            {
              type: "image",
              image: data.imageBase64,
            },
          ],
        },
      ],
    });

    return output;
  });

// ---------- PDF Export ----------

export const exportFinancePdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [transactions, budgets, goals, bills] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", userId).order("date", { ascending: false }),
      supabase.from("budgets").select("*").eq("user_id", userId),
      supabase.from("savings_goals").select("*").eq("user_id", userId),
      supabase.from("bills").select("*").eq("user_id", userId).order("due_date", { ascending: true }),
    ]);

    const monthStart = startOfMonth().toISOString().split("T")[0];
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
    const monthTransactions = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", monthStart)
      .lte("date", monthEnd);

    const income =
      monthTransactions.data?.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
    const expenses =
      monthTransactions.data?.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
    const totalIncome =
      transactions.data?.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
    const totalExpenses =
      transactions.data?.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
    const netWorth = totalIncome - totalExpenses;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const margin = 50;
    let y = height - margin;

    const drawText = (text: string, size: number, x: number, color = rgb(0, 0, 0), weight = font) => {
      page.drawText(text, { x, y, size, font: weight, color });
    };

    drawText("FinTrack AI — Finance Summary", 24, margin, rgb(0.13, 0.15, 0.18), boldFont);
    y -= 30;
    drawText(`Generated: ${new Date().toLocaleDateString("en-US")}`, 10, margin, rgb(0.4, 0.4, 0.45));
    y -= 40;

    drawText("Overview", 16, margin, rgb(0.13, 0.15, 0.18), boldFont);
    y -= 22;
    drawText(`Net Worth: ${formatCurrency(netWorth)}`, 11, margin);
    y -= 16;
    drawText(`This Month Income: ${formatCurrency(income)}`, 11, margin);
    y -= 16;
    drawText(`This Month Expenses: ${formatCurrency(expenses)}`, 11, margin);
    y -= 30;

    if (budgets.data && budgets.data.length > 0) {
      drawText("Budgets", 16, margin, rgb(0.13, 0.15, 0.18), boldFont);
      y -= 22;
      for (const b of budgets.data) {
        drawText(
          `${b.category}: ${formatCurrency(Number(b.spent))} / ${formatCurrency(Number(b.amount))}`,
          11,
          margin,
        );
        y -= 15;
      }
      y -= 15;
    }

    if (goals.data && goals.data.length > 0) {
      drawText("Savings Goals", 16, margin, rgb(0.13, 0.15, 0.18), boldFont);
      y -= 22;
      for (const g of goals.data) {
        const pct = Math.round((Number(g.current) / Number(g.target)) * 100);
        drawText(`${g.name}: ${formatCurrency(Number(g.current))} / ${formatCurrency(Number(g.target))} (${pct}%)`, 11, margin);
        y -= 15;
      }
      y -= 15;
    }

    if (bills.data && bills.data.length > 0) {
      drawText("Upcoming Bills", 16, margin, rgb(0.13, 0.15, 0.18), boldFont);
      y -= 22;
      for (const b of bills.data) {
        drawText(`${b.name} — ${formatCurrency(Number(b.amount))} due ${b.due_date}`, 11, margin);
        y -= 15;
      }
      y -= 15;
    }

    if (transactions.data && transactions.data.length > 0) {
      drawText("Recent Transactions", 16, margin, rgb(0.13, 0.15, 0.18), boldFont);
      y -= 22;
      for (const t of transactions.data.slice(0, 20)) {
        const sign = t.type === "income" ? "+" : "-";
        const line = `${t.date}  ${t.merchant || t.description || t.category}  ${sign}${formatCurrency(Number(t.amount))}`;
        drawText(line, 9, margin);
        y -= 13;
        if (y < margin) {
          const newPage = pdfDoc.addPage();
          y = newPage.getSize().height - margin;
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    return { pdfBase64: Buffer.from(pdfBytes).toString("base64") };
  });
