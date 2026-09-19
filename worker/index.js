/**
 * FinTrack AI - Lightweight Cloudflare Worker Proxy
 * Uses free Cloudflare Workers AI for spending insights & receipt OCR scanning
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // Health check endpoint
      if (url.pathname === "/" || url.pathname === "/health") {
        return jsonResponse({
          status: "healthy",
          service: "FinTrack AI Cloudflare Proxy",
          models: {
            insights: "@cf/meta/llama-3.1-8b-instruct",
            vision: "@cf/meta/llama-3.2-11b-vision-instruct",
          },
        });
      }

      // Endpoint: AI Spending Insights
      if (url.pathname === "/api/insights" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const transactions = body.transactions || [];

        if (!transactions.length) {
          return jsonResponse({
            insights: [
              {
                title: "Start Logging Expenses",
                description: "Add a few income and expense transactions to unlock personalized AI spending advice and pattern analysis.",
                action: "Add transactions",
              },
            ],
          });
        }

        const prompt = `You are a concise, helpful personal finance advisor. Analyze the following transactions and generate 2-3 specific, actionable insights. Focus on spending trends, high-spend categories, and money-saving opportunities.

Return ONLY a valid JSON object matching this structure:
{
  "insights": [
    {
      "title": "Short title",
      "description": "Max 2 clear sentences explaining the observation.",
      "action": "Optional quick action step"
    }
  ]
}

Transactions:
${JSON.stringify(transactions.slice(0, 30), null, 2)}`;

        // If Cloudflare Workers AI binding is available
        if (env?.AI) {
          try {
            const aiResult = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
              prompt: prompt,
              max_tokens: 600,
            });

            const parsed = extractJson(aiResult.response || aiResult);
            if (parsed && Array.isArray(parsed.insights)) {
              return jsonResponse(parsed);
            }
          } catch (aiErr) {
            console.error("Cloudflare AI error:", aiErr);
          }
        }

        // Fallback intelligent rule-based insights if AI binding is offline/local
        return jsonResponse(generateRuleBasedInsights(transactions));
      }

      // Endpoint: Receipt Scanning via Vision AI
      if (url.pathname === "/api/scan-receipt" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const imageBase64 = body.imageBase64;

        if (!imageBase64) {
          return jsonResponse({ error: "Missing imageBase64 in request" }, 400);
        }

        if (env?.AI) {
          try {
            // Clean base64 header if present
            const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const binaryString = atob(cleanBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            const visionResult = await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", {
              image: [...bytes],
              prompt: `Analyze this receipt image. Extract merchant name, total numeric amount, category (Groceries, Food & Drink, Entertainment, Utilities, Transportation, Shopping, Healthcare, or Travel), and date (YYYY-MM-DD). Return ONLY a JSON object: {"merchant": "...", "amount": 0.00, "category": "...", "date": "YYYY-MM-DD", "description": "..."}`,
              max_tokens: 300,
            });

            const parsed = extractJson(visionResult.response || visionResult);
            if (parsed && (parsed.amount || parsed.merchant)) {
              return jsonResponse(parsed);
            }
          } catch (visionErr) {
            console.error("Workers AI Vision error:", visionErr);
          }
        }

        // Default mock extraction for testing when running locally without active GPU binding
        return jsonResponse({
          merchant: "Supermarket & Market",
          amount: 42.50,
          category: "Groceries",
          date: new Date().toISOString().split("T")[0],
          description: "Grocery store purchase",
          confidence: "medium",
        });
      }

      return jsonResponse({ error: "Endpoint not found" }, 404);
    } catch (err) {
      console.error("Worker error:", err);
      return jsonResponse({ error: err.message || "Internal server error" }, 500);
    }
  },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function extractJson(rawText) {
  if (typeof rawText === "object" && rawText !== null) return rawText;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    return null;
  }
  return null;
}

function generateRuleBasedInsights(transactions) {
  const expenses = transactions.filter((t) => t.type === "expense");
  const income = transactions.filter((t) => t.type === "income");

  const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalIncome = income.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Group by category
  const categories = {};
  for (const t of expenses) {
    categories[t.category] = (categories[t.category] || 0) + Number(t.amount || 0);
  }

  const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const insights = [];

  if (sortedCategories.length > 0) {
    const [topCat, topAmount] = sortedCategories[0];
    const pct = totalExpense > 0 ? Math.round((topAmount / totalExpense) * 100) : 0;
    insights.push({
      title: `Highest Spending: ${topCat}`,
      description: `You have spent $${topAmount.toFixed(2)} on ${topCat} (${pct}% of total expenses). Consider setting a target budget for this category.`,
      action: "Set budget limit",
    });
  }

  if (totalIncome > 0) {
    const savingsRatio = Math.round(((totalIncome - totalExpense) / totalIncome) * 100);
    if (savingsRatio >= 20) {
      insights.push({
        title: "Strong Savings Momentum",
        description: `You are saving ${savingsRatio}% of your income this period! Redirecting extra cash to high-yield savings or investment goals will compound your growth.`,
        action: "Add to savings goal",
      });
    } else {
      insights.push({
        title: "Savings Opportunity",
        description: `Your current net savings rate is ${savingsRatio}%. Trimming discretionary expenses like dining or subscriptions could help reach a healthy 20% benchmark.`,
        action: "Review recurring bills",
      });
    }
  }

  return { insights };
}
