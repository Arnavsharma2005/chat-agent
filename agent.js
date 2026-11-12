// The agent loop. The model can either answer, or call the web_search tool.
// We run the tool, give the result back, and repeat until the model answers in text.

import OpenAI from "openai";
import { webSearch } from "./search.js";

const MAX_STEPS = 5; // hard cap on tool rounds so a confused model cannot loop forever

const SYSTEM_PROMPT = `You are a helpful assistant with a web search tool.
Use web_search for anything recent, factual or that you are unsure about. Skip it for simple chat or stable knowledge.
When you use search results, answer from them and cite sources as a list of URLs at the end.
If search fails or finds nothing useful, say so honestly instead of guessing.`;

const tools = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current information. Returns titles, urls and snippets.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "A concise search query" } },
        required: ["query"],
      },
    },
  },
];

let client;
function getClient() {
  // Created lazily so the server can start and show a clear error if the key is missing.
  client ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  });
  return client;
}

/**
 * @param {Array<{role: string, content: string}>} history prior user/assistant messages
 * @returns {Promise<{reply: string, searches: string[]}>}
 */
export async function runAgent(history) {
  const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...history];
  const searches = []; // queries used, shown in the UI so the user sees what happened

  for (let step = 0; step < MAX_STEPS; step++) {
    const completion = await getClient().chat.completions.create({
      model: process.env.MODEL || "gpt-4o-mini",
      messages,
      tools,
    });
    const msg = completion.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls?.length) return { reply: msg.content ?? "", searches };

    for (const call of msg.tool_calls) {
      let result;
      try {
        const { query } = JSON.parse(call.function.arguments);
        searches.push(query);
        result = await webSearch(query);
      } catch {
        result = { error: "Invalid tool arguments" };
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  return { reply: "Sorry, I could not finish within the search limit. Try a narrower question.", searches };
}
