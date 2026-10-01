import { useState } from 'react';
import { clearBookmarks, removeBookmark, useBookmarks, type Bookmark } from './bookmarks/useBookmarks';
import { MotBubble, MotMessage } from './chat/Messages';
import { CARD, EYEBROW, INPUT, OUTLINE_BUTTON, PAGE, PAGE_SUBTITLE, PAGE_TITLE, PRIMARY_BUTTON } from './chat/styles';

/** More than this and the agent's answer gets too long to read as one comparison. */
const MAX_COMPARE = 4;

const label = (b: Bookmark) => `${b.title} (${b.code})`;

/**
 * The Career Explorer agent picks its own tools; naming a starting occupation frames the request
 * as career moves, which its system prompt answers with compareOccupations.
 */
function comparePrompt(chosen: Bookmark[], startCode: string) {
	const start = chosen.find((b) => b.code === startCode);
	const targets = chosen.filter((b) => b !== start).map(label).join(', ');
	if (start) {
		return (
			`I'm currently working as ${label(start)}. Compare moving into each of these: ${targets}. ` +
			'For each move, show the biggest skill gaps and what I already bring, then tell me which move is most realistic and what to learn first.'
		);
	}
	return (
		`Compare these occupations side by side: ${targets}. ` +
		'For each, cover what the work involves, the preparation needed (Job Zone and typical education), and the top skills. ' +
		'Then sum up how they differ and who each one suits best.'
	);
}

export default function CompareOccupations() {
	const bookmarks = useBookmarks();
	const [picked, setPicked] = useState(() => bookmarks.slice(0, MAX_COMPARE).map((b) => b.code));
	const [startCode, setStartCode] = useState('');

	const chosen = bookmarks.filter((b) => picked.includes(b.code));
	const start = chosen.some((b) => b.code === startCode) ? startCode : '';
	const full = chosen.length >= MAX_COMPARE;

	const togglePick = (code: string) =>
		setPicked((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]));

	const compare = () => {
		window.location.assign(`/explore?q=${encodeURIComponent(comparePrompt(chosen, start))}`);
	};

	return (
		<div className={PAGE}>
			<header className="flex items-start justify-between gap-4 py-6">
				<div>
					<a href="/explore" className="text-sm font-semibold">
						← Career Explorer
					</a>
					<h1 className={PAGE_TITLE}>Compare careers</h1>
					<p className={PAGE_SUBTITLE}>
						Save occupations from the Interest Quiz or Career Explorer, then compare up to {MAX_COMPARE} with Mot.
					</p>
				</div>
				{bookmarks.length > 0 && (
					<button type="button" onClick={clearBookmarks} className={`${OUTLINE_BUTTON} shrink-0`}>
						Clear all
					</button>
				)}
			</header>

			<section className="flex-1 space-y-6 overflow-y-auto pb-6">
				{bookmarks.length === 0 ? (
					<MotMessage>
						<MotBubble>
							<p>
								You haven't saved any careers yet. Look for <strong>☆ Save to compare</strong> next to an occupation in
								the <a href="/quiz">Interest Quiz</a> or <a href="/explore">Career Explorer</a>, then come back here.
							</p>
						</MotBubble>
					</MotMessage>
				) : (
					<>
						<div className={`${CARD} space-y-2`}>
							<p className={EYEBROW}>
								Saved careers · {chosen.length} of {MAX_COMPARE} picked
							</p>
							<ul className="divide-y divide-line">
								{bookmarks.map((b) => {
									const id = `compare-${b.code}`;
									const isPicked = picked.includes(b.code);
									return (
										<li key={b.code} className="flex items-center gap-3 py-2.5">
											<input
												id={id}
												type="checkbox"
												checked={isPicked}
												disabled={!isPicked && full}
												onChange={() => togglePick(b.code)}
												className="size-4 shrink-0 accent-accent"
											/>
											<div className="min-w-0 flex-1">
												<label htmlFor={id} className="font-bold text-ink">
													{b.title}
												</label>
												<p className="text-xs text-ink-muted">
													{b.code}
													{b.jobZone ? ` · Job Zone ${b.jobZone}` : ''} ·{' '}
													<a href={b.url} target="_blank" rel="noreferrer">
														O*NET profile
													</a>
												</p>
											</div>
											<button
												type="button"
												onClick={() => removeBookmark(b.code)}
												aria-label={`Remove ${b.title}`}
												className="shrink-0 text-xs font-semibold text-ink-muted hover:text-red-600"
											>
												Remove
											</button>
										</li>
									);
								})}
							</ul>
						</div>

						<form
							onSubmit={(e) => {
								e.preventDefault();
								compare();
							}}
							className={`${CARD} space-y-4`}
						>
							<div className="space-y-2">
								<label htmlFor="compare-start" className="font-bold">
									Starting point <span className="font-normal text-ink-muted">(optional)</span>
								</label>
								<p className="text-xs text-ink-muted">
									Pick the job you have now to see the skill gaps for each move, instead of a side-by-side overview.
								</p>
								<select
									id="compare-start"
									value={start}
									onChange={(e) => setStartCode(e.target.value)}
									className={`${INPUT} w-full`}
								>
									<option value="">None, compare side by side</option>
									{chosen.map((b) => (
										<option key={b.code} value={b.code}>
											I'm currently: {b.title}
										</option>
									))}
								</select>
							</div>
							<div className="flex flex-wrap items-center gap-3">
								<button type="submit" disabled={chosen.length < 2} className={PRIMARY_BUTTON}>
									Compare with Mot
								</button>
								{chosen.length < 2 && <p className="text-xs text-ink-muted">Pick at least 2 careers.</p>}
							</div>
						</form>
					</>
				)}
			</section>
		</div>
	);
}
