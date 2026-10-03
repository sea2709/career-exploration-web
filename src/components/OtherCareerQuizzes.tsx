import { useEffect, useState } from 'react';
import type { CAREER_QUIZZES_QUERY_RESULT } from '../../sanity.types';
import { EYEBROW } from './chat/styles';

type CareerQuiz = CAREER_QUIZZES_QUERY_RESULT[number];

/** Mirrors QUIZ_FOCUSES in ../../studio/schemaTypes/careerQuizzes/careerQuiz.ts. */
const FOCUS_LABELS: Record<NonNullable<CareerQuiz['focus']>, string> = {
	interests: 'Interests',
	skills: 'Transferable skills',
	values: 'Work values',
	personality: 'Personality',
	veterans: 'Veterans',
	students: 'Students',
	quick: 'Quick check',
};

/** Mirrors QUIZ_COSTS in ../../studio/schemaTypes/careerQuizzes/careerQuiz.ts. */
const COST_LABELS: Record<NonNullable<CareerQuiz['cost']>, string> = {
	free: 'Free',
	freemium: 'Free, with paid extras',
	paid: 'Paid',
};

export function useCareerQuizzes() {
	const [quizzes, setQuizzes] = useState<CAREER_QUIZZES_QUERY_RESULT>([]);

	useEffect(() => {
		fetch('/api/career-quizzes')
			.then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
			.then(setQuizzes)
			.catch(() => setQuizzes([]));
	}, []);

	return quizzes;
}

/** Lists external career quizzes beside the Interest Quiz. A drawer below the lg breakpoint. */
export default function OtherCareerQuizzes({
	quizzes,
	open,
	onClose,
}: {
	quizzes: CAREER_QUIZZES_QUERY_RESULT;
	open: boolean;
	onClose: () => void;
}) {
	if (!quizzes.length) return null;

	return (
		<>
			{open && (
				<button
					type="button"
					aria-label="Close other career quizzes"
					onClick={onClose}
					className="fixed inset-0 z-20 bg-ink/20 lg:hidden"
				/>
			)}
			<aside
				aria-label="Other career quizzes"
				className={`${open ? 'fixed inset-y-0 right-0 z-30 flex w-[min(360px,100%)] bg-canvas p-5 shadow-bubble' : 'hidden'} flex-col gap-3 lg:static lg:z-auto lg:flex lg:w-[320px] lg:shrink-0 lg:bg-transparent lg:px-0 lg:py-6 lg:shadow-none`}
			>
				<div className="flex items-start justify-between gap-2">
					<div>
						<p className={EYEBROW}>Keep exploring ({quizzes.length})</p>
						<p className="font-display text-lg font-semibold">Other career quizzes worth trying</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-full px-2 text-xl leading-none text-ink-muted hover:text-accent lg:hidden"
						aria-label="Close other career quizzes"
					>
						×
					</button>
				</div>
				<p className="text-xs text-ink-muted">
					Each quiz measures fit a little differently. Taking two or three and looking for careers that keep showing up
					gives you a more reliable shortlist. Career counselors review every quiz listed here. The sites are run by
					other organizations and open in a new tab.
				</p>
				<ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
					{quizzes.map((quiz) => (
						<li key={quiz._id} className="rounded-[18px] border border-line bg-white p-3">
							<a
								href={quiz.url ?? undefined}
								target="_blank"
								rel="noreferrer"
								className="font-display font-semibold text-ink hover:text-accent hover:underline"
							>
								{quiz.name}
							</a>
							{quiz.provider && <p className="text-xs text-ink-muted">{quiz.provider}</p>}
							<p className="mt-1 text-sm text-ink-muted">{quiz.description}</p>
							<div className="mt-1.5 flex flex-wrap gap-1">
								{quiz.focus && (
									<span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
										{FOCUS_LABELS[quiz.focus]}
									</span>
								)}
								{quiz.cost && (
									<span className="rounded-full bg-canvas px-2 py-0.5 text-xs text-ink-muted">
										{COST_LABELS[quiz.cost]}
									</span>
								)}
							</div>
						</li>
					))}
				</ul>
			</aside>
		</>
	);
}
