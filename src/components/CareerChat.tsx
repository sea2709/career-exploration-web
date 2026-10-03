import { getToolName, isToolUIPart } from 'ai';
import { useEffect, useRef, useState } from 'react';
import type { Components } from 'react-markdown';
import HumanCheck from './HumanCheck';
import SavedOccupationsPanel from './SavedOccupationsPanel';
import BookmarkButton from './bookmarks/BookmarkButton';
import { useBookmarks } from './bookmarks/useBookmarks';
import MarkdownText from './chat/MarkdownText';
import { ErrorNote, MotBubble, MotMessage, ThinkingMessage, UserMessage } from './chat/Messages';
import {
	INPUT,
	OUTLINE_BUTTON,
	PAGE,
	PAGE_SUBTITLE,
	PAGE_TITLE,
	PRIMARY_BUTTON,
	STATUS_CHIP,
	STOP_BUTTON,
} from './chat/styles';
import { useVerifiedChat } from './chat/useVerifiedChat';

const TOOL_LABELS: Record<string, string> = {
	searchOccupations: 'Searching occupations',
	getOccupationProfile: 'Reading occupation profile',
	compareOccupations: 'Comparing occupations',
	getRelatedOccupations: 'Finding related occupations',
	groq_query: 'Querying Sanity content',
	schema_explorer: 'Exploring content schema',
};

const SUGGESTIONS = [
	'I like solving puzzles with numbers and working with computers. What careers fit?',
	'What does a data scientist actually do day to day?',
	"I'm a retail supervisor. How could I move into project management?",
	'Jobs working with animals that need less than a bachelor’s degree?',
];

const DEFAULT_PLACEHOLDER = 'What kind of work interests you?';

const NEXT_QUESTION_OPEN = '<next-question>';
const NEXT_QUESTION_CLOSE = '</next-question>';

/** Splits the explorer's trailing `<next-question>` line off a reply, hiding it while it streams in. */
function splitNextQuestion(text: string): { body: string; nextQuestion: string } {
	const start = text.indexOf(NEXT_QUESTION_OPEN);
	if (start >= 0) {
		const rest = text.slice(start + NEXT_QUESTION_OPEN.length);
		const end = rest.indexOf(NEXT_QUESTION_CLOSE);
		return { body: text.slice(0, start).trimEnd(), nextQuestion: end >= 0 ? rest.slice(0, end).trim() : '' };
	}
	const partial = text.lastIndexOf('<');
	if (partial >= 0 && NEXT_QUESTION_OPEN.startsWith(text.slice(partial))) {
		return { body: text.slice(0, partial).trimEnd(), nextQuestion: '' };
	}
	return { body: text, nextQuestion: '' };
}

function ToolChip({ part }: { part: Parameters<typeof getToolName>[0] }) {
	const name = getToolName(part);
	const label = TOOL_LABELS[name] ?? name;
	const input = part.input as Record<string, unknown> | undefined;
	const detail = input?.query ?? input?.code ?? (input?.fromCode ? `${input.fromCode} → ${input.toCode}` : '');
	const done = part.state === 'output-available';
	const failed = part.state === 'output-error';

	return (
		<div className={STATUS_CHIP}>
			<span
				className={`size-2 rounded-full ${failed ? 'bg-red-500' : done ? 'bg-emerald-500' : 'animate-pulse bg-amber-400'}`}
			/>
			{label}
			{detail ? <code className="font-normal text-ink-muted/80">{String(detail)}</code> : null}
		</div>
	);
}

const ONET_LINK = /onetonline\.org\/link\/summary\/(\d{2}-\d{4}\.\d{2})/;
const TRAILING_CODE = /\s*\(\d{2}-\d{4}\.\d{2}\)\s*$/;

type HastNode = { type: string; value?: string; children?: HastNode[] };

function hastText(node: HastNode): string {
	return node.value ?? node.children?.map(hastText).join('') ?? '';
}

const MARKDOWN_COMPONENTS: Components = {
	a: ({ node, ...props }) => {
		const link = <a {...props} target="_blank" rel="noreferrer" />;
		const code = props.href?.match(ONET_LINK)?.[1];
		const job = node && code ? hastText(node).replace(TRAILING_CODE, '').trim() : '';
		if (!code || !job) return link;
		return (
			<>
				{link}
				<BookmarkButton
					occupation={{ code, title: job, url: props.href!, jobZone: null }}
					className="ml-2 inline-block px-2.5 py-0.5 align-middle"
				/>
				<a
					href={`/interview?job=${encodeURIComponent(job)}`}
					target="_blank"
					rel="noreferrer"
					className="ml-2 inline-block rounded-full bg-accent-soft px-2.5 py-0.5 align-middle text-xs font-semibold no-underline! hover:bg-accent hover:text-white!"
				>
					Practice mock interview
				</a>
			</>
		);
	},
};

