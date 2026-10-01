import { getToolName, isToolUIPart, type UIMessage } from 'ai';
import { useEffect, useRef, useState } from 'react';
import CoachingGuidesPanel from './CoachingGuidesPanel';
import HumanCheck from './HumanCheck';
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

/** Mirrors the scoreAnswer / finishInterview tool inputs in ../../agent/src/interview-agent.ts. */
type InterviewScore = {
	questionNumber: number;
	question: string;
	competency: string;
	rating: number;
	demonstratedLevel: number | null;
	requiredLevel: number | null;
	anchorUsed: string | null;
	strengths: string[];
	improvements: string[];
	strongerAnswerTip: string;
};

type InterviewReport = {
	role: string;
	overallRating: number;
	readiness: 'not-yet' | 'getting-there' | 'ready';
	summary: string;
	strengths: string[];
	focusAreas: { competency: string; why: string; practice: string }[];
};

type Focus = 'mixed' | 'behavioral' | 'skills';

type SetupMetadata = { kind: 'setup'; job: string; count: number; focus: Focus };

type ToolPart = Parameters<typeof getToolName>[0];

const QUESTION_COUNTS = [3, 5, 7];

const FOCUS_OPTIONS: { value: Focus; label: string; hint: string }[] = [
	{ value: 'mixed', label: 'Mixed', hint: 'Both kinds of questions' },
	{ value: 'behavioral', label: 'Behavioral', hint: '“Tell me about a time…”' },
	{ value: 'skills', label: 'Skills', hint: '“How would you…”' },
];

const JOB_SUGGESTIONS = ['Registered Nurse', 'Data Scientist', 'Electrician', 'Project Manager', 'Graphic Designer'];

const READINESS: Record<InterviewReport['readiness'], { label: string; className: string }> = {
	'not-yet': { label: 'Not yet', className: 'bg-red-100 text-red-800' },
	'getting-there': { label: 'Getting there', className: 'bg-amber-100 text-amber-800' },
	ready: { label: 'Interview ready', className: 'bg-emerald-100 text-emerald-800' },
};

const PREP_LABELS: Record<string, string> = {
	searchOccupations: 'Finding the role',
	getInterviewBrief: 'Reading O*NET interview brief',
	initial_context: 'Reading coaching outline',
	knowledge_base_read: 'Reading coaching guidance',
	scoreAnswer: 'Scoring your answer',
	finishInterview: 'Writing your report',
};

function toolOutput<T>(part: ToolPart, name: string): T | null {
	return getToolName(part) === name && part.state === 'output-available' ? (part.output as T) : null;
}

function setupOf(message: UIMessage): SetupMetadata | null {
	const meta = message.metadata as SetupMetadata | undefined;
	return meta?.kind === 'setup' ? meta : null;
}

function RatingDots({ rating }: { rating: number }) {
	return (
		<span className="inline-flex gap-1" aria-label={`${rating} out of 5`}>
			{[1, 2, 3, 4, 5].map((n) => (
				<span
					key={n}
					className={`size-2.5 rounded-full ${n <= Math.round(rating) ? (rating >= 4 ? 'bg-emerald-500' : rating >= 3 ? 'bg-amber-400' : 'bg-red-400') : 'bg-line'}`}
				/>
			))}
		</span>
	);
}

/** Demonstrated vs required level on O*NET's 0–7 Level scale. */
function LevelBar({ demonstrated, required }: { demonstrated: number; required: number | null }) {
	const pct = (v: number) => `${(Math.min(Math.max(v, 0), 7) / 7) * 100}%`;
	return (
		<div className="space-y-1">
			<div className="relative h-2 rounded-full bg-accent-soft">
				<div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: pct(demonstrated) }} />
				{required != null && (
					<div className="absolute -inset-y-1 w-0.5 bg-ink" style={{ left: pct(required) }} title="Required level" />
				)}
			</div>
			<p className="text-xs text-ink-muted">
				Demonstrated level {demonstrated.toFixed(1)}
				{required != null && <> · job needs about {required.toFixed(1)}</>} (O*NET 0–7 scale)
			</p>
		</div>
	);
}

function ScoreCard({ score }: { score: InterviewScore }) {
	return (
		<div className={`${CARD} space-y-3 text-sm`}>
			<div className="flex items-center justify-between gap-2">
				<p className="font-display text-base font-semibold">
					Feedback · Question {score.questionNumber} · {score.competency}
				</p>
				<RatingDots rating={score.rating} />
			</div>
			{score.demonstratedLevel != null && (
				<LevelBar demonstrated={score.demonstratedLevel} required={score.requiredLevel} />
			)}
			{score.anchorUsed && (
				<p className="text-xs text-ink-muted">
					Closest O*NET example: <span className="italic">“{score.anchorUsed}”</span>
				</p>
			)}
			<div className="grid gap-3 sm:grid-cols-2">
				{score.strengths.length > 0 && (
					<div>
						<p className="font-bold text-emerald-700">What worked</p>
						<ul className="list-disc space-y-1 pl-5 text-ink-muted">
							{score.strengths.map((s) => (
								<li key={s}>{s}</li>
							))}
						</ul>
					</div>
				)}
				{score.improvements.length > 0 && (
					<div>
						<p className="font-bold text-amber-700">To improve</p>
						<ul className="list-disc space-y-1 pl-5 text-ink-muted">
							{score.improvements.map((s) => (
								<li key={s}>{s}</li>
							))}
						</ul>
					</div>
				)}
			</div>
			<p className={`${INSET} text-ink-muted`}>
				<span className="font-bold text-ink">Stronger answer: </span>
				{score.strongerAnswerTip}
			</p>
		</div>
	);
}

