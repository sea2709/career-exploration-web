import { useEffect, useState } from 'react';
import type { SavedOccupationDetails } from '../pages/api/saved-occupations';
import { removeBookmark, useBookmarks, type Bookmark } from './bookmarks/useBookmarks';
import { EYEBROW, OUTLINE_BUTTON, PILL } from './chat/styles';

/** `null` means Sanity had no occupation for that code; a missing key means it hasn't loaded yet. */
type DetailsByCode = Record<string, SavedOccupationDetails | null>;

function SavedItem({
	bookmark,
	details,
	loading,
}: {
	bookmark: Bookmark;
	details: SavedOccupationDetails | null | undefined;
	loading: boolean;
}) {
	const jobZone = details?.jobZone ?? (bookmark.jobZone ? { level: bookmark.jobZone, label: '' } : null);
	return (
		<div className="relative">
			<details className="rounded-[18px] border border-line bg-white open:border-accent">
				<summary className="cursor-pointer list-none space-y-1 p-3 [&::-webkit-details-marker]:hidden">
					<p className="pr-7 font-display font-semibold">{bookmark.title}</p>
					{jobZone && (
						<p className="text-xs font-semibold text-accent">
							Job Zone {jobZone.level}
							{jobZone.label ? ` · ${jobZone.label}` : ''}
						</p>
					)}
					{details?.education && (
						<p className="text-xs text-ink-muted">
							Typical education: {details.education.category} ({details.education.percent}%)
						</p>
					)}
					{details?.interests.length ? (
						<div className="flex flex-wrap gap-1 pt-0.5">
							{details.interests.map((interest) => (
								<span key={interest} className="rounded-full bg-canvas px-2 py-0.5 text-xs text-ink-muted">
									{interest}
								</span>
							))}
						</div>
					) : null}
					{loading && <p className="text-xs text-ink-muted">Loading details…</p>}
				</summary>
				<div className="space-y-2 border-t border-line p-3 text-sm">
					{details?.description && <p className="text-ink-muted">{details.description}</p>}
					{details?.topSkills.length ? (
						<p>
							<span className="font-bold">Top skills:</span> {details.topSkills.join(', ')}
						</p>
					) : null}
					<div className="flex flex-wrap items-center gap-2 pt-1">
						<a href={bookmark.url} target="_blank" rel="noreferrer" className={`${PILL} no-underline`}>
							View more on O*NET
						</a>
						<a href={`/interview?job=${encodeURIComponent(bookmark.title)}`} className={`${PILL} no-underline`}>
							Practice interview
						</a>
					</div>
				</div>
			</details>
			<button
				type="button"
				onClick={() => removeBookmark(bookmark.code)}
				aria-label={`Remove ${bookmark.title} from saved occupations`}
				title="Remove"
				className="absolute top-2 right-2 rounded-full p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600"
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
					className="size-4"
				>
					<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6M10 11v6M14 11v6" />
				</svg>
			</button>
		</div>
	);
}

/** Lists the visitor's saved occupations beside the Career Explorer chat. A drawer below the lg breakpoint. */
export default function SavedOccupationsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
	const bookmarks = useBookmarks();
	const [details, setDetails] = useState<DetailsByCode>({});
	const [failed, setFailed] = useState(false);

	const missing = bookmarks.map((b) => b.code).filter((code) => !(code in details));
	const missingKey = missing.join(',');

	useEffect(() => {
		if (!missingKey) return;
		let cancelled = false;
		const codes = missingKey.split(',');
		fetch(`/api/saved-occupations?codes=${encodeURIComponent(missingKey)}`)
			.then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
			.then((rows: SavedOccupationDetails[]) => {
				if (cancelled) return;
				const found = new Map(rows.map((r) => [r.code, r]));
				setDetails((d) => ({ ...d, ...Object.fromEntries(codes.map((c) => [c, found.get(c) ?? null])) }));
				setFailed(false);
			})
			.catch(() => {
				if (!cancelled) setFailed(true);
			});
		return () => {
			cancelled = true;
		};
	}, [missingKey]);

	return (
		<>
			{open && (
				<button
					type="button"
					aria-label="Close saved occupations"
					onClick={onClose}
					className="fixed inset-0 z-20 bg-ink/20 lg:hidden"
				/>
			)}
			<aside
				aria-label="Saved occupations"
				className={`${open ? 'fixed inset-y-0 right-0 z-30 flex w-[min(360px,100%)] bg-canvas p-5 shadow-bubble' : 'hidden'} flex-col gap-3 lg:static lg:z-auto lg:flex lg:w-[320px] lg:shrink-0 lg:bg-transparent lg:px-0 lg:py-6 lg:shadow-none`}
			>
				<div className="flex items-start justify-between gap-2">
					<div>
						<p className={EYEBROW}>Saved occupations{bookmarks.length ? ` (${bookmarks.length})` : ''}</p>
						<p className="text-sm text-ink-muted">
							Careers you saved here or in the Interest Quiz. Open one for details.
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-full px-2 text-xl leading-none text-ink-muted hover:text-accent lg:hidden"
						aria-label="Close saved occupations"
					>
						×
					</button>
				</div>
				{bookmarks.length >= 2 && (
					<a href="/explore/compare" className={`${OUTLINE_BUTTON} self-start no-underline`}>
						Compare saved careers
					</a>
				)}
				<div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
					{failed && <p className="text-sm text-ink-muted">Couldn't load occupation details. Try again later.</p>}
					{bookmarks.length === 0 && (
						<p className="text-sm text-ink-muted">
							Nothing saved yet. Tap <strong>☆ Save to compare</strong> next to an occupation in one of Mot's answers to
							keep it here.
						</p>
					)}
					{bookmarks.map((b) => (
						<SavedItem
							key={b.code}
							bookmark={b}
							details={details[b.code]}
							loading={!failed && !(b.code in details)}
						/>
					))}
				</div>
			</aside>
		</>
	);
}
