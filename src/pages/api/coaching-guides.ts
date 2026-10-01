import type { APIRoute } from 'astro';
import { defineQuery } from 'groq';
import { sanityClient } from 'sanity:client';

export const prerender = false;

/**
 * Every published guide: the same set the coaching Knowledge Base imports
 * (../../../studio/scripts/coaching-kb/setup.ts), so users read exactly what the coach applies.
 * The Studio workflow only allows publishing once a guide is Approved.
 */
const COACHING_GUIDES_QUERY = defineQuery(
	`*[_type == "coachingGuide" && !(_id in path("drafts.**"))] | order(title asc) { _id, title, category, jobZones, summary, body }`,
);

export const GET: APIRoute = async () => {
	try {
		const guides = await sanityClient.fetch(COACHING_GUIDES_QUERY);
		return Response.json(guides, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } });
	} catch (error) {
		console.error('[coaching-guides]', error);
		return new Response('Could not load coaching guides.', { status: 502 });
	}
};
