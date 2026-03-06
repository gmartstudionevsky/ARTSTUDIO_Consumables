import { ImportJobStatus, Prisma, RecordStatus, TxType } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { CommitOptions, NormalizedImportPayload } from '@/lib/import/types';
import { generateNextItemCode } from '@/lib/items/codeGen';

type RollbackItemSnapshot = {
  itemId: string;
  before: {
    code: string;
    name: string;
    categoryId: string;
    defaultExpenseArticleId: string;
    defaultPurposeId: string;
    minQtyBase: string | null;
    isActive: boolean;
    synonyms: string | null;
    note: string | null;
    baseUnitId: string;
    defaultInputUnitId: string;
    reportUnitId: string;
  };
  units: Array<{
    unitId: string;
    factorToBase: string;
    isAllowed: boolean;
    isDefaultInput: boolean;
    isDefaultReport: boolean;
  }>;
};

type RollbackMeta = {
  createdItemIds: string[];
  updatedItems: RollbackItemSnapshot[];
  openingTransactionId: string | null;
  rolledBackAt?: string;
};

function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(6));
}

function openingBatchId(): string {
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `OPENING-20260301-${rand}`;
}

export async function commitImportJob(params: {
  jobId: string;
  userId: string;
  options?: CommitOptions;
}): Promise<{ created: Record<string, number>; openingCreated: boolean }> {
  const createOpening = params.options?.createOpening ?? true;
  const job = await prisma.importJob.findFirst({ where: { id: params.jobId, createdById: params.userId, status: ImportJobStatus.DRAFT } });
  if (!job) throw new Error('Черновик импорта не найден или уже применён.');

  const payload = job.payload as unknown as NormalizedImportPayload;
  if (payload.errors.length > 0) throw new Error('Импорт содержит ошибки. Исправьте файл и повторите предпросмотр.');


  const decisionsMap = new Map<number, { action: 'AUTO' | 'CREATE' | 'SKIP'; itemId?: string }>();
  for (const row of payload.syncPlan?.rows ?? []) {
    if (row.status === 'MATCHED' && row.selectedItemId) {
      decisionsMap.set(row.rowNumber, { action: 'AUTO', itemId: row.selectedItemId });
    }
    if (row.status === 'SKIP') {
      decisionsMap.set(row.rowNumber, { action: 'SKIP' });
    }
  }
  for (const decision of params.options?.decisions ?? []) {
    decisionsMap.set(decision.rowNumber, { action: decision.action, itemId: decision.itemId });
  }
  const unresolvedBehavior = params.options?.unresolvedBehavior ?? 'CREATE';

  const created = {
    categories: 0,
    units: 0,
    expenseArticles: 0,
    purposes: 0,
    items: 0,
    itemUnits: 0,
    openingLines: 0,
    syncMatched: 0,
    syncCreated: 0,
    syncSkipped: 0,
    syncNeedsReview: 0,
  };

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (createOpening) {
        const existingOpening = await tx.transaction.findFirst({
          where: { batchId: { startsWith: 'OPENING-20260301' }, note: { contains: 'Import' }, status: RecordStatus.ACTIVE },
          select: { id: true },
        });
        if (existingOpening) {
          throw new Error('Открытие склада уже импортировано.');
        }
      }

      const categories = [...new Set(payload.rows.directory.map((row) => row.category))].filter(Boolean);
      const purposeCodes = [...new Set(payload.rows.directory.map((row) => row.purposeCode))].filter(Boolean);
      const units = new Set<string>();
      payload.rows.directory.forEach((row) => {
        units.add(row.baseUnit);
        units.add(row.defaultInputUnit);
        units.add(row.reportUnit);
      });
      payload.rows.units.forEach((row) => units.add(row.unitName));

      const categoryMap = new Map<string, string>();
      for (const name of categories) {
        const exists = await tx.category.findUnique({ where: { name } });
        const category = await tx.category.upsert({ where: { name }, update: { isActive: true }, create: { name, isActive: true } });
        if (!exists) created.categories += 1;
        categoryMap.set(name, category.id);
      }

      const unitMap = new Map<string, string>();
      for (const name of units) {
        if (!name) continue;
        const exists = await tx.unit.findUnique({ where: { name } });
        const unit = await tx.unit.upsert({ where: { name }, update: { isActive: true }, create: { name, isActive: true } });
        if (!exists) created.units += 1;
        unitMap.set(name, unit.id);
      }

      const expenseMap = new Map<string, string>();
      const purposeMap = new Map<string, string>();
      for (const code of purposeCodes) {
        const expenseExists = await tx.expenseArticle.findUnique({ where: { code } });
        const expense = await tx.expenseArticle.upsert({
          where: { code },
          update: { isActive: true, name: expenseExists?.name ?? code },
          create: { code, name: code, isActive: true },
        });
        if (!expenseExists) created.expenseArticles += 1;
        expenseMap.set(code, expense.id);

        const purposeExists = await tx.purpose.findUnique({ where: { code } });
        const purpose = await tx.purpose.upsert({
          where: { code },
          update: { isActive: true, name: purposeExists?.name ?? code },
          create: { code, name: code, isActive: true },
        });
        if (!purposeExists) created.purposes += 1;
        purposeMap.set(code, purpose.id);
      }

      const unitRowsByCode = new Map<string, typeof payload.rows.units>();
      for (const row of payload.rows.units) {
        const list = unitRowsByCode.get(row.itemCode) ?? [];
        list.push(row);
        unitRowsByCode.set(row.itemCode, list);
      }

      const rollback: RollbackMeta = {
        createdItemIds: [],
        updatedItems: [],
        openingTransactionId: null,
      };

      const openingLinePayload: Array<{ itemId: string; qtyInput: Prisma.Decimal; unitId: string; qtyBase: Prisma.Decimal; expenseArticleId: string; purposeId: string }> = [];

      for (const row of payload.rows.directory) {
        const categoryId = categoryMap.get(row.category) as string;
        const decision = decisionsMap.get(row.rowNumber);

        let targetItemId: string | null = decision?.itemId ?? null;
        if (!targetItemId && decision?.action === 'AUTO') {
          const planned = payload.syncPlan?.rows?.find((planRow) => planRow.rowNumber === row.rowNumber);
          targetItemId = planned?.selectedItemId ?? null;
        }

        let action = decision?.action;
        if (!action) {
          const planned = payload.syncPlan?.rows?.find((planRow) => planRow.rowNumber === row.rowNumber);
          if (planned?.status === 'MATCHED' && planned.selectedItemId) {
            action = 'AUTO';
            targetItemId = planned.selectedItemId;
          } else if (planned?.status === 'NEEDS_REVIEW') {
            action = unresolvedBehavior === 'SKIP' ? 'SKIP' : 'CREATE';
            created.syncNeedsReview += 1;
          } else {
            action = 'CREATE';
          }
        }

        if (action === 'SKIP') {
          created.syncSkipped += 1;
          continue;
        }

        const existingItem = targetItemId
          ? await tx.item.findUnique({ where: { id: targetItemId }, select: { id: true } })
          : await tx.item.findFirst({
            where: {
              OR: [
                { code: row.code },
                { name: row.name, categoryId },
              ],
            },
            select: { id: true },
          });

        if (existingItem && action === 'AUTO') {
          created.syncMatched += 1;
        }
        if (!existingItem || action === 'CREATE') {
          created.syncCreated += 1;
        }

        if (existingItem) {
          const snapshotItem = await tx.item.findUnique({
            where: { id: existingItem.id },
            select: {
              id: true,
              code: true,
              name: true,
              categoryId: true,
              defaultExpenseArticleId: true,
              defaultPurposeId: true,
              minQtyBase: true,
              isActive: true,
              synonyms: true,
              note: true,
              baseUnitId: true,
              defaultInputUnitId: true,
              reportUnitId: true,
            },
          });
          const snapshotUnits = await tx.itemUnit.findMany({
            where: { itemId: existingItem.id },
            select: {
              unitId: true,
              factorToBase: true,
              isAllowed: true,
              isDefaultInput: true,
              isDefaultReport: true,
            },
          });

          if (snapshotItem) {
            rollback.updatedItems.push({
              itemId: snapshotItem.id,
              before: {
                code: snapshotItem.code,
                name: snapshotItem.name,
                categoryId: snapshotItem.categoryId,
                defaultExpenseArticleId: snapshotItem.defaultExpenseArticleId,
                defaultPurposeId: snapshotItem.defaultPurposeId,
                minQtyBase: snapshotItem.minQtyBase?.toString() ?? null,
                isActive: snapshotItem.isActive,
                synonyms: snapshotItem.synonyms,
                note: snapshotItem.note,
                baseUnitId: snapshotItem.baseUnitId,
                defaultInputUnitId: snapshotItem.defaultInputUnitId,
                reportUnitId: snapshotItem.reportUnitId,
              },
              units: snapshotUnits.map((unit) => ({
                unitId: unit.unitId,
                factorToBase: unit.factorToBase.toString(),
                isAllowed: unit.isAllowed,
                isDefaultInput: unit.isDefaultInput,
                isDefaultReport: unit.isDefaultReport,
              })),
            });
          }
        }

        const item = existingItem
          ? await tx.item.update({
            where: { id: existingItem.id },
            data: {
              name: row.name,
              categoryId,
              defaultExpenseArticleId: expenseMap.get(row.purposeCode) as string,
              defaultPurposeId: purposeMap.get(row.purposeCode) as string,
              minQtyBase: row.minQtyBase === null ? null : toDecimal(row.minQtyBase),
              isActive: row.isActive,
              synonyms: row.synonyms,
              note: row.note,
              baseUnitId: unitMap.get(row.baseUnit) as string,
              defaultInputUnitId: unitMap.get(row.defaultInputUnit) as string,
              reportUnitId: unitMap.get(row.reportUnit) as string,
            },
          })
          : await tx.item.create({
            data: {
              code: await generateNextItemCode(tx),
              name: row.name,
              categoryId,
              defaultExpenseArticleId: expenseMap.get(row.purposeCode) as string,
              defaultPurposeId: purposeMap.get(row.purposeCode) as string,
              minQtyBase: row.minQtyBase === null ? null : toDecimal(row.minQtyBase),
              isActive: row.isActive,
              synonyms: row.synonyms,
              note: row.note,
              baseUnitId: unitMap.get(row.baseUnit) as string,
              defaultInputUnitId: unitMap.get(row.defaultInputUnit) as string,
              reportUnitId: unitMap.get(row.reportUnit) as string,
            },
          });

        if (!existingItem) {
          created.items += 1;
          rollback.createdItemIds.push(item.id);
        }

        const customUnits = unitRowsByCode.get(row.code) ?? [];
        const rowsToCreate = customUnits.length > 0
          ? customUnits.map((unitRow) => ({
            itemId: item.id,
            unitId: unitMap.get(unitRow.unitName) as string,
            factorToBase: toDecimal(unitRow.factorToBase),
            isAllowed: unitRow.isAllowed,
            isDefaultInput: unitRow.isDefaultInput,
            isDefaultReport: unitRow.isDefaultReport,
          }))
          : [{
            itemId: item.id,
            unitId: unitMap.get(row.baseUnit) as string,
            factorToBase: toDecimal(1),
            isAllowed: true,
            isDefaultInput: true,
            isDefaultReport: true,
          }];

        const reportUnitId = unitMap.get(row.reportUnit) as string;
        if (!rowsToCreate.some((unitRow) => unitRow.unitId === reportUnitId && unitRow.isDefaultReport)) {
          const existing = rowsToCreate.find((unitRow) => unitRow.unitId === reportUnitId);
          if (existing) {
            existing.isDefaultReport = true;
            if (!existing.isAllowed) existing.isAllowed = true;
          } else {
            rowsToCreate.push({
              itemId: item.id,
              unitId: reportUnitId,
              factorToBase: toDecimal(1),
              isAllowed: true,
              isDefaultInput: false,
              isDefaultReport: true,
            });
          }
        }

        await tx.itemUnit.deleteMany({ where: { itemId: item.id } });
        await tx.itemUnit.createMany({ data: rowsToCreate });
        created.itemUnits += rowsToCreate.length;

        if (createOpening && row.openingQty > 0) {
          const reportUnit = rowsToCreate.find((unitRow) => unitRow.unitId === reportUnitId);
          const factor = reportUnit?.factorToBase ?? toDecimal(1);
          const qtyInput = toDecimal(row.openingQty);
          openingLinePayload.push({
            itemId: item.id,
            qtyInput,
            unitId: reportUnitId,
            qtyBase: toDecimal(new Prisma.Decimal(row.openingQty).mul(factor).toNumber()),
            expenseArticleId: expenseMap.get(row.purposeCode) as string,
            purposeId: purposeMap.get(row.purposeCode) as string,
          });
        }
      }

      let openingCreated = false;
      if (createOpening && openingLinePayload.length > 0) {
        const txOpening = await tx.transaction.create({
          data: {
            batchId: openingBatchId(),
            type: TxType.IN,
            occurredAt: new Date('2026-03-01T00:00:00.000Z'),
            note: `Открытие склада 01.03.2026 (Import #${params.jobId})`,
            createdById: params.userId,
            status: RecordStatus.ACTIVE,
          },
        });

        await tx.transactionLine.createMany({
          data: openingLinePayload.map((line) => ({ ...line, transactionId: txOpening.id, status: RecordStatus.ACTIVE })),
        });
        created.openingLines = openingLinePayload.length;
        openingCreated = true;
        rollback.openingTransactionId = txOpening.id;
      }

      await tx.importJob.update({
        where: { id: params.jobId },
        data: {
          status: ImportJobStatus.COMMITTED,
          error: null,
          payload: {
            ...(payload as unknown as Record<string, unknown>),
            rollback,
          },
        },
      });

      return { openingCreated };
    }, {
      maxWait: 10_000,
      timeout: 120_000,
    });

    return { created, openingCreated: result.openingCreated };
  } catch (error) {
    await prisma.importJob.update({ where: { id: params.jobId }, data: { status: ImportJobStatus.FAILED, error: error instanceof Error ? error.message : 'Ошибка импорта' } });
    throw error;
  }
}

