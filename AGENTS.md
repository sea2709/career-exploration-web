# web/ — Career Explorer frontend

Astro 7 + React 19 UI with a static introduction homepage at `/`, three agent-backed pages (Career Explorer at `/explore`, Mock Interview Coach at `/interview`, Interest Quiz at `/quiz`) that proxy to the agent service in `../agent`. Career Explorer has a Compare sub-page at `/explore/compare` for bookmarked occupations. See `README.md` for setup and architecture.

## Development

Don't start a dev server from a checkout on `master`; the developer runs that one on port 4321 (see `../.cursor/rules/no-dev-server-on-default-branch.mdc`). In a worktree, start it in background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

The chat only works end to end when the agent service is also running (`cd ../agent && pnpm dev`, port 8787) and `web/.env` has `AGENT_API_TOKEN` (matching `agent/.env`) plus Turnstile keys. Cloudflare's test keys in `.env.example` work for local dev.

Type-check with `pnpm astro check`. There is no test suite or lint script.

## Layout

- `src/pages/index.astro` is the static homepage (plain Astro, no client JS), where Mot, the site's mascot, introduces O\*NET and links to each tool. Its `features` list holds each tool's one-line pitch; update it when a tool's behavior changes.
- `src/pages/explore.astro` mounts `CareerChat`, `src/pages/interview.astro` mounts `InterviewCoach`, and `src/pages/quiz.astro` mounts `InterestQuiz`, all with `client:only="react"` inside `layouts/AppLayout.astro` (page shell, Mot logo, and nav). There is no SSR of the chat UIs. Add new tools to the `links` list in `AppLayout.astro`. A nav link also stays highlighted on its sub-pages (for example `/explore/compare`).
- `src/components/MotAvatar.tsx` is the mascot avatar, used by both Astro pages and the React components. `src/components/chat/Messages.tsx` has the shared `MotMessage`, `MotBubble`, and `UserMessage` chat layout, and `src/components/chat/styles.ts` holds the shared class strings for cards, inputs, and buttons.
- `src/components/chat/useVerifiedChat.ts` wraps `useChat` from `@ai-sdk/react` with a `DefaultChatTransport` for a given API route plus the human-session state. Every page uses it; extra `useChat` options (like `sendAutomaticallyWhen`) go in its second argument.
- `src/components/CareerChat.tsx` renders text parts with `chat/MarkdownText.tsx` and tool-call parts as chips. Each O\*NET occupation link in a reply gets a bookmark toggle and a "Practice mock interview" link, keyed off the `[Title (code)](onetonline url)` format the explorer's system prompt asks for. `?q=` prefills the question and sends it once the visitor is verified. Beside it, `SavedOccupationsPanel.tsx` lists the saved occupations (a drawer below the `lg` breakpoint) with Job Zone, typical education, interest types, top skills, and description from `src/pages/api/saved-occupations.ts`, plus a link to the Compare page.
- `src/pages/api/saved-occupations.ts` takes `?codes=` (comma-separated O\*NET-SOC codes, at most 50) and reads those `onetOccupation` documents through `sanity:client` (public CDN, no human-session gate). It shapes education the same way as `typicalEducation` in `../agent/src/onet/data.ts` (prefer the RL scale). Its result type is declared by hand because TypeGen scans the main checkout; switch to the generated type once `pnpm typegen` has picked up the query.
- `src/components/bookmarks/useBookmarks.ts` stores bookmarked occupations (`code`, `title`, `url`, `jobZone`) in `localStorage` under `mot:bookmarks` and keeps every tab in sync. There are no accounts and nothing reaches the server. `BookmarkButton.tsx` is the shared toggle used by the chat and the quiz match list.
- `src/components/CompareOccupations.tsx` (mounted by `src/pages/explore/compare.astro`, linked from `SavedOccupationsPanel` rather than the top nav) lists bookmarks, lets the visitor pick 2–4 and an optional starting occupation, and opens `/explore?q=` with a comparison request. With a starting point the request is phrased as career moves, which the explorer answers with `compareOccupations`; otherwise it asks for a side-by-side overview.
- `src/components/InterviewCoach.tsx` renders a setup form, then renders `scoreAnswer` and `finishInterview` tool outputs as feedback and report cards. It prefills the job from `?job=`.
- `src/components/InterestQuiz.tsx` renders a setup form, the client-side `presentActivities` tool as a rating card (answered with `addToolOutput`, questions numbered continuously across both rounds), and `buildInterestProfile` and `matchOccupations` outputs as a profile card and match list. Each match has a bookmark toggle. `RiasecGuide` is a collapsible explainer of the six RIASEC types, the interest code, and how matches are scored, shown above the setup form and at the bottom of the profile card. Its scoring text describes `matchOccupations` in `../agent/src/onet/interests.ts`, so update it if the weighting changes. Beside it, `OtherCareerQuizzes.tsx` lists external career quizzes from `src/pages/api/career-quizzes.ts` in a right sidebar (a drawer below the `lg` breakpoint, like `SavedOccupationsPanel`).
- `src/pages/api/career-quizzes.ts` reads published `careerQuiz` documents through `sanity:client` (public CDN, no token, no human-session gate). Studio users submit quizzes, and the Studio review workflow (`../studio/schemaTypes/careerQuizzes/careerQuizWorkflow.ts`) only lets a quiz be published once it's Approved. `FOCUS_LABELS` and `COST_LABELS` in `OtherCareerQuizzes.tsx` mirror `QUIZ_FOCUSES` and `QUIZ_COSTS` in `../studio/schemaTypes/careerQuizzes/careerQuiz.ts`.
- `src/components/HumanCheck.tsx` renders the Turnstile widget and posts the token to `/api/verify-human`.
- `src/lib/agent-proxy.ts` has `proxyToAgent`, used by `src/pages/api/chat.ts`, `interview.ts`, and `quiz.ts`. `src/lib/human-verification.ts` holds the Turnstile siteverify call and the HMAC-signed `human_session` cookie helpers.
- Everything under `src/pages/api/` is a server route (`export const prerender = false`).
- `Button.astro`, `layouts/main.astro`, and `pages/markdown-page.md` are leftovers from the Astro Tailwind starter and aren't used by the chat.
- `sanity.types.ts` is generated by `pnpm typegen` in `../studio`. Never edit it by hand.

