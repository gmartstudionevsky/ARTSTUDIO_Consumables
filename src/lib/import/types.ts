export type ImportIssue = {
  sheet: string;
  row: number;
  column: string;
  message: string;
};

export type DirectoryRow = {
  rowNumber: number;
  code: string;
  name: string;
  category: string;
  baseUnit: string;
  defaultInputUnit: string;
  reportUnit: string;
  minQtyBase: number | null;
  openingQty: number;
  purposeCode: string;
  isActive: boolean;
  synonyms: string | null;
  note: string | null;
};

export type UnitRow = {
  rowNumber: number;
  itemCode: string;
  unitName: string;
  factorToBase: number;
  isAllowed: boolean;
  isDefaultInput: boolean;
  isDefaultReport: boolean;
};

export type ImportSummary = {
  items: number;
  categories: number;
  units: number;
  expenseArticles: number;
  purposes: number;
  itemUnits: number;
  openingLines: number;
};

export type NormalizedImportPayload = {
  summary: ImportSummary;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  rows: {
    directory: DirectoryRow[];
    units: UnitRow[];
  };
};

export type CommitOptions = {
  createOpening?: boolean;
};

