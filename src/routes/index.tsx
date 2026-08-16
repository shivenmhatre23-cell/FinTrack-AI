import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinTrack AI — Personal Finance Dashboard" },
      { name: "description", content: "Track your finances, set budgets, save goals, and get AI-powered spending insights with FinTrack AI." },
      { property: "og:title", content: "FinTrack AI — Personal Finance Dashboard" },
      { property: "og:description", content: "Track your finances, set budgets, save goals, and get AI-powered spending insights with FinTrack AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});
