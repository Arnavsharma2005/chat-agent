// Web search tool. Wraps the Tavily search API and returns a small, clean result list
// so the model gets titles, urls and short snippets instead of raw HTML.

export async function webSearch(query) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return { error: "TAVILY_API_KEY is not set" };

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, max_results: 5, search_depth: "basic" }),
    });
    if (!res.ok) return { error: `Search failed with status ${res.status}` };
    const data = await res.json();
    return {
      results: (data.results || []).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: (r.content || "").slice(0, 500), // cap size to keep the prompt small
      })),
    };
  } catch (err) {
    // Return the error to the model instead of crashing, so it can tell the user.
    return { error: `Search failed: ${err.message}` };
  }
}
