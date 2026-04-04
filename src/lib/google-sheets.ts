import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type { SheetMetadata, SheetValues } from "./sheets-types";

/** Get spreadsheet metadata (title, sheet names, dimensions). */
export async function getSpreadsheetMetadata(
  auth: OAuth2Client,
  spreadsheetId: string
): Promise<SheetMetadata> {
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.get({ spreadsheetId });

  return {
    spreadsheetId: res.data.spreadsheetId ?? "",
    title: res.data.properties?.title ?? "",
    sheets: (res.data.sheets ?? []).map((s) => ({
      sheetId: s.properties?.sheetId ?? 0,
      title: s.properties?.title ?? "",
      rowCount: s.properties?.gridProperties?.rowCount ?? 0,
      columnCount: s.properties?.gridProperties?.columnCount ?? 0,
    })),
  };
}

/** Read values from a range (e.g. "Sheet1!A1:D10"). */
export async function getSheetValues(
  auth: OAuth2Client,
  spreadsheetId: string,
  range: string
): Promise<SheetValues> {
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: "FORMATTED_VALUE",
  });

  return {
    range: res.data.range ?? range,
    values: (res.data.values as string[][] | undefined) ?? [],
  };
}
