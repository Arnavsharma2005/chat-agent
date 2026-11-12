# Design

## What it is
A chat agent with web search. Node 18+, plain JavaScript, Express, one HTML page. Run with `npm install` then `npm run dev`, open http://localhost:3000.

## Architecture
- `public/index.html`: chat UI. Holds the conversation in memory and sends the whole history on each turn.
- `server.js`: Express. One endpoint, `POST /api/chat`. Validates input, calls the agent. Stateless.
- `agent.js`: the agent loop. Sends messages plus a `web_search` tool definition to the model. If the model asks for a search, run it, return the result, repeat. Stops when the model answers in text, or after 5 rounds.
- `search.js`: calls the Tavily search API and returns title, url and a short snippet for 5 results.

The model decides when to search (native tool calling), so simple chat costs one model call and fact questions get fresh data with source URLs.

## Choices and rejected options
- **OpenAI-compatible API, configurable base URL and model.** Works with OpenAI, Groq, OpenRouter and others by changing two env vars. Rejected a provider-specific SDK: it locks in one vendor.
- **Tavily for search.** Built for LLMs, returns clean snippets, free tier, one HTTP call. Rejected scraping Google/DuckDuckGo (fragile, blocked often) and the model's built-in search (not available on every provider).
- **No agent framework (LangChain etc.).** The loop is about 30 lines. A framework adds code that is harder to explain and debug at this size.
- **Plain JS, no TypeScript build step.** Fewer moving parts, so `npm run dev` just works.
- **Stateless server, history kept in the browser.** No database or sessions. Simple, but history is lost on refresh.
- **Non-streaming replies.** Much simpler code. Cost: the user waits for the full answer.
- **Step cap of 5.** Stops runaway tool loops and runaway cost.
- **Errors returned to the model.** A failed search becomes a tool result, so the model can say it failed instead of the app crashing.

## With another week
- Stream tokens to the UI.
- Persist conversations and add a conversation list.
- Fetch and read full pages for top results, not only snippets.
- Rate limiting, request timeouts and retry on search and model calls.
- Basic tests for the agent loop with a mocked model, and a few evals on answer quality and citations.
- Trim long histories so context does not overflow.
