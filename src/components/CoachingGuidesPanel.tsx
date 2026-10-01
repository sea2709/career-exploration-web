import { PortableText, type PortableTextComponents } from '@portabletext/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import remarkGfm from 'remark-gfm';
import type { COACHING_GUIDES_QUERY_RESULT } from '../../sanity.types';
import MarkdownText from './chat/MarkdownText';
import { EYEBROW, INPUT } from './chat/styles';

type CoachingGuide = COACHING_GUIDES_QUERY_RESULT[number];

/** Mirrors CoachingSearchResult in ../../agent/src/coaching-search.ts. */
type CoachingSearchResult = {
	path: string;
	title: string;
	summary: string;
	score: number;
	content: string;
};

type SearchState =
	| { status: 'loading'; query: string }
	| { status: 'done'; query: string; results: CoachingSearchResult[] }
	| { status: 'error'; query: string; message: string };

type Reading = { title: string; meta?: string; summary?: string | null; body: ReactNode };

/** Mirrors COACHING_CATEGORIES in ../../studio/schemaTypes/coaching/coachingGuide.ts, in the same order. */
const CATEGORIES: [NonNullable<CoachingGuide['category']>, string][] = [
	['answering', 'Answering well'],
	['behavioral', 'Behavioral questions'],
	['skills', 'Skills and situational questions'],
	['workStyles', 'Work styles'],
	['grading', 'Grading answers'],
	['feedback', 'Giving feedback'],
	['situations', 'Candidate situations'],
	['practice', 'Practice and preparation'],
];

const SEARCH_FAILED = "Couldn't search the coaching guidance. Try again later.";
const NEEDS_HUMAN_CHECK = 'Complete the human check on this page, then search again.';

const BODY_COMPONENTS: PortableTextComponents = {
	block: {
		normal: ({ children }) => <p className="mb-2 text-ink-muted">{children}</p>,
		h3: ({ children }) => <p className="mt-3 mb-1 font-bold">{children}</p>,
	},
	list: {
		bullet: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 text-ink-muted">{children}</ul>,
	},
};

const CARD_BUTTON = 'block w-full space-y-1 rounded-[18px] border border-line bg-white p-3 text-left hover:border-accent';

function jobZoneLabel(guide: CoachingGuide): string | undefined {
	return guide.jobZones?.length ? `Job Zone ${guide.jobZones.join(', ')}` : undefined;
}

function guideReading(guide: CoachingGuide): Reading {
	return {
		title: guide.title ?? 'Untitled guide',
		meta: jobZoneLabel(guide),
		summary: guide.summary,
		body: guide.body ? <PortableText value={guide.body} components={BODY_COMPONENTS} /> : null,
	};
}

function entryReading(entry: CoachingSearchResult): Reading {
	return {
		title: entry.title,
		meta: "From Mot's coaching Knowledge Base",
		summary: entry.summary,
		body: (
			<div className="text-ink-muted [&_code]:rounded [&_code]:bg-canvas [&_code]:px-1 [&_code]:text-xs [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-ink [&_table]:w-full [&_table]:text-left [&_td]:border-t [&_td]:border-line [&_td]:py-1.5 [&_td]:pr-3 [&_td]:align-top [&_th]:pb-1 [&_th]:pr-3 [&_th]:text-ink">
				<MarkdownText text={entry.content} remarkPlugins={[remarkGfm]} />
			</div>
		),
	};
}

function GuideItem({ guide, onOpen }: { guide: CoachingGuide; onOpen: (guide: CoachingGuide) => void }) {
	const jobZones = jobZoneLabel(guide);
	return (
		<button type="button" onClick={() => onOpen(guide)} className={CARD_BUTTON}>
			<span className="block font-display font-semibold">{guide.title}</span>
			{guide.summary && <span className="block text-xs text-ink-muted">{guide.summary}</span>}
			{jobZones && <span className="block text-xs font-semibold text-accent">{jobZones}</span>}
		</button>
	);
}

