import { getToolName, isToolUIPart } from 'ai';
import { useEffect, useRef, useState } from 'react';
import type { Components } from 'react-markdown';
import HumanCheck from './HumanCheck';
import MarkdownText from './chat/MarkdownText';
import { ErrorNote, MotBubble, MotMessage, ThinkingMessage, UserMessage } from './chat/Messages';
import { INPUT, PAGE, PAGE_SUBTITLE, PAGE_TITLE, PRIMARY_BUTTON, STATUS_CHIP, STOP_BUTTON } from './chat/styles';
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

const ONET_LINK = /onetonline\.org\/link\/summary\/\d{2}-\d{4}\.\d{2}/;
const TRAILING_CODE = /\s*\(\d{2}-\d{4}\.\d{2}\)\s*$/;

type HastNode = { type: string; value?: string; children?: HastNode[] };

function hastText(node: HastNode): string {
	return node.value ?? node.children?.map(hastText).join('') ?? '';
}

const MARKDOWN_COMPONENTS: Components = {
	a: ({ node, ...props }) => {
		const link = <a {...props} target="_blank" rel="noreferrer" />;
		const job = node && ONET_LINK.test(props.href ?? '') ? hastText(node).replace(TRAILING_CODE, '').trim() : '';
		if (!job) return link;
		return (
			<>
				{link}
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
	const [input, setInput] = useState('');
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const send = (text: string) => {
		if (!text.trim() || busy || !verified) return;
		sendMessage({ text });
		setInput('');
	};

	return (
		<div className={PAGE}>
			<header className="py-6">
				<h1 className={PAGE_TITLE}>Career Explorer</h1>
				<p className={PAGE_SUBTITLE}>
					Ask about careers. Answers use O*NET 31.0 data via local tools and your Sanity dataset.
				</p>
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
							return (
								<MotBubble key={i}>
									<MarkdownText text={part.text} components={MARKDOWN_COMPONENTS} />
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
				<input
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="What kind of work interests you?"
					className={`${INPUT} min-h-11 flex-1`}
				/>
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
	);
}
