export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));
    const transactions = body.transactions || [];

    if (!transactions.length) {
      return jsonResponse({
        insights: [
          {
            title: "Start Logging Expenses",
            description: "Add income and expense transactions to unlock personalized AI spending advice and pattern analysis.",
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

    // Cloudflare Workers AI binding on Pages
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
        console.error("Workers AI error:", aiErr);
      }
    }

    // Fallback rule-based insights
    return jsonResponse(generateRuleBasedInsights(transactions));
  } catch (err) {
    return jsonResponse({ error: err.message || "Failed to process insights" }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function extractJson(rawText) {
  if (typeof rawText === "object" && rawText !== null) return rawText;
  try {
    const jsonMatch = String(rawText).match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
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
        description: `Your current net savings rate is ${savingsRatio}%. Trimming discretionary expenses like dining or shopping could help reach a healthy 20% benchmark.`,
        action: "Review recurring bills",
      });
    }
  }

  return { insights };
}
