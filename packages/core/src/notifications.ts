export const NOTIFICATION_TITLE_MAX = 100;
export const NOTIFICATION_BODY_MAX = 500;

export interface NotificationDraft {
  title: string;
  body: string;
  redirectUrl?: string | null;
  scheduledAt?: Date | string | null;
}

export interface CheckedNotification {
  title: string;
  body: string;
  redirectUrl: string | null;
  scheduledAt: Date | null;
}

export type NotificationCheck =
  | { ok: true; value: CheckedNotification }
  | { ok: false; error: string };

export const checkNotification = (
  draft: NotificationDraft,
  now: Date = new Date(),
): NotificationCheck => {
  const title = draft.title?.trim() ?? '';
  const body = draft.body?.trim() ?? '';
  if (!title) return { ok: false, error: 'A notification needs a title.' };
  if (!body) return { ok: false, error: 'A notification needs a body.' };
  if (title.length > NOTIFICATION_TITLE_MAX) {
    return { ok: false, error: `The title is over ${NOTIFICATION_TITLE_MAX} characters.` };
  }
  if (body.length > NOTIFICATION_BODY_MAX) {
    return { ok: false, error: `The body is over ${NOTIFICATION_BODY_MAX} characters.` };
  }

  const redirectUrl = draft.redirectUrl?.trim() || null;
  if (redirectUrl && !redirectUrl.startsWith('/') && !/^https:\/\//.test(redirectUrl)) {
    return {
      ok: false,
      error: 'The link must be an app path like /location/J2 or an https:// URL.',
    };
  }

  let scheduledAt: Date | null = null;
  if (draft.scheduledAt) {
    scheduledAt = new Date(draft.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return { ok: false, error: 'The scheduled time is not a valid date.' };
    }
    if (scheduledAt.getTime() <= now.getTime()) {
      return { ok: false, error: 'The scheduled time must be in the future.' };
    }
  }

  return { ok: true, value: { title, body, redirectUrl, scheduledAt } };
};
