import { env } from './github.ts';

export const EXPO_PROJECT_ID = '005ee5ea-5ec3-4d96-af00-5d6203694b74';
export const EXPO_ACCOUNT_URL = 'https://expo.dev/accounts/ethanl06/projects/ut-dining';

export type BuildStatus =
  | 'NEW'
  | 'IN_QUEUE'
  | 'IN_PROGRESS'
  | 'PENDING_CANCEL'
  | 'FINISHED'
  | 'ERRORED'
  | 'CANCELED';

export interface Build {
  id: string;
  status: BuildStatus;
  message: string | null;
  buildProfile: string | null;
  gitCommitHash: string | null;
  createdAt: string;
  completedAt: string | null;
  runtimeVersion: string | null;
  appBuildVersion: string | null;
  error: { message: string } | null;
}

export interface Update {
  group: string;
  gitCommitHash: string | null;
  createdAt: string;
  runtimeVersion: string;
  message: string | null;
}

export const RUNNING_BUILD: ReadonlySet<BuildStatus> = new Set([
  'NEW',
  'IN_QUEUE',
  'IN_PROGRESS',
  'PENDING_CANCEL',
]);

export const buildUrl = (id: string) => `${EXPO_ACCOUNT_URL}/builds/${id}`;
export const updateUrl = (group: string) => `${EXPO_ACCOUNT_URL}/updates/${group}`;
export const buildPr = (build: Build): number | null => {
  const match = /PR #(\d+)/.exec(build.message ?? '');
  return match ? Number(match[1]) : null;
};

const query = async <T>(text: string, variables: Record<string, unknown>): Promise<T> => {
  const token = env('EXPO_TOKEN');
  if (!token) throw new Error('EXPO_TOKEN is not set');
  const response = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query: text, variables }),
  });
  const json = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (!response.ok || json.errors || !json.data)
    throw new Error(
      `Expo API: ${json.errors?.map((e) => e.message).join('; ') ?? `HTTP ${response.status}`}`,
    );
  return json.data;
};

const UPDATE_FIELDS = 'group gitCommitHash createdAt runtimeVersion message';

export const fetchEas = async (
  branches: string[],
  buildLimit = 15,
): Promise<{ builds: Build[]; updates: Map<string, Update | null> }> => {
  const aliases = branches.map(
    (name, i) =>
      `b${i}: updateBranchByName(name: ${JSON.stringify(name)}) { updates(offset: 0, limit: 1) { ${UPDATE_FIELDS} } }`,
  );
  const text = `query($id: String!, $limit: Int!) { app { byId(appId: $id) {
    builds(offset: 0, limit: $limit) {
      id status message buildProfile gitCommitHash createdAt completedAt runtimeVersion appBuildVersion error { message }
    }
    ${aliases.join('\n')}
  } } }`;
  const data = await query<{
    app: { byId: Record<string, unknown> & { builds: Build[] } };
  }>(text, { id: EXPO_PROJECT_ID, limit: buildLimit });
  const app = data.app.byId;
  const updates = new Map<string, Update | null>();
  branches.forEach((name, i) => {
    const branch = app[`b${i}`] as { updates: Update[] } | null;
    updates.set(name, branch?.updates[0] ?? null);
  });
  return { builds: app.builds, updates };
};
