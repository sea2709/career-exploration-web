import { PortableText, type PortableTextComponents } from '@portabletext/react';
import { useEffect, useState } from 'react';
import type { COACHING_GUIDES_QUERY_RESULT } from '../../sanity.types';
import { EYEBROW, INPUT } from './chat/styles';

type CoachingGuide = COACHING_GUIDES_QUERY_RESULT[number];

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

const BODY_COMPONENTS: PortableTextComponents = {
	block: {
		normal: ({ children }) => <p className="mb-2 text-ink-muted">{children}</p>,
		h3: ({ children }) => <p className="mt-3 mb-1 font-bold">{children}</p>,
	},
	list: {
		bullet: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 text-ink-muted">{children}</ul>,
	},
};

function GuideItem({ guide }: { guide: CoachingGuide }) {
	return (
		<details className="rounded-[18px] border border-line bg-white open:border-accent">
			<summary className="cursor-pointer list-none space-y-1 p-3 [&::-webkit-details-marker]:hidden">
				<p className="font-display font-semibold">{guide.title}</p>
				{guide.summary && <p className="text-xs text-ink-muted">{guide.summary}</p>}
				{guide.jobZones?.length ? (
					<p className="text-xs font-semibold text-accent">Job Zone {guide.jobZones.join(', ')}</p>
				) : null}
			</summary>
			{guide.body && (
				<div className="border-t border-line p-3 text-sm">
					<PortableText value={guide.body} components={BODY_COMPONENTS} />
				</div>
			)}
		</details>
	);
}

/** Lists the published coaching guides beside the interview. A drawer below the lg breakpoint. */
export default function CoachingGuidesPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
	const [guides, setGuides] = useState<CoachingGuide[] | null>(null);
	const [failed, setFailed] = useState(false);
	const [query, setQuery] = useState('');

	useEffect(() => {
		fetch('/api/coaching-guides')
			.then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
			.then(setGuides)
			.catch(() => setFailed(true));
	}, []);

	const q = query.trim().toLowerCase();
	const visible = (guides ?? []).filter((g) => !q || `${g.title} ${g.summary}`.toLowerCase().includes(q));
	const groups = CATEGORIES.map(([value, label]) => ({
		value,
		label,
		guides: visible.filter((g) => g.category === value),
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
				<input
					type="search"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search guides"
					aria-label="Search coaching guides"
					className={`${INPUT} w-full text-sm`}
				/>
				<div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
					{failed && <p className="text-sm text-ink-muted">Couldn't load the coaching guides. Try again later.</p>}
					{!failed && !guides && <p className="text-sm text-ink-muted">Loading guides…</p>}
					{guides && groups.length === 0 && (
						<p className="text-sm text-ink-muted">{q ? 'No guides match your search.' : 'No guides published yet.'}</p>
					)}
					{groups.map((group) => (
						<section key={group.value} className="space-y-2">
							<h2 className="text-sm font-bold">{group.label}</h2>
							{group.guides.map((guide) => (
								<GuideItem key={guide._id} guide={guide} />
							))}
						</section>
					))}
				</div>
			</aside>
		</>
	);
}
