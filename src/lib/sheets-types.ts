export interface SheetMetadata {
  spreadsheetId: string;
  title: string;
  sheets: { sheetId: number; title: string; rowCount: number; columnCount: number }[];
}

export interface SheetValues {
  range: string;
  values: string[][];
}