export async function rollbackImportJob(params: { jobId: string; userId: string }): Promise<{ rolledBack: boolean }> {
  const job = await prisma.importJob.findFirst({ where: { id: params.jobId, createdById: params.userId, status: ImportJobStatus.COMMITTED } });
  if (!job) throw new Error('Коммит импорта не найден.');

  const payload = job.payload as unknown as (NormalizedImportPayload & { rollback?: RollbackMeta });
  const rollback = payload.rollback;
  if (!rollback) {
    throw new Error('Для этого импорта откат недоступен. Выполните новый импорт, чтобы включить rollback-метаданные.');
  }
  if (rollback.rolledBackAt) {
    throw new Error('Этот импорт уже был откачен.');
  }

  await prisma.$transaction(async (tx) => {
    if (rollback.openingTransactionId) {
      await tx.transactionLine.deleteMany({ where: { transactionId: rollback.openingTransactionId } });
      await tx.transaction.deleteMany({ where: { id: rollback.openingTransactionId } });
    }

    for (const itemId of rollback.createdItemIds) {
      const linesCount = await tx.transactionLine.count({ where: { itemId } });
      if (linesCount > 0) {
        throw new Error('Нельзя откатить импорт: по новым позициям уже есть движения.');
      }
      await tx.itemUnit.deleteMany({ where: { itemId } });
      await tx.item.deleteMany({ where: { id: itemId } });
    }

    for (const item of rollback.updatedItems) {
      await tx.item.update({
        where: { id: item.itemId },
        data: {
          code: item.before.code,
          name: item.before.name,
          categoryId: item.before.categoryId,
          defaultExpenseArticleId: item.before.defaultExpenseArticleId,
          defaultPurposeId: item.before.defaultPurposeId,
          minQtyBase: item.before.minQtyBase === null ? null : new Prisma.Decimal(item.before.minQtyBase),
          isActive: item.before.isActive,
          synonyms: item.before.synonyms,
          note: item.before.note,
          baseUnitId: item.before.baseUnitId,
          defaultInputUnitId: item.before.defaultInputUnitId,
          reportUnitId: item.before.reportUnitId,
        },
      });
      await tx.itemUnit.deleteMany({ where: { itemId: item.itemId } });
      if (item.units.length > 0) {
        await tx.itemUnit.createMany({
          data: item.units.map((unit) => ({
            itemId: item.itemId,
            unitId: unit.unitId,
            factorToBase: new Prisma.Decimal(unit.factorToBase),
            isAllowed: unit.isAllowed,
            isDefaultInput: unit.isDefaultInput,
            isDefaultReport: unit.isDefaultReport,
          })),
        });
      }
    }

    await tx.importJob.update({
      where: { id: params.jobId },
      data: {
        payload: {
          ...(payload as unknown as Record<string, unknown>),
          rollback: {
            ...rollback,
            rolledBackAt: new Date().toISOString(),
          },
        },
      },
    });
  }, {
    maxWait: 10_000,
    timeout: 120_000,
  });

  return { rolledBack: true };
}
