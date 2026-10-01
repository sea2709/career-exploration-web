import type { APIRoute } from 'astro';
import { defineQuery } from 'groq';
import { sanityClient } from 'sanity:client';

export const prerender = false;

/**
 * Every published career quiz. The Studio review workflow
 * (../../../studio/schemaTypes/careerQuizzes/careerQuizWorkflow.ts) only allows publishing once a
 * quiz is Approved, and retiring it unpublishes it.
 */
const CAREER_QUIZZES_QUERY = defineQuery(
	`*[_type == "careerQuiz" && !(_id in path("drafts.**"))] | order(coalesce(listOrder, 1000000) asc, name asc) { _id, name, provider, url, description, focus, cost }`,
);

export const GET: APIRoute = async () => {
	try {
		const quizzes = await sanityClient.fetch(CAREER_QUIZZES_QUERY);
		return Response.json(quizzes, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } });
	} catch (error) {
		console.error('[career-quizzes]', error);
		return new Response('Could not load career quizzes.', { status: 502 });
	}
};