function ReportCard({ report }: { report: InterviewReport }) {
	const readiness = READINESS[report.readiness];
	return (
		<div className="space-y-4 self-stretch rounded-[22px] border-[1.5px] border-accent bg-white p-5 shadow-bubble">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<p className={EYEBROW}>Interview report</p>
					<p className="font-display text-xl font-semibold">{report.role}</p>
				</div>
				<div className="flex items-center gap-3">
					<RatingDots rating={report.overallRating} />
					<span className="text-sm text-ink-muted">{report.overallRating.toFixed(1)} / 5</span>
					<span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${readiness.className}`}>
						{readiness.label}
					</span>
				</div>
			</div>
			<p className="text-ink-muted">{report.summary}</p>
			{report.strengths.length > 0 && (
				<div>
					<p className="text-sm font-bold text-emerald-700">Strengths</p>
					<ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
						{report.strengths.map((s) => (
							<li key={s}>{s}</li>
						))}
					</ul>
				</div>
			)}
			{report.focusAreas.length > 0 && (
				<div className="space-y-2">
					<p className="text-sm font-bold text-amber-700">Focus areas</p>
					{report.focusAreas.map((f) => (
						<div key={f.competency} className={`${INSET} text-sm`}>
							<p className="font-bold">{f.competency}</p>
							<p className="text-ink-muted">{f.why}</p>
							<p className="mt-1 text-ink-muted">
								<span className="font-bold text-ink">Practice: </span>
								{f.practice}
							</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function StatusChip({ part }: { part: ToolPart }) {
	const done = part.state === 'output-available';
	const failed = part.state === 'output-error';
	const input = part.input as { query?: string; code?: string; path?: string } | undefined;
	const detail = input?.query ?? input?.code ?? input?.path;
	return (
		<div className={STATUS_CHIP}>
			<span
				className={`size-2 rounded-full ${failed ? 'bg-red-500' : done ? 'bg-emerald-500' : 'animate-pulse bg-amber-400'}`}
			/>
			{PREP_LABELS[getToolName(part)] ?? getToolName(part)}
			{detail ? <code className="font-normal text-ink-muted/80">{detail}</code> : null}
		</div>
	);
}

function SetupForm({ disabled, onStart }: { disabled: boolean; onStart: (setup: SetupMetadata) => void }) {
	const [job, setJob] = useState(() => new URLSearchParams(window.location.search).get('job') ?? '');
	const [count, setCount] = useState(5);
	const [focus, setFocus] = useState<Focus>('mixed');

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				if (job.trim()) onStart({ kind: 'setup', job: job.trim(), count, focus });
			}}
			className={`${CARD} space-y-6`}
		>
			<div className="space-y-2">
				<label htmlFor="job" className="font-bold">
					What job are you interviewing for?
				</label>
				<input
					id="job"
					value={job}
					onChange={(e) => setJob(e.target.value)}
					placeholder="e.g. Registered Nurse"
					className={`${INPUT} w-full`}
				/>
				<div className="flex flex-wrap gap-2">
					{JOB_SUGGESTIONS.map((s) => (
						<button key={s} type="button" onClick={() => setJob(s)} className={PILL}>
							{s}
						</button>
					))}
				</div>
			</div>

			<fieldset className="space-y-2">
				<legend className="font-bold">Number of questions</legend>
				<div className="flex gap-2">
					{QUESTION_COUNTS.map((n) => (
						<button
							key={n}
							type="button"
							onClick={() => setCount(n)}
							aria-pressed={count === n}
							className="size-11 rounded-full border border-line bg-white font-display font-semibold text-ink-muted hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-white"
						>
							{n}
						</button>
					))}
				</div>
			</fieldset>

			<fieldset className="space-y-2">
				<legend className="font-bold">Question style</legend>
				<div className="grid gap-2 sm:grid-cols-3">
					{FOCUS_OPTIONS.map((o) => (
						<button
							key={o.value}
							type="button"
							onClick={() => setFocus(o.value)}
							aria-pressed={focus === o.value}
							className={CHOICE}
						>
							<p className="font-display font-semibold">{o.label}</p>
							<p className="text-xs text-ink-muted">{o.hint}</p>
						</button>
					))}
				</div>
			</fieldset>

			<button type="submit" disabled={disabled || !job.trim()} className={PRIMARY_BUTTON}>
				Start interview
			</button>
		</form>
	);
}

export default function InterviewCoach() {
	const { messages, sendMessage, setMessages, status, error, stop, busy, verified, onVerified } =
		useVerifiedChat('/api/interview');
	const [answer, setAnswer] = useState('');
	const [guidesOpen, setGuidesOpen] = useState(false);
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const setup = messages.map(setupOf).find(Boolean) ?? null;
	const toolParts = messages.flatMap((m) => m.parts.filter(isToolUIPart));
	const answered = toolParts.filter((p) => toolOutput<InterviewScore>(p, 'scoreAnswer')).length;
	const finished = toolParts.some((p) => toolOutput<InterviewReport>(p, 'finishInterview'));

	const start = (meta: SetupMetadata) => {
		sendMessage({
			text: `Start my mock interview.\nTarget job: ${meta.job}\nNumber of questions: ${meta.count}\nFocus: ${meta.focus}`,
			metadata: meta,
		});
	};

	const send = (text: string) => {
		if (!text.trim() || busy || !verified) return;
		sendMessage({ text });
		setAnswer('');
	};

	const restart = () => {
		stop();
		setMessages([]);
		setAnswer('');
	};

	return (
		<div className="mx-auto flex h-full max-w-[1180px] gap-6 lg:px-5">
			<div className={`${PAGE} min-w-0 flex-1`}>
				<header className="flex items-start justify-between gap-4 py-6">
					<div>
						<h1 className={PAGE_TITLE}>Mock Interview Coach</h1>
						<p className={PAGE_SUBTITLE}>
							{setup
								? `${setup.job} · ${setup.focus} · ${finished ? 'complete' : `question ${Math.min(answered + 1, setup.count)} of ${setup.count}`}`
								: 'Practice answering questions for a real occupation, graded against O*NET skill levels.'}
						</p>
					</div>
					<div className="flex shrink-0 flex-wrap justify-end gap-2">
						<button type="button" onClick={() => setGuidesOpen(true)} className={`${OUTLINE_BUTTON} lg:hidden`}>
							Coaching guides
						</button>
						{setup && (
							<button type="button" onClick={restart} className={OUTLINE_BUTTON}>
								New interview
							</button>
						)}
					</div>
				</header>

				{setup && (
					<div className="mb-4 h-1.5 rounded-full bg-line">
						<div
							className="h-full rounded-full bg-accent transition-all"
							style={{ width: `${(Math.min(answered, setup.count) / setup.count) * 100}%` }}
						/>
					</div>
				)}

				<section className="flex-1 space-y-6 overflow-y-auto pb-6">
					{!setup && (
						<MotMessage>
							<MotBubble>
								<p>Let's rehearse. Tell me the job, and I'll ask questions built from what that occupation requires.</p>
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
						const parts = message.parts.flatMap((part, i) => {
							if (part.type === 'text') {
								return (
									<MotBubble key={i}>
										<MarkdownText text={part.text} />
									</MotBubble>
								);
							}
							if (!isToolUIPart(part)) return [];
							const score = toolOutput<InterviewScore>(part, 'scoreAnswer');
							if (score) return <ScoreCard key={i} score={score} />;
							const report = toolOutput<InterviewReport>(part, 'finishInterview');
							if (report) return <ReportCard key={i} report={report} />;
							return <StatusChip key={i} part={part} />;
						});
						return parts.length ? <MotMessage key={message.id}>{parts}</MotMessage> : null;
					})}

					{status === 'submitted' && <ThinkingMessage />}
					{error && <ErrorNote message={error.message} />}
					<div ref={bottomRef} />
				</section>

				{!verified && <HumanCheck onVerified={onVerified} />}

				{setup && (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							send(answer);
						}}
						className="flex items-end gap-2 border-t border-line py-4"
					>
						<textarea
							value={answer}
							onChange={(e) => setAnswer(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault();
									send(answer);
								}
							}}
							rows={3}
							placeholder={
								finished
									? 'Ask for a sample answer, or retry a question…'
									: 'Your answer: the situation, what you did, and the result. Shift+Enter for a new line.'
							}
							className={`${INPUT} flex-1 resize-none`}
						/>
						<div className="flex flex-col gap-2">
							{busy ? (
								<button type="button" onClick={stop} className={STOP_BUTTON}>
									Stop
								</button>
							) : (
								<button type="submit" disabled={!answer.trim() || !verified} className={PRIMARY_BUTTON}>
									Send
								</button>
							)}
							{!finished && !busy && answered > 0 && (
								<button
									type="button"
									onClick={() => send('Please end the interview now and give me my report.')}
									disabled={!verified}
									className="rounded-full px-4 py-1 text-xs font-semibold text-ink-muted hover:text-accent disabled:opacity-40"
								>
									End early
								</button>
							)}
						</div>
					</form>
				)}
			</div>
			<CoachingGuidesPanel open={guidesOpen} onClose={() => setGuidesOpen(false)} />
		</div>
	);
}