function SearchResultItem({
	result,
	onOpen,
}: {
	result: CoachingSearchResult;
	onOpen: (result: CoachingSearchResult) => void;
}) {
	return (
		<button type="button" onClick={() => onOpen(result)} className={CARD_BUTTON}>
			<span className="block font-display font-semibold">{result.title}</span>
			<span className="line-clamp-3 text-xs text-ink-muted">{result.summary}</span>
		</button>
	);
}

function ReadingModal({ reading, onClose }: { reading: Reading | null; onClose: () => void }) {
	const ref = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (reading && !dialog.open) dialog.showModal();
		if (!reading && dialog.open) dialog.close();
	}, [reading]);

	return (
		<dialog
			ref={ref}
			onClose={onClose}
			onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
			aria-labelledby="coaching-reading-title"
			className="m-auto w-[min(600px,calc(100%-2rem))] rounded-[22px] border border-line bg-white text-ink shadow-bubble backdrop:bg-ink/30"
		>
			{reading && (
				<div className="max-h-[85vh] overflow-y-auto p-5">
					<div className="mb-3 flex items-start justify-between gap-3">
						<div className="space-y-1">
							<h2 id="coaching-reading-title" className="font-display text-xl font-semibold">
								{reading.title}
							</h2>
							{reading.meta && <p className="text-xs font-semibold text-accent">{reading.meta}</p>}
						</div>
						<button
							type="button"
							onClick={() => ref.current?.close()}
							className="rounded-full px-2 text-2xl leading-none text-ink-muted hover:text-accent"
							aria-label="Close"
						>
							×
						</button>
					</div>
					{reading.summary && <p className="mb-3 text-sm font-semibold">{reading.summary}</p>}
					{reading.body && <div className="border-t border-line pt-3 text-sm">{reading.body}</div>}
				</div>
			)}
		</dialog>
	);
}

