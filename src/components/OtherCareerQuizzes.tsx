import { CARD, EYEBROW } from './chat/styles';

type ExternalQuiz = {
	name: string;
	provider: string;
	url: string;
	description: string;
	focus: string;
	cost: string;
};

const QUIZZES: ExternalQuiz[] = [
	{
		name: 'O*NET Interest Profiler',
		provider: 'U.S. Department of Labor',
		url: 'https://onetinterestprofiler.org/',
		description:
			'The official RIASEC interest inventory this quiz is modeled on. Links every result to O*NET occupation profiles.',
		focus: 'Interests',
		cost: 'Free',
	},
	{
		name: 'Interest Assessment',
		provider: 'CareerOneStop',
		url: 'https://www.careeronestop.org/toolkit/careers/interest-assessment.aspx',
		description: '30 quick questions, with matches linked to local wages, training programs, and job listings.',
		focus: 'Interests',
		cost: 'Free',
	},
	{
		name: 'mySkills myFuture',
		provider: 'CareerOneStop',
		url: 'https://www.myskillsmyfuture.org/',
		description:
			'Enter a job you’ve held and see other occupations that use similar skills. Useful after a layoff or when switching fields.',
		focus: 'Transferable skills',
		cost: 'Free',
	},
	{
		name: 'My Next Move for Veterans',
		provider: 'U.S. Department of Labor',
		url: 'https://www.mynextmove.org/vets/',
		description: 'Translate a military classification into related civilian careers, or take the interest profiler.',
		focus: 'Veterans',
		cost: 'Free',
	},
	{
		name: 'ASVAB Career Exploration Program',
		provider: 'U.S. Department of Defense',
		url: 'https://www.asvabprogram.com/',
		description: 'An interest inventory plus career planning tools for both civilian and military paths, aimed at students.',
		focus: 'Students',
		cost: 'Free',
	},
	{
		name: 'Holland Code (RIASEC) Test',
		provider: 'Open Psychometrics',
		url: 'https://openpsychometrics.org/tests/RIASEC/',
		description: 'A 48-item open-source RIASEC test. Handy for comparing against your interest code here.',
		focus: 'Interests',
		cost: 'Free',
	},
	{
		name: 'Career Personality Profiler',
		provider: 'Truity',
		url: 'https://www.truity.com/test/career-personality-profiler-test',
		description: 'Combines Holland interests with Big Five personality traits to suggest careers.',
		focus: 'Personality',
		cost: 'Free summary, paid full report',
	},
	{
		name: 'Career Test',
		provider: 'CareerExplorer',
		url: 'https://www.careerexplorer.com/career-test/',
		description: 'Asks about interests, personality, and work style, then ranks careers by fit.',
		focus: 'Personality',
		cost: 'Free, optional premium',
	},
	{
		name: 'Career Quiz',
		provider: 'The Princeton Review',
		url: 'https://www.princetonreview.com/quiz/career-quiz',
		description: 'A short either-or quiz that suggests careers by interest and work style.',
		focus: 'Quick check',
		cost: 'Free',
	},
];

export default function OtherCareerQuizzes() {
	return (
		<details className={`${CARD} group`}>
			<summary className="flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden justify-between gap-2">
				<div>
					<p className={EYEBROW}>Keep exploring</p>
					<p className="font-display text-lg font-semibold">Other career quizzes worth trying</p>
				</div>
				<span className="text-sm font-semibold text-accent group-open:hidden" aria-hidden="true">
					Show {QUIZZES.length}
				</span>
				<span className="hidden text-sm font-semibold text-accent group-open:inline" aria-hidden="true">
					Hide
				</span>
			</summary>
			<p className="mt-3 text-xs text-ink-muted">
				Each quiz measures fit a little differently. Taking two or three and looking for careers that keep showing up
				gives you a more reliable shortlist. These sites are run by other organizations and open in a new tab.
			</p>
			<ul className="mt-2 divide-y divide-line">
				{QUIZZES.map((quiz) => (
					<li key={quiz.url} className="py-3">
						<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
							<a
								href={quiz.url}
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
							<span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
								{quiz.focus}
							</span>
							<span className="rounded-full bg-canvas px-2 py-0.5 text-xs text-ink-muted">{quiz.cost}</span>
						</div>
					</li>
				))}
			</ul>
		</details>
	);
}
