import type { APIRoute } from 'astro';
import { defineQuery } from 'groq';
import { sanityClient } from 'sanity:client';

export const prerender = false;

const CODE = /^\d{2}-\d{4}\.\d{2}$/;
const MAX_CODES = 50;

const SAVED_OCCUPATIONS_QUERY = defineQuery(
	`*[_type == "onetOccupation" && onetsocCode in $codes]{
		"code": onetsocCode,
		title,
		description,
		"jobZone": jobZone->{"level": jobZone, name},
		"interests": interestProfile.highPoints,
		"education": ratings[domain == "education" && scale->scaleId in ["RL", "RQ"] && dataValue > 0]
			| order(dataValue desc){"scale": scale->scaleId, "category": ratingCategory->categoryDescription, "percent": dataValue},
		"topSkills": ratings[domain in ["essentialSkills", "transferableSkills"] && scale->scaleId == "IM"]
			| order(dataValue desc)[0...3].element->elementName
	}`,
);

type Row = {
	code: string;
	title: string | null;
	description: string | null;
	jobZone: { level: number | null; name: string | null } | null;
	interests: string[] | null;
	education: { scale: 'RL' | 'RQ'; category: string | null; percent: number }[] | null;
	topSkills: (string | null)[] | null;
};

export type SavedOccupationDetails = {
	code: string;
	description: string | null;
	jobZone: { level: number; label: string } | null;
	education: { category: string; percent: number } | null;
	interests: string[];
	topSkills: string[];
};

/** O*NET reports required education on either the RL or RQ scale; prefer RL when both exist, like the agent does. */
function typicalEducation(rows: Row['education']) {
	const all = rows ?? [];
	const top = (all.some((r) => r.scale === 'RL') ? all.filter((r) => r.scale === 'RL') : all)[0];
	return top?.category ? { category: top.category, percent: Math.round(top.percent) } : null;
}

/** Job Zone names read "Job Zone Four: Considerable Preparation Needed"; keep the part after the colon. */
function jobZoneLabel(name: string | null) {
	return name?.split(':').pop()?.trim() ?? '';
}

/** Details for the saved-occupations panel. Public O*NET data over the CDN, so no human-session gate. */
export const GET: APIRoute = async ({ url }) => {
	const codes = [...new Set((url.searchParams.get('codes') ?? '').split(','))].filter((c) => CODE.test(c));
	if (!codes.length) return Response.json([]);
	if (codes.length > MAX_CODES) return new Response(`At most ${MAX_CODES} codes.`, { status: 400 });

	try {
		const rows = await sanityClient.fetch<Row[]>(SAVED_OCCUPATIONS_QUERY, { codes });
		const details: SavedOccupationDetails[] = rows.map((r) => ({
			code: r.code,
			description: r.description,
			jobZone: r.jobZone?.level ? { level: r.jobZone.level, label: jobZoneLabel(r.jobZone.name) } : null,
			education: typicalEducation(r.education),
			interests: r.interests ?? [],
			topSkills: (r.topSkills ?? []).filter((s): s is string => Boolean(s)),
		}));
		return Response.json(details, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' } });
	} catch (error) {
		console.error('[saved-occupations]', error);
		return new Response('Could not load occupation details.', { status: 502 });
	}
};
