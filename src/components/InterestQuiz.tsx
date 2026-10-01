import { getToolName, isToolUIPart, lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from 'ai';
import { useEffect, useRef, useState } from 'react';
import HumanCheck from './HumanCheck';
import BookmarkButton from './bookmarks/BookmarkButton';
import MarkdownText from './chat/MarkdownText';
import { ErrorNote, MotBubble, MotMessage, ThinkingMessage, UserMessage } from './chat/Messages';
import {
	CARD,
	CHOICE,
	EYEBROW,
	INPUT,
	INSET,
	OUTLINE_BUTTON,
	PAGE,
	PAGE_SUBTITLE,
	PAGE_TITLE,
	PILL,
	PRIMARY_BUTTON,
	STATUS_CHIP,
	STOP_BUTTON,
} from './chat/styles';
import { useVerifiedChat } from './chat/useVerifiedChat';

/** Mirror the tool inputs/outputs in ../../agent/src/quiz-agent.ts and ../../agent/src/onet/interests.ts. */
type Round = 'broad' | 'focused';
type Rating = 'strongly-dislike' | 'dislike' | 'unsure' | 'like' | 'strongly-like';

type QuizActivities = { round: Round; focusTypes?: string[]; activities: { id: string; text: string }[] };

type PresentInput = { round: Round; intro: string };

type RatingsOutput = { ratings: { id: string; rating: Rating }[] };

type InterestProfile = {
	hollandCode: string;
	ratedActivities: number;
	types: { code: string; name: string; score: number; description: string | null; keywords: string[] }[];
	likedAreas: { name: string; score: number }[];
	dislikedAreas: string[];
};

type OccupationMatches = {
	maxJobZone: number | null;
	matches: {
		code: string;
		title: string;
		url: string;
		jobZone: number | null;
		matchPercent: number;
		interestCode: string;
		matchingAreas: string[];
	}[];
};

type SetupMetadata = { kind: 'setup'; maxJobZone: number | null };

type ToolPart = Parameters<typeof getToolName>[0];

const PREPARATION: { value: number | null; label: string; hint: string }[] = [
	{ value: 2, label: 'A little', hint: 'High school, on-the-job training (Job Zone 1–2)' },
	{ value: 3, label: 'Some', hint: 'Vocational school or associate degree (up to 3)' },
	{ value: 4, label: 'A degree', hint: 'Bachelor’s degree (up to 4)' },
	{ value: null, label: 'Any amount', hint: 'Including graduate school (1–5)' },
];

const RATING_OPTIONS: { value: Rating; label: string; className: string }[] = [
	{ value: 'strongly-dislike', label: 'Strongly dislike', className: 'aria-pressed:border-rose-600 aria-pressed:bg-rose-600' },
	{ value: 'dislike', label: 'Dislike', className: 'aria-pressed:border-rose-400 aria-pressed:bg-rose-400' },
	{ value: 'unsure', label: 'Unsure', className: 'aria-pressed:border-ink-muted aria-pressed:bg-ink-muted' },
	{ value: 'like', label: 'Like', className: 'aria-pressed:border-emerald-500 aria-pressed:bg-emerald-500' },
	{ value: 'strongly-like', label: 'Strongly like', className: 'aria-pressed:border-emerald-700 aria-pressed:bg-emerald-700' },
];

const TYPE_COLORS: Record<string, string> = {
	R: 'bg-orange-500',
	I: 'bg-sky-500',
	A: 'bg-fuchsia-500',
	S: 'bg-emerald-500',
	E: 'bg-amber-500',
	C: 'bg-indigo-500',
};

const STATUS_LABELS: Record<string, string> = {
	getQuizActivities: 'Picking activities',
	buildInterestProfile: 'Scoring your interests',
	matchOccupations: 'Matching occupations',
	searchOccupations: 'Searching occupations',
	getOccupationProfile: 'Reading O*NET profile',
	getRelatedOccupations: 'Finding related occupations',
};

function toolOutput<T>(part: ToolPart, name: string): T | null {
	return getToolName(part) === name && part.state === 'output-available' ? (part.output as T) : null;
}

function setupOf(message: UIMessage): SetupMetadata | null {
	const meta = message.metadata as SetupMetadata | undefined;
	return meta?.kind === 'setup' ? meta : null;
}

function StatusChip({ part }: { part: ToolPart }) {
	const done = part.state === 'output-available';
	const failed = part.state === 'output-error';
	const input = part.input as { query?: string; code?: string } | undefined;
	const detail = input?.query ?? input?.code;
	return (
		<div className={STATUS_CHIP}>
			<span
				className={`size-2 rounded-full ${failed ? 'bg-red-500' : done ? 'bg-emerald-500' : 'animate-pulse bg-amber-400'}`}
			/>
			{STATUS_LABELS[getToolName(part)] ?? getToolName(part)}
			{detail ? <code className="font-normal text-ink-muted/80">{detail}</code> : null}
		</div>
	);
}

function ActivityCard({
	input,
	activities,
	disabled,
	onSubmit,
}: {
	input: PresentInput;
	activities: QuizActivities['activities'];
	disabled: boolean;
	onSubmit: (output: RatingsOutput) => void;
}) {
	const [ratings, setRatings] = useState<Record<string, Rating>>({});
	const rated = activities.filter((a) => ratings[a.id]).length;

	return (
		<div className={`${CARD} space-y-4`}>
			<div className="flex items-baseline justify-between gap-2">
				<p className="font-display text-lg font-semibold">{input.intro}</p>
				<p className="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">
					{rated} / {activities.length} rated
				</p>
			</div>
			<ul className="divide-y divide-line">
				{activities.map((activity) => (
					<li key={activity.id} className="space-y-2 py-3">
						<p className="text-sm">{activity.text}</p>
						<div className="grid grid-cols-5 gap-1.5" role="group" aria-label={activity.text}>
							{RATING_OPTIONS.map((option) => (
								<button
									key={option.value}
									type="button"
									aria-pressed={ratings[activity.id] === option.value}
									onClick={() => setRatings((r) => ({ ...r, [activity.id]: option.value }))}
									className={`rounded-full border border-line bg-white px-1 py-1.5 text-xs font-semibold text-ink-muted hover:border-accent aria-pressed:text-white ${option.className}`}
								>
									{option.label}
								</button>
							))}
						</div>
					</li>
				))}
			</ul>
			<div className="flex flex-wrap items-center gap-3">
				<button
					type="button"
					disabled={disabled || rated < activities.length}
					onClick={() =>
						onSubmit({ ratings: activities.map((a) => ({ id: a.id, rating: ratings[a.id] })) })
					}
					className={PRIMARY_BUTTON}
				>
					Submit ratings
				</button>
				<button
					type="button"
					disabled={disabled}
					onClick={() =>
						setRatings((r) => ({ ...Object.fromEntries(activities.map((a) => [a.id, 'unsure' as const])), ...r }))
					}
					className="text-xs font-semibold text-ink-muted hover:text-accent disabled:opacity-40"
				>
					Mark the rest “Unsure”
				</button>
			</div>
		</div>
	);
}

function RatedSummary({ output }: { output: RatingsOutput }) {
	const count = (...values: Rating[]) => output.ratings.filter((x) => values.includes(x.rating)).length;
	return (
		<p className="text-sm text-ink-muted">
			Rated {output.ratings.length} activities: {count('like', 'strongly-like')} liked, {count('unsure')} unsure,{' '}
			{count('dislike', 'strongly-dislike')} disliked.
		</p>
	);
}

function ProfileCard({ profile }: { profile: InterestProfile }) {
	const top = profile.types.slice(0, 3);
	return (
		<div className={`${CARD} space-y-4`}>
			<div className="flex flex-wrap items-end justify-between gap-2">
				<div>
					<p className={EYEBROW}>Your interest code</p>
					<p className="flex gap-1 font-display text-3xl font-semibold">
						{profile.hollandCode.split('').map((c) => (
							<span key={c} className={`rounded-lg px-2 text-white ${TYPE_COLORS[c] ?? 'bg-ink'}`}>
								{c}
							</span>
						))}
					</p>
				</div>
				<p className="text-xs text-ink-muted">
					{top.map((t) => t.name).join(' · ')} · from {profile.ratedActivities} ratings
				</p>
			</div>

			<div className="space-y-2">
				{profile.types.map((t) => (
					<div key={t.code} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3 text-sm">
						<span className="text-ink-muted">{t.name}</span>
						<div className="h-2.5 rounded-full bg-canvas">
							<div
								className={`h-full rounded-full ${TYPE_COLORS[t.code] ?? 'bg-ink'}`}
								style={{ width: `${((t.score - 1) / 6) * 100}%` }}
							/>
						</div>
						<span className="text-right text-xs text-ink-muted">{t.score.toFixed(1)}</span>
					</div>
				))}
				<p className="text-xs text-ink-muted/80">O*NET interest scale, 1–7</p>
			</div>

			<div className="grid gap-3 sm:grid-cols-3">
				{top.map((t) => (
					<div key={t.code} className={`${INSET} text-sm`}>
						<p className="font-display font-semibold">{t.name}</p>
						{t.description && <p className="mt-1 text-xs text-ink-muted">{t.description}</p>}
						<div className="mt-2 flex flex-wrap gap-1">
							{t.keywords.map((k) => (
								<span key={k} className="rounded-full bg-white px-2 py-0.5 text-xs text-ink-muted ring-1 ring-line">
									{k}
								</span>
							))}
						</div>
					</div>
				))}
			</div>

			{profile.likedAreas.length > 0 && (
				<div className="text-sm">
					<p className="font-bold text-emerald-700">Areas you liked</p>
					<div className="mt-1 flex flex-wrap gap-1">
						{profile.likedAreas.map((a) => (
							<span
								key={a.name}
								className={`rounded-full px-2.5 py-0.5 text-xs ${a.score >= 7 ? 'bg-emerald-100 text-emerald-800' : 'bg-canvas text-ink-muted'}`}
							>
								{a.name}
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function MatchList({ result }: { result: OccupationMatches }) {
	if (!result.matches.length) {
		return <p className="text-sm text-ink-muted">No matching occupations at this preparation level.</p>;
	}
	return (
		<div className={`${CARD} space-y-2`}>
			<p className={EYEBROW}>
				Best-fit occupations{result.maxJobZone ? ` · Job Zone ${result.maxJobZone} or below` : ''}
			</p>
			<ol className="divide-y divide-line">
				{result.matches.map((m) => (
					<li key={m.code} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
						<span
							className={`w-11 font-display text-sm font-semibold ${m.matchPercent >= 85 ? 'text-emerald-700' : m.matchPercent >= 70 ? 'text-amber-700' : 'text-ink-muted'}`}
						>
							{m.matchPercent}%
						</span>
						<div className="min-w-0 flex-1">
							<a href={m.url} target="_blank" rel="noreferrer" className="font-bold text-ink hover:text-accent hover:underline">
								{m.title}
							</a>
							<p className="text-xs text-ink-muted">
								{[m.interestCode && `Interest code ${m.interestCode}`, m.jobZone && `Job Zone ${m.jobZone}`, ...m.matchingAreas]
									.filter(Boolean)
									.join(' · ')}
							</p>
						</div>
						<div className="flex shrink-0 gap-2">
							<BookmarkButton
								occupation={{ code: m.code, title: m.title, url: m.url, jobZone: m.jobZone }}
								className="px-3 py-1"
							/>
							<a href={`/interview?job=${encodeURIComponent(m.title)}`} className={PILL}>
								Practice interview
							</a>
						</div>
					</li>
				))}
			</ol>
		</div>
	);
}

function SetupForm({ disabled, onStart }: { disabled: boolean; onStart: (setup: SetupMetadata) => void }) {
	const [maxJobZone, setMaxJobZone] = useState<number | null>(null);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				onStart({ kind: 'setup', maxJobZone });
			}}
			className={`${CARD} space-y-6`}
		>
			<fieldset className="space-y-2" aria-describedby="preparation-help">
				<legend className="font-bold">How much preparation are you open to?</legend>
				<div id="preparation-help" className="space-y-1 text-xs text-ink-muted">
					<p>
						Pick the most school or training you'd be willing to complete for the right career, not what you have
						today. Careers that usually need more than that are left out of your matches. Your activity ratings are
						scored the same either way.
					</p>
					<p>
						Levels follow O*NET's Job Zones, from 1 (little or no preparation) to 5 (usually a graduate degree). Not
						sure? Keep “Any amount” to see everything.
					</p>
				</div>
				<div className="grid gap-2 sm:grid-cols-2">
					{PREPARATION.map((o) => (
						<button
							key={o.label}
							type="button"
							onClick={() => setMaxJobZone(o.value)}
							aria-pressed={maxJobZone === o.value}
							className={CHOICE}
						>
							<p className="font-display font-semibold">{o.label}</p>
							<p className="text-xs text-ink-muted">{o.hint}</p>
						</button>
					))}
				</div>
			</fieldset>

			<button type="submit" disabled={disabled} className={PRIMARY_BUTTON}>
				Start quiz
			</button>
		</form>
	);
}

export default function InterestQuiz() {
	const { messages, sendMessage, setMessages, addToolOutput, status, error, stop, busy, verified, onVerified } =
		useVerifiedChat('/api/quiz', { sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls });
	const [question, setQuestion] = useState('');
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const setup = messages.map(setupOf).find(Boolean) ?? null;
	const toolParts = messages.flatMap((m) => m.parts.filter(isToolUIPart));
	const activitySets = new Map<Round, QuizActivities>();
	for (const part of toolParts) {
		const set = toolOutput<QuizActivities>(part, 'getQuizActivities');
		if (set?.activities) activitySets.set(set.round, set);
	}
	const answeredRounds = new Set(
		toolParts
			.filter((p) => getToolName(p) === 'presentActivities' && p.state === 'output-available')
			.map((p) => (p.input as PresentInput).round),
	);
	const awaitingRatings = toolParts.some((p) => getToolName(p) === 'presentActivities' && p.state === 'input-available');
	const hasResults = toolParts.some((p) => toolOutput<InterestProfile>(p, 'buildInterestProfile'));
	const step = hasResults ? 'Results' : answeredRounds.has('broad') ? 'Round 2 of 2' : 'Round 1 of 2';

	const start = (meta: SetupMetadata) => {
		sendMessage({
			text: `Start the interest quiz.\nPreparation: ${meta.maxJobZone ? `up to Job Zone ${meta.maxJobZone}` : 'any'}`,
			metadata: meta,
		});
	};

	const send = (text: string) => {
		if (!text.trim() || busy || !verified) return;
		sendMessage({ text });
		setQuestion('');
	};

	const restart = () => {
		stop();
		setMessages([]);
		setQuestion('');
	};

	const renderPart = (part: UIMessage['parts'][number], i: number) => {
		if (part.type === 'text') {
			return (
				<MotBubble key={i}>
					<MarkdownText text={part.text} />
				</MotBubble>
			);
		}
		if (!isToolUIPart(part)) return null;
		const name = getToolName(part);

		if (name === 'getQuizActivities' && part.state === 'output-available') return null;
		if (name === 'presentActivities') {
			if (part.state === 'output-available') {
				return <RatedSummary key={i} output={part.output as RatingsOutput} />;
			}
			if (part.state !== 'input-available') return null;
			const input = part.input as PresentInput;
			const set = activitySets.get(input.round);
			if (!set) return <StatusChip key={i} part={part} />;
			return (
				<ActivityCard
					key={part.toolCallId}
					input={input}
					activities={set.activities}
					disabled={busy || !verified}
					onSubmit={(output) => addToolOutput({ tool: 'presentActivities', toolCallId: part.toolCallId, output })}
				/>
			);
		}
		const profile = toolOutput<InterestProfile>(part, 'buildInterestProfile');
		if (profile?.types) return <ProfileCard key={i} profile={profile} />;
		const matches = toolOutput<OccupationMatches>(part, 'matchOccupations');
		if (matches?.matches) return <MatchList key={i} result={matches} />;
		return <StatusChip key={i} part={part} />;
	};

	return (
		<div className={PAGE}>
			<header className="flex items-start justify-between gap-4 py-6">
				<div>
					<h1 className={PAGE_TITLE}>Interest Quiz</h1>
					<p className={PAGE_SUBTITLE}>
						{setup
							? `${step} · ${setup.maxJobZone ? `Job Zone ${setup.maxJobZone} or below` : 'any preparation level'}`
							: 'Find occupations that fit what you enjoy, using the O*NET RIASEC interest model.'}
					</p>
				</div>
				{setup && (
					<button type="button" onClick={restart} className={`${OUTLINE_BUTTON} shrink-0`}>
						Retake quiz
					</button>
				)}
			</header>

			<section className="flex-1 space-y-6 overflow-y-auto pb-6">
				{!setup && (
					<MotMessage>
						<MotBubble>
							<p>
								Rate about 35 everyday work activities by whether you'd <em>enjoy</em> them, not whether you have the
								experience. Your answers become a RIASEC interest profile, matched against how O*NET rates every
								occupation.
							</p>
						</MotBubble>
						<SetupForm disabled={!verified || busy} onStart={start} />
					</MotMessage>
				)}

				{messages.map((message) => {
					if (setupOf(message)) return null;
					if (message.role === 'user') {
						return (
							<UserMessage key={message.id}>
								{message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('')}
							</UserMessage>
						);
					}
					const parts = message.parts.map(renderPart).filter(Boolean);
					return parts.length ? <MotMessage key={message.id}>{parts}</MotMessage> : null;
				})}

				{status === 'submitted' && <ThinkingMessage />}
				{error && <ErrorNote message={error.message} />}
				<div ref={bottomRef} />
			</section>

			{!verified && <HumanCheck onVerified={onVerified} />}

			{setup && hasResults && !awaitingRatings && (
				<form
					onSubmit={(e) => {
						e.preventDefault();
						send(question);
					}}
					className="flex items-end gap-2 border-t border-line py-4"
				>
					<input
						value={question}
						onChange={(e) => setQuestion(e.target.value)}
						placeholder="Ask about a match, or try “show jobs with less training”…"
						className={`${INPUT} min-h-11 flex-1`}
					/>
					{busy ? (
						<button type="button" onClick={stop} className={STOP_BUTTON}>
							Stop
						</button>
					) : (
						<button type="submit" disabled={!question.trim() || !verified} className={PRIMARY_BUTTON}>
							Send
						</button>
					)}
				</form>
			)}
		</div>
	);
}
