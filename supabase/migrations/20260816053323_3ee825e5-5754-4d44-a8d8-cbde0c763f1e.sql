CREATE TABLE public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  full_name text,
  plan text default 'free',
  created_at timestamp with time zone default now() not null,
  unique (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own profile"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric(12,2) not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  description text,
  merchant text,
  date date not null default current_date,
  created_at timestamp with time zone default now() not null
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions"
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own transactions"
  ON public.transactions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own transactions"
  ON public.transactions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null,
  amount numeric(12,2) not null,
  spent numeric(12,2) default 0 not null,
  period text not null default 'monthly' check (period in ('weekly', 'monthly', 'yearly')),
  created_at timestamp with time zone default now() not null,
  unique (user_id, category, period)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own budgets"
  ON public.budgets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own budgets"
  ON public.budgets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own budgets"
  ON public.budgets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own budgets"
  ON public.budgets
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  target numeric(12,2) not null,
  current numeric(12,2) default 0 not null,
  icon text default 'target',
  created_at timestamp with time zone default now() not null
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings_goals TO authenticated;
GRANT ALL ON public.savings_goals TO service_role;

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own goals"
  ON public.savings_goals
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own goals"
  ON public.savings_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own goals"
  ON public.savings_goals
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own goals"
  ON public.savings_goals
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  amount numeric(12,2) not null,
  due_date date not null,
  is_paid boolean default false not null,
  created_at timestamp with time zone default now() not null
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO authenticated;
GRANT ALL ON public.bills TO service_role;

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bills"
  ON public.bills
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own bills"
  ON public.bills
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bills"
  ON public.bills
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own bills"
  ON public.bills
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null default 'expense' check (type in ('income', 'expense')),
  color text default '#94a3b8'
);

GRANT SELECT ON public.categories TO authenticated;
GRANT SELECT ON public.categories TO anon;
GRANT ALL ON public.categories TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories"
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.categories (name, type, color) VALUES
  ('Groceries', 'expense', '#10b981'),
  ('Rent & Housing', 'expense', '#0f172a'),
  ('Entertainment', 'expense', '#8b5cf6'),
  ('Food & Drink', 'expense', '#f59e0b'),
  ('Transportation', 'expense', '#3b82f6'),
  ('Utilities', 'expense', '#ef4444'),
  ('Healthcare', 'expense', '#ec4899'),
  ('Shopping', 'expense', '#6366f1'),
  ('Travel', 'expense', '#14b8a6'),
  ('Investments', 'income', '#059669'),
  ('Salary', 'income', '#0f172a'),
  ('Freelance', 'income', '#8b5cf6'),
  ('Dividends', 'income', '#10b981');