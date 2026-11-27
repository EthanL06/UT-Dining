import { getPublicSummary, STATUS_LABEL } from '@/lib/status/public-summary';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export async function GET() {
  const summary = await getPublicSummary();
  return Response.json(
    {
      status: summary.overall,
      label: STATUS_LABEL[summary.overall],
      url: 'https://status.utdining.app',
      checked_at: summary.checkedAt,
      components: summary.components.map((component) => ({
        id: component.id,
        name: component.name,
        status: component.health,
        label: STATUS_LABEL[component.health],
      })),
    },
    {
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
      },
    },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
