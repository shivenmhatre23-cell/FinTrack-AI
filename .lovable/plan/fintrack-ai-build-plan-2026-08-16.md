# FinTrack AI Build Plan

## Overview
Build a personal finance dashboard with expense tracking, budget planning, AI spending insights, bill reminders, savings goals, charts, receipt scanning, and PDF export. Visual direction: **Precision glass cockpit** — airy light UI, glassmorphism sidebar, subtle purple accent for AI, Inter + JetBrains Mono typography, staggered entrance animations.

## Phases

### 1. Design System & Foundation
- Update `src/styles.css` with the chosen direction tokens (HSL background, foreground, muted, primary, accent, border) plus animations (slide-up, pulse-slow).
- Add Google Fonts `<link>` in `src/routes/__root.tsx` for Inter + JetBrains Mono.
- Create shared layout components: `Sidebar`, `Header`, `PageShell`, `MetricCard`, `TransactionRow`, `BudgetBar`, `GoalCard`, `AiInsightCard`.

### 2. Cloud-Auth Infrastructure
- Configure Google social auth (email/password is default in Cloud). Update auth providers in the same turn as sign-in UI.
- Create `src/routes/_authenticated/route.tsx` auth gate with redirect to `/auth`.
- Create `/auth` route with login/signup tabs and Google sign-in button.
- Add `attachSupabaseAuth` to `src/start.ts` functionMiddleware so protected server functions receive the bearer token.
- Create helper `src/lib/auth.ts` for `requireSupabaseAuth` server function middleware.

### 3. Database Schema (Migration)
Tables:
- `profiles` (id, user_id, full_name, plan, created_at)
- `transactions` (id, user_id, amount, type, category, description, merchant, date, created_at)
- `budgets` (id, user_id, category, amount, spent, period, created_at)
- `savings_goals` (id, user_id, name, target, current, icon, created_at)
- `bills` (id, user_id, name, amount, due_date, is_paid, created_at)

All tables: `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated; GRANT ALL ... TO service_role;` then enable RLS and create per-user policies.

### 4. Server Functions (`src/lib/finance.functions.ts`)
- `getDashboardData` — returns total balance, monthly spending, recent transactions, budgets, goals, bills, and AI insight.
- `createTransaction` — insert new transaction.
- `createBudget` / `updateBudgetSpent`.
- `createGoal` / `updateGoalProgress`.
- `createBill` / `payBill`.
- `getAiInsights` — calls Lovable AI gateway via `createServerFn` to generate structured spending insights.
- `scanReceipt` — accepts a base64 image, calls Lovable AI vision model to extract merchant/amount/category, returns structured data.
- `exportFinancePdf` — generates a summary PDF on the server and returns a download URL/path.

### 5. Routes
- `/` → redirect to `/dashboard`
- `/dashboard` → main dashboard matching the chosen prototype composition
- `/transactions` → full transaction list with add modal
- `/budgets` → budget planning and progress
- `/goals` → savings goals
- `/insights` → AI spending insights
- `/auth` → sign-in / sign-up

### 6. UI Components
- Dashboard: metric cards, transactions list, budget progress bars, AI insight card, savings goal card.
- Charts: `recharts` line/area chart for spending velocity and pie chart for category breakdown.
- Receipt scan: drag-and-drop or file input, upload preview, AI extraction result.
- PDF export: button in header triggers server function and downloads the generated PDF.
- Transaction add modal: form with amount, category, description, merchant, date, type.

### 7. AI Integration
- Use Lovable AI Gateway provider in `src/lib/ai-gateway.server.ts` with `@ai-sdk/openai-compatible`.
- `getAiInsights`: send recent transactions to `google/gemini-3.6-flash`, return 1-2 actionable insights.
- `scanReceipt`: send image to `google/gemini-2.5-pro` (multimodal), return structured transaction fields.
- Use `Output.object()` with Zod schemas for structured output.

### 8. PDF Export
- Server route or server function using `@react-pdf/renderer` or `pdf-lib` if available; otherwise generate a styled HTML/CSS PDF via a server route. Since this is a Worker runtime, avoid heavy Node-only packages. Use `pdf-lib` (pure JS) or a server route with a simple HTML-to-PDF library if available. If no clean library, build a `/api/public/export-finance.pdf` route that returns a PDF using a lightweight Worker-compatible approach.

### 9. Receipt Scanning
- Client-side file picker → base64 → server function `scanReceipt` → AI vision extraction → optional auto-create transaction.

### 10. Polish & Verification
- Add `head()` metadata on every leaf route.
- Verify build passes.
- Run browser checks on `/dashboard` and `/auth`.
- Ensure no placeholder content remains.

## Success Criteria
- User can sign up/log in (email + Google).
- Dashboard shows real financial data fetched from the database.
- User can add transactions manually and via receipt scan.
- AI insights are generated from actual transactions.
- Budgets, goals, and bills are tracked and persisted.
- PDF export returns a downloadable finance summary.
- UI matches the precision glass cockpit direction.