function Chevron({ open }: { open: boolean }) {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			className={`shrink-0 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
		>
			<path d="m6 9 6 6 6-6" />
		</svg>
	);
}

/**
 * Lists the published coaching guides beside the interview. A drawer below the lg breakpoint.
 * Search goes through the agent to the coaching Knowledge Base, so results are its entries.
 */
export default function CoachingGuidesPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
	const [guides, setGuides] = useState<CoachingGuide[] | null>(null);
	const [failed, setFailed] = useState(false);
	const [query, setQuery] = useState('');
	const [search, setSearch] = useState<SearchState | null>(null);
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	const [reading, setReading] = useState<Reading | null>(null);
	const searchAbort = useRef<AbortController | null>(null);

	const toggle = (category: string) =>
		setExpanded((prev) => {
			const next = new Set(prev);
			if (!next.delete(category)) next.add(category);
			return next;
		});

	useEffect(() => {
		fetch('/api/coaching-guides')
			.then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
			.then(setGuides)
			.catch(() => setFailed(true));
		return () => searchAbort.current?.abort();
	}, []);

	const clearSearch = () => {
		searchAbort.current?.abort();
		setSearch(null);
	};

	const runSearch = async () => {
		const q = query.trim();
		if (!q) return clearSearch();

		searchAbort.current?.abort();
		const controller = new AbortController();
		searchAbort.current = controller;
		setSearch({ status: 'loading', query: q });
		try {
			const res = await fetch('/api/coaching-search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: q }),
				signal: controller.signal,
			});
			if (!res.ok) {
				setSearch({ status: 'error', query: q, message: res.status === 403 ? NEEDS_HUMAN_CHECK : SEARCH_FAILED });
				return;
			}
			const { results } = (await res.json()) as { results: CoachingSearchResult[] };
			setSearch({ status: 'done', query: q, results });
		} catch {
			if (!controller.signal.aborted) setSearch({ status: 'error', query: q, message: SEARCH_FAILED });
		}
	};

	const groups = CATEGORIES.map(([value, label]) => ({
		value,
		label,
		guides: (guides ?? []).filter((g) => g.category === value),
	})).filter((group) => group.guides.length > 0);

	return (
		<>
			{open && (
				<button
					type="button"
					aria-label="Close coaching guides"
					onClick={onClose}
					className="fixed inset-0 z-20 bg-ink/20 lg:hidden"
				/>
			)}
			<aside
				aria-label="Coaching guides"
				className={`${open ? 'fixed inset-y-0 right-0 z-30 flex w-[min(360px,100%)] bg-canvas p-5 shadow-bubble' : 'hidden'} flex-col gap-3 lg:static lg:z-auto lg:flex lg:w-[320px] lg:shrink-0 lg:bg-transparent lg:px-0 lg:py-6 lg:shadow-none`}
			>
				<div className="flex items-start justify-between gap-2">
					<div>
						<p className={EYEBROW}>Coaching guides</p>
						<p className="text-sm text-ink-muted">
							Written by career counselors. Mot follows them to ask questions, grade answers, and give feedback.
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-full px-2 text-xl leading-none text-ink-muted hover:text-accent lg:hidden"
						aria-label="Close coaching guides"
					>
						×
					</button>
				</div>
				<form
					role="search"
					onSubmit={(e) => {
						e.preventDefault();
						runSearch();
					}}
				>
					<input
						type="search"
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							if (!e.target.value.trim()) clearSearch();
						}}
						placeholder="Search guidance, then press Enter"
						aria-label="Search coaching guidance"
						enterKeyHint="search"
						className={`${INPUT} w-full text-sm`}
					/>
				</form>
				<div className="min-h-0 flex-1 overflow-y-auto pb-4">
					{search ? (
						<div className="space-y-2" aria-live="polite">
							<div className="flex items-baseline justify-between gap-2">
								<h2 className="text-sm font-bold">Results for “{search.query}”</h2>
								<button
									type="button"
									onClick={() => {
										setQuery('');
										clearSearch();
									}}
									className="shrink-0 text-xs font-semibold text-ink-muted hover:text-accent"
								>
									Clear
								</button>
							</div>
							{search.status === 'loading' && <p className="text-sm text-ink-muted">Searching…</p>}
							{search.status === 'error' && <p className="text-sm text-ink-muted">{search.message}</p>}
							{search.status === 'done' && search.results.length === 0 && (
								<p className="text-sm text-ink-muted">
									Nothing matched. Search looks for exact words, so try different or fewer words.
								</p>
							)}
							{search.status === 'done' &&
								search.results.map((result) => (
									<SearchResultItem
										key={result.path}
										result={result}
										onOpen={(r) => setReading(entryReading(r))}
									/>
								))}
						</div>
					) : (
						<>
							{failed && <p className="text-sm text-ink-muted">Couldn't load the coaching guides. Try again later.</p>}
							{!failed && !guides && <p className="text-sm text-ink-muted">Loading guides…</p>}
							{guides && groups.length === 0 && <p className="text-sm text-ink-muted">No guides published yet.</p>}
							<div className="divide-y divide-line">
								{groups.map((group) => {
									const isOpen = expanded.has(group.value);
									const contentId = `coaching-guides-${group.value}`;
									return (
										<section key={group.value} className="py-1">
											<h2>
												<button
													type="button"
													onClick={() => toggle(group.value)}
													aria-expanded={isOpen}
													aria-controls={contentId}
													className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm font-bold hover:text-accent"
												>
													<span>
														{group.label}{' '}
														<span className="font-semibold text-ink-muted">({group.guides.length})</span>
													</span>
													<Chevron open={isOpen} />
												</button>
											</h2>
											{isOpen && (
												<div id={contentId} className="space-y-2 pb-3">
													{group.guides.map((guide) => (
														<GuideItem key={guide._id} guide={guide} onOpen={(g) => setReading(guideReading(g))} />
													))}
												</div>
											)}
										</section>
									);
								})}
							</div>
						</>
					)}
				</div>
			</aside>
			<ReadingModal reading={reading} onClose={() => setReading(null)} />
		</>
	);
}
