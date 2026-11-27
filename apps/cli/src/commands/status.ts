import type { Command } from '../context.ts';
import { describeTarget } from '../target.ts';
import { countAudience } from './notifications.ts';

export const statusCommands: Command[] = [
  {
    path: ['status'],
    summary: 'Check the key works and show which project the CLI is talking to',
    usage: 'status',
    run: async (ctx) => {
      const count = async (table: 'location' | 'changelog' | 'menu') => {
        const { count, error } = await ctx.db
          .from(table)
          .select('*', { count: 'exact', head: true });
        return error ? null : count;
      };
      const [locations, changelog, menus, devices] = await Promise.all([
        count('location'),
        count('changelog'),
        count('menu'),
        countAudience(ctx),
      ]);
      const data = {
        target: ctx.target.name,
        url: ctx.target.url,
        authenticated: true,
        counts: { locations, changelog_entries: changelog, menus, push_devices: devices },
      };
      ctx.out.result(data, () =>
        [
          `Target:   ${describeTarget(ctx.target)}`,
          'Auth:     service key accepted',
          `Rows:     ${locations} locations, ${changelog} changelog entries, ${menus} menus, ${devices} push devices`,
        ].join('\n'),
      );
    },
  },
];