## Conventions and constraints

- **Env vars go through `astro:env`.** Declare new vars in the `env.schema` block of `astro.config.mjs` with `envField`, then import from `astro:env/server` or `astro:env/client`. Don't use `import.meta.env` or `process.env` for app config. Update `.env.example` whenever you add one.
- **Secrets stay server-side.** `AGENT_API_TOKEN` and `TURNSTILE_SECRET_KEY` are `access: 'secret'` and must only be read in server routes or `src/lib`. The browser must never call the agent directly; all agent traffic goes through `/api/*` routes that call `proxyToAgent`.
- **Agent routes are gated by the human session.** `proxyToAgent` checks `hasHumanSession` and returns `403` when it fails; any new route that triggers agent or LLM work should use it. The client treats `403` as "re-verify".
- **Keep the proxy transparent.** `proxyToAgent` forwards the request body as-is and only passes through the headers in `PASSTHROUGH_HEADERS`, which the AI SDK needs for streaming. If the agent starts sending a new header the client depends on, add it there.
- **Tool labels:** `TOOL_LABELS` in `CareerChat.tsx`, `PREP_LABELS` in `InterviewCoach.tsx`, and `STATUS_LABELS` in `InterestQuiz.tsx`. When the agent (`../agent/src`) adds or renames a tool, update the matching map so the chip shows a readable label.
- **Interview card types mirror the agent.** `InterviewScore` and `InterviewReport` in `InterviewCoach.tsx` must match the `scoreAnswer` and `finishInterview` schemas in `../agent/src/interview-agent.ts`. Likewise, the types at the top of `InterestQuiz.tsx` mirror the quiz tools in `../agent/src/quiz-agent.ts` and `../agent/src/onet/interests.ts`.
- **New `client:only` components in dev:** Tailwind may not pick up classes from a brand-new client-only component until the dev server restarts (or `src/styles/global.css` is touched). Production builds are unaffected.
- **Adapter is chosen at build time**: `@astrojs/vercel` when `VERCEL` is set, otherwise `@astrojs/node` in standalone mode. Keep server code compatible with both (Node APIs like `node:crypto` are fine).
- **Styling is Tailwind 4 utilities inline** in components. `src/styles/global.css` defines the design tokens in `@theme` (colors `canvas`, `ink`, `ink-muted`, `line`, `accent`, `accent-strong`, `accent-soft`; fonts `font-sans` for Nunito Sans and `font-display` for Outfit; `rounded-blob`; `shadow-bubble`) plus base body and link styles. Links with an absolute `http(s)` href get an external-link icon from those base styles, so write internal links as relative paths. Use the tokens instead of raw Tailwind palette colors, except for semantic status colors (red, amber, emerald) and the RIASEC type colors. Fonts load from Google Fonts in `AppLayout.astro`. There's no Tailwind config file.
- Code style: tabs, single quotes, semicolons.

## Agent skills

`.agents/skills/` (symlinked into `.claude/skills/`) contains Sanity Context skills: `create-agent-with-sanity-context`, `shape-your-agent`, and `dial-your-context`. They mostly apply to the agent service in `../agent`, but consult them when changing how the chat UI surfaces Sanity-backed tool calls.

## Documentation

- Astro: https://docs.astro.build
  - [Routing, endpoints, and on-demand rendering](https://docs.astro.build/en/guides/routing/)
  - [Framework components and client directives](https://docs.astro.build/en/guides/framework-components/)
  - [Type-safe environment variables](https://docs.astro.build/en/guides/environment-variables/)
  - [Styling and Tailwind](https://docs.astro.build/en/guides/styling/)
- AI SDK UI (`useChat`, transports, tool parts): https://ai-sdk.dev/docs/ai-sdk-ui
- Cloudflare Turnstile: https://developers.cloudflare.com/turnstile/