export default function CareerChat() {
	const { messages, sendMessage, status, error, stop, busy, verified, onVerified } = useVerifiedChat('/api/chat');
	const bookmarks = useBookmarks();
	const [savedOpen, setSavedOpen] = useState(false);
	const initialQuestion = useRef(new URLSearchParams(window.location.search).get('q'));
	const [input, setInput] = useState(initialQuestion.current ?? '');
	const bottomRef = useRef<HTMLDivElement>(null);

	const lastMessage = messages.at(-1);
	const suggestion =
		!busy && lastMessage?.role === 'assistant'
			? (lastMessage.parts
					.map((part) => (part.type === 'text' ? splitNextQuestion(part.text).nextQuestion : ''))
					.findLast(Boolean) ?? '')
			: '';

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const send = (text: string) => {
		if (!text.trim() || busy || !verified) return;
		sendMessage({ text });
		setInput('');
	};

	useEffect(() => {
		if (!verified || !initialQuestion.current) return;
		initialQuestion.current = null;
		history.replaceState(null, '', window.location.pathname);
		send(input);
	}, [verified]);

	return (
		<div className="mx-auto flex h-full max-w-[1180px] gap-6 lg:px-5">
			<div className={`${PAGE} min-w-0 flex-1`}>
				<header className="flex items-start justify-between gap-4 py-6">
					<div>
						<h1 className={PAGE_TITLE}>Career Explorer</h1>
						<p className={PAGE_SUBTITLE}>
							Ask about careers. Answers use O*NET 31.0 data via local tools and your Sanity dataset.
						</p>
					</div>
					<button type="button" onClick={() => setSavedOpen(true)} className={`${OUTLINE_BUTTON} shrink-0 lg:hidden`}>
						Saved{bookmarks.length ? ` (${bookmarks.length})` : ''}
					</button>
				</header>

				<main className="flex-1 space-y-6 overflow-y-auto pb-6">
					{messages.length === 0 && (
						<MotMessage>
							<MotBubble>
								<p>Ask me anything about careers, or pick one of these to get going.</p>
							</MotBubble>
							<div className="grid gap-3 self-stretch pt-1 sm:grid-cols-2">
								{SUGGESTIONS.map((s) => (
									<button
										key={s}
										onClick={() => send(s)}
										disabled={!verified}
										className="rounded-[18px] border border-line bg-white p-4 text-left text-sm text-ink hover:border-accent disabled:opacity-40 disabled:hover:border-line"
									>
										{s}
									</button>
								))}
							</div>
						</MotMessage>
					)}

					{messages.map((message) => {
						if (message.role === 'user') {
							return (
								<UserMessage key={message.id}>
									{message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('')}
								</UserMessage>
							);
						}
						const parts = message.parts.flatMap((part, i) => {
							if (part.type === 'text') {
								const { body } = splitNextQuestion(part.text);
								if (!body) return [];
								return (
									<MotBubble key={i}>
										<MarkdownText text={body} components={MARKDOWN_COMPONENTS} />
									</MotBubble>
								);
							}
							return isToolUIPart(part) ? <ToolChip key={i} part={part} /> : [];
						});
						return parts.length ? <MotMessage key={message.id}>{parts}</MotMessage> : null;
					})}

					{status === 'submitted' && <ThinkingMessage />}
					{error && <ErrorNote message={error.message} />}
					<div ref={bottomRef} />
				</main>

				{!verified && <HumanCheck onVerified={onVerified} />}

				<form
					onSubmit={(e) => {
						e.preventDefault();
						send(input);
					}}
					className="flex gap-2 border-t border-line py-4"
				>
					<div className="relative flex min-w-0 flex-1">
						<input
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Tab' && !e.shiftKey && !input && suggestion) {
									e.preventDefault();
									setInput(suggestion);
								}
							}}
							placeholder={suggestion || DEFAULT_PLACEHOLDER}
							title={suggestion ? 'Press Tab to use the suggested question' : undefined}
							className={`${INPUT} min-h-11 w-full ${suggestion && !input ? 'pr-14' : ''}`}
						/>
						{suggestion && !input && (
							<kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-line bg-canvas px-1.5 py-0.5 font-sans text-xs text-ink-muted">
								Tab
							</kbd>
						)}
					</div>
					{busy ? (
						<button type="button" onClick={stop} className={STOP_BUTTON}>
							Stop
						</button>
					) : (
						<button type="submit" disabled={!input.trim() || !verified} className={PRIMARY_BUTTON}>
							Send
						</button>
					)}
				</form>
			</div>
			<SavedOccupationsPanel open={savedOpen} onClose={() => setSavedOpen(false)} />
		</div>
	);
}
