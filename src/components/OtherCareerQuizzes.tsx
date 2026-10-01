import { useEffect, useState } from 'react';
import type { CAREER_QUIZZES_QUERY_RESULT } from '../../sanity.types';
import { CARD, EYEBROW } from './chat/styles';

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

export default function OtherCareerQuizzes() {
	const [quizzes, setQuizzes] = useState<CAREER_QUIZZES_QUERY_RESULT>([]);

	useEffect(() => {
		fetch('/api/career-quizzes')
			.then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
			.then(setQuizzes)
			.catch(() => setQuizzes([]));
	}, []);

	if (!quizzes.length) return null;

	return (
		<details className={`${CARD} group`}>
			<summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
				<div>
					<p className={EYEBROW}>Keep exploring</p>
					<p className="font-display text-lg font-semibold">Other career quizzes worth trying</p>
				</div>
				<span className="text-sm font-semibold text-accent group-open:hidden" aria-hidden="true">
					Show {quizzes.length}
				</span>
				<span className="hidden text-sm font-semibold text-accent group-open:inline" aria-hidden="true">
					Hide
				</span>
			</summary>
			<p className="mt-3 text-xs text-ink-muted">
				Each quiz measures fit a little differently. Taking two or three and looking for careers that keep showing up
				gives you a more reliable shortlist. Career counselors review every quiz listed here. The sites are run by other
				organizations and open in a new tab.
			</p>
			<ul className="mt-2 divide-y divide-line">
				{quizzes.map((quiz) => (
					<li key={quiz._id} className="py-3">
						<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
							<a
								href={quiz.url ?? undefined}
								target="_blank"
								rel="noreferrer"
								className="font-bold text-ink hover:text-accent hover:underline"
							>
								{quiz.name}
							</a>
							<span className="text-xs text-ink-muted">{quiz.provider}</span>
						</div>
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
		</details>
	);
}
