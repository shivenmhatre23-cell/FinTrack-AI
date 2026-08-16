import { createFileRoute, Outlet, Link, useRouter, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Wallet,
  Receipt,
  TrendingUp,
  Target,
  Sparkles,
  Bell,
  FileText,
  LogOut,
  Settings,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.navigate({ to: "/auth" });
  }

  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: Wallet },
    { to: "/transactions", label: "Transactions", icon: Receipt },
    { to: "/budgets", label: "Budgets", icon: TrendingUp },
    { to: "/goals", label: "Goals", icon: Target },
    { to: "/insights", label: "AI Insights", icon: Sparkles },
    { to: "/bills", label: "Bills", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-card">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 px-6 py-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="h-4 w-4" />
            </div>
            <span className="font-semibold text-foreground">FinTrack AI</span>
          </div>
          <nav className="flex-1 space-y-1 px-4 py-4">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ className: "bg-primary/10 text-foreground font-medium" }}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-border p-4">
            <Link
              to="/export"
              activeProps={{ className: "bg-primary/10 text-foreground font-medium" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </Link>
            <button
              onClick={handleSignOut}
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <div className="pl-64">
        <Outlet />
      </div>
    </div>
  );
}
