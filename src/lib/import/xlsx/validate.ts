import { NormalizedImportPayload, ImportIssue } from '@/lib/import/types';
import { ParsedImportResult } from '@/lib/import/xlsx/parse';

function pushError(list: ImportIssue[], sheet: string, row: number, column: string, message: string): void {
  list.push({ sheet, row, column, message });
}

export function validateImportData(parsed: ParsedImportResult): NormalizedImportPayload {
  const errors: ImportIssue[] = [...parsed.parseErrors];
  const warnings: ImportIssue[] = [];

  const required = [
    ['code', 'Код позиции'],
    ['name', 'Номенклатура'],
    ['category', 'Раздел'],
    ['baseUnit', 'Ед. базовая'],
    ['defaultInputUnit', 'Ед. учёта (по умолчанию)'],
    ['reportUnit', 'Ед. отчёта (по умолчанию)'],
    ['purposeCode', 'Назначение'],
  ] as const;

  const codeSet = new Set<string>();

  for (const row of parsed.directoryRows) {
    for (const [field, column] of required) {
      if (!row[field]) {
        pushError(errors, 'Справочник', row.rowNumber, column, 'Поле обязательно.');
      }
    }

    if (codeSet.has(row.code)) {
      pushError(errors, 'Справочник', row.rowNumber, 'Код позиции', 'Дублирующийся код позиции.');
    }
    codeSet.add(row.code);

    if (row.minQtyBase !== null && !Number.isFinite(row.minQtyBase)) {
      pushError(errors, 'Справочник', row.rowNumber, 'Мин. количество', 'Некорректное число.');
    }
    if (!Number.isFinite(row.openingQty)) {
      pushError(errors, 'Справочник', row.rowNumber, 'Остаток на 01.03.2026', 'Некорректное число.');
    }
    if (row.openingQty < 0) {
      pushError(errors, 'Справочник', row.rowNumber, 'Остаток на 01.03.2026', 'Отрицательные остатки запрещены.');
    }
  }

  const unitsByItem = new Map<string, typeof parsed.unitRows>();
  for (const row of parsed.unitRows) {
    const list = unitsByItem.get(row.itemCode) ?? [];
    list.push(row);
    unitsByItem.set(row.itemCode, list);

    if (!row.unitName) {
      pushError(errors, 'Единицы', row.rowNumber, 'Ед. изм.', 'Поле обязательно.');
    }
    if (!Number.isFinite(row.factorToBase) || row.factorToBase <= 0) {
      pushError(errors, 'Единицы', row.rowNumber, 'Коэффициент к базовой', 'Коэффициент должен быть > 0.');
    }
    if (!row.isAllowed && (row.isDefaultInput || row.isDefaultReport)) {
      pushError(errors, 'Единицы', row.rowNumber, 'Доступно', 'Недоступная единица не может быть по умолчанию.');
    }
  }

  for (const row of parsed.directoryRows) {
    const units = unitsByItem.get(row.code) ?? [];
    if (!units.some((unitRow) => unitRow.isDefaultReport)) {
      warnings.push({
        sheet: 'Единицы',
        row: row.rowNumber,
        column: 'По умолчанию (для отчёта)',
        message: `Для позиции ${row.code} defaultReport не указан — будет использована единица отчёта из “Справочник”.`,
      });
    }
  }

  const categorySet = new Set(parsed.directoryRows.map((row) => row.category).filter(Boolean));
  const purposeSet = new Set(parsed.directoryRows.map((row) => row.purposeCode).filter(Boolean));
  const unitSet = new Set<string>();

  for (const row of parsed.directoryRows) {
    if (row.baseUnit) unitSet.add(row.baseUnit);
    if (row.defaultInputUnit) unitSet.add(row.defaultInputUnit);
    if (row.reportUnit) unitSet.add(row.reportUnit);
  }
  for (const row of parsed.unitRows) {
    if (row.unitName) unitSet.add(row.unitName);
  }

  const openingLines = parsed.directoryRows.filter((row) => row.openingQty > 0).length;

  return {
    summary: {
      items: parsed.directoryRows.length,
      categories: categorySet.size,
      units: unitSet.size,
      expenseArticles: purposeSet.size,
      purposes: purposeSet.size,
      itemUnits: parsed.unitRows.length,
      openingLines,
    },
    errors,
    warnings,
    rows: {
      directory: parsed.directoryRows,
      units: parsed.unitRows,
    },
  };
}

