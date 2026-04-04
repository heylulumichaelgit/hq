import { google } from "googleapis";
import { addDays } from "date-fns";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
];

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
}

export function getAuthUrl(state: string): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    // "select_account" forces Google's account picker so you can choose WHICH
    // Google account to connect. "consent" ensures a refresh_token is returned.
    prompt: "select_account consent",
    state,
  });
}

export interface TokenCredentials {
  refresh_token: string;
  access_token?: string | null;
  expiry_date?: number | null;
}

/** Creates an OAuth2 client pre-loaded with stored credentials. */
export function createAuthedClient(creds: TokenCredentials) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: creds.refresh_token,
    access_token: creds.access_token ?? undefined,
    expiry_date: creds.expiry_date ?? undefined,
  });
  return oauth2Client;
}

export interface NormalizedEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  calendarId: string;
  calendarName: string;
  color: string | null;
}

/** Fetch events from a single Google calendar for a date range. */
export async function fetchCalendarEvents(
  authClient: ReturnType<typeof createAuthedClient>,
  calendarId: string,
  calendarName: string,
  color: string | null,
  timeMin: string,
  timeMax: string
): Promise<NormalizedEvent[]> {
  const cal = google.calendar({ version: "v3", auth: authClient });
  const res = await cal.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });

  return (res.data.items ?? []).map((event) => {
    const isAllDay = !!event.start?.date;
    return {
      id: event.id ?? "",
      title: event.summary ?? "(No title)",
      start: event.start?.dateTime ?? event.start?.date ?? "",
      end: event.end?.dateTime ?? event.end?.date ?? "",
      allDay: isAllDay,
      calendarId,
      calendarName,
      color,
    };
  });
}

/** Create a busy event in a Google calendar. Returns the created event ID. */
export async function createBusyEvent(
  authClient: ReturnType<typeof createAuthedClient>,
  calendarId: string,
  title: string,
  startAt: string,
  endAt: string,
  allDay: boolean
): Promise<string> {
  const cal = google.calendar({ version: "v3", auth: authClient });

  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  // Google Calendar all-day events use exclusive end dates (end = day after last day).
  // e.g. a single-day event on 2026-03-20 needs start: "2026-03-20", end: "2026-03-21".
  const allDayEnd = addDays(endDate, 1);

  const event = allDay
    ? {
        summary: title,
        transparency: "opaque" as const,
        start: { date: startDate.toISOString().split("T")[0] },
        end: { date: allDayEnd.toISOString().split("T")[0] },
      }
    : {
        summary: title,
        transparency: "opaque" as const,
        start: { dateTime: startAt },
        end: { dateTime: endAt },
      };

  const res = await cal.events.insert({ calendarId, requestBody: event });
  return res.data.id ?? "";
}

/** Delete a Google calendar event. Silently ignores 404 (already deleted). */
export async function deleteBusyEvent(
  authClient: ReturnType<typeof createAuthedClient>,
  calendarId: string,
  eventId: string
): Promise<void> {
  const cal = google.calendar({ version: "v3", auth: authClient });
  try {
    await cal.events.delete({ calendarId, eventId });
  } catch (err: unknown) {
    const status = (err as { code?: number })?.code;
    if (status !== 404 && status !== 410) throw err;
  }
}
