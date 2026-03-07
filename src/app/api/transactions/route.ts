import { Prisma, RecordStatus, TxType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createAccountingEventWriteService } from '@/lib/application/accounting-event';
import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { isDateLocked } from '@/lib/period-locks/service';
import { getSettings } from '@/lib/settings/service';
import { sendTxCreated } from '@/lib/telegram/service';

const accountingEventWriteService = createAccountingEventWriteService();

const numberInputSchema = z.union([z.string(), z.number()]).transform((value) => Number(value));

const createSchema = z.object({
  type: z.nativeEnum(TxType).refine((value) => value === TxType.IN || value === TxType.OUT || value === TxType.ADJUST, { message: 'Недопустимый тип операции' }),
  occurredAt: z.string().datetime().nullable().optional(),
  note: z.string().trim().nullable().optional(),
  intakeMode: z.enum(['SINGLE_PURPOSE', 'DISTRIBUTE_PURPOSES']).optional(),
  headerPurposeId: z.string().uuid().nullable().optional(),
  lines: z.array(
    z.object({
      itemId: z.string().uuid(),
      qtyInput: numberInputSchema,
      unitId: z.string().uuid(),
      expenseArticleId: z.string().uuid().nullable().optional(),
      purposeId: z.string().uuid().nullable().optional(),
      comment: z.string().trim().nullable().optional(),
      distributions: z.array(z.object({ purposeId: z.string().uuid(), qtyInput: numberInputSchema })).optional(),
    })
  ).min(1),
});

const isIsoDate = (value: string): boolean => !Number.isNaN(Date.parse(value));

const listSchema = z.object({
  from: z.string().optional().refine((value) => !value || isIsoDate(value), { message: 'Некорректный from' }),
  to: z.string().optional().refine((value) => !value || isIsoDate(value), { message: 'Некорректный to' }),
  type: z.enum(['IN', 'OUT', 'ADJUST', 'OPENING', 'INVENTORY_APPLY', 'all']).optional().default('all'),
  status: z.enum(['active', 'cancelled', 'all']).optional().default('all'),
  q: z.string().trim().optional(),
  itemId: z.string().uuid().optional(),
  expenseArticleId: z.string().uuid().optional(),
  purposeId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

type TxListRow = {
  id: string;
  batchId: string;
  type: TxType;
  occurredAt: Date;
  createdAt: Date;
  createdById: string;
  createdByLogin: string;
  note: string | null;
  status: RecordStatus;
  linesTotal: bigint;
  linesActive: bigint;
  linesCancelled: bigint;
};

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requireSupervisorOrAboveApi();
  if (error) return error;

  try {
    const query = listSchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));

    const filters: Prisma.Sql[] = [];
    if (query.from) filters.push(Prisma.sql`tx."occurredAt" >= ${new Date(query.from)}`);
    if (query.to) filters.push(Prisma.sql`tx."occurredAt" <= ${new Date(query.to)}`);
    if (query.type !== 'all') filters.push(Prisma.sql`tx.type = ${query.type}::"TxType"`);
    if (query.status === 'active') filters.push(Prisma.sql`tx.status = 'ACTIVE'::"RecordStatus"`);
    if (query.status === 'cancelled') filters.push(Prisma.sql`tx.status = 'CANCELLED'::"RecordStatus"`);
    if (query.itemId) filters.push(Prisma.sql`EXISTS (SELECT 1 FROM "TransactionLine" tl WHERE tl."transactionId" = tx.id AND tl."itemId" = ${query.itemId}::uuid)`);
    if (query.expenseArticleId) filters.push(Prisma.sql`EXISTS (SELECT 1 FROM "TransactionLine" tl WHERE tl."transactionId" = tx.id AND tl."expenseArticleId" = ${query.expenseArticleId}::uuid)`);
    if (query.purposeId) filters.push(Prisma.sql`EXISTS (SELECT 1 FROM "TransactionLine" tl WHERE tl."transactionId" = tx.id AND tl."purposeId" = ${query.purposeId}::uuid)`);
    if (query.categoryId) filters.push(Prisma.sql`EXISTS (SELECT 1 FROM "TransactionLine" tl JOIN "Item" i ON i.id = tl."itemId" WHERE tl."transactionId" = tx.id AND i."categoryId" = ${query.categoryId}::uuid)`);
    if (query.q) {
      const pattern = `%${query.q}%`;
      filters.push(Prisma.sql`(
        tx."batchId" ILIKE ${pattern}
        OR u.login ILIKE ${pattern}
        OR EXISTS (
          SELECT 1
          FROM "TransactionLine" tlq
          JOIN "Item" iq ON iq.id = tlq."itemId"
          WHERE tlq."transactionId" = tx.id AND (iq.name ILIKE ${pattern} OR iq.code ILIKE ${pattern})
        )
      )`);
    }

    const whereSql = filters.length > 0 ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}` : Prisma.sql``;

    const [items, totalRows] = await Promise.all([
      prisma.$queryRaw<TxListRow[]>(Prisma.sql`
        WITH filtered_tx AS (
          SELECT tx.id
          FROM "Transaction" tx
          JOIN "User" u ON u.id = tx."createdById"
          ${whereSql}
          ORDER BY tx."occurredAt" DESC, tx."createdAt" DESC
          LIMIT ${query.limit}
          OFFSET ${query.offset}
        )
        SELECT
          tx.id,
          tx."batchId",
          tx.type,
          tx."occurredAt",
          tx."createdAt",
          tx."createdById",
          u.login AS "createdByLogin",
          tx.note,
          tx.status,
          COUNT(tl.id)::bigint AS "linesTotal",
          COALESCE(SUM(CASE WHEN tl.status = 'ACTIVE' THEN 1 ELSE 0 END), 0)::bigint AS "linesActive",
          COALESCE(SUM(CASE WHEN tl.status = 'CANCELLED' THEN 1 ELSE 0 END), 0)::bigint AS "linesCancelled"
        FROM filtered_tx f
        JOIN "Transaction" tx ON tx.id = f.id
        JOIN "User" u ON u.id = tx."createdById"
        LEFT JOIN "TransactionLine" tl ON tl."transactionId" = tx.id
        GROUP BY tx.id, u.id
        ORDER BY tx."occurredAt" DESC, tx."createdAt" DESC
      `),
      prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT COUNT(DISTINCT tx.id)::bigint AS total
        FROM "Transaction" tx
        JOIN "User" u ON u.id = tx."createdById"
        ${whereSql}
      `),
    ]);

    return NextResponse.json({
      items: items.map((row) => {
        const linesTotal = Number(row.linesTotal);
        const linesActive = Number(row.linesActive);
        const linesCancelled = Number(row.linesCancelled);
        const uiStatus = linesActive === 0 ? 'CANCELLED' : linesCancelled > 0 ? 'PARTIAL' : 'ACTIVE';

        return {
          id: row.id,
          batchId: row.batchId,
          type: row.type,
          occurredAt: row.occurredAt,
          createdAt: row.createdAt,
          createdBy: { id: row.createdById, login: row.createdByLogin },
          note: row.note,
          status: row.status,
          linesTotal,
          linesActive,
          linesCancelled,
          uiStatus,
        };
      }),
      total: Number(totalRows[0]?.total ?? 0),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Некорректные параметры запроса' }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const { user, error } = await requireSupervisorOrAboveApi();
  if (error || !user) return error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    const data = createSchema.parse(body);
    const settings = await getSettings(prisma);

    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();
    if (user.role === 'SUPERVISOR') {
      const minDate = new Date();
      minDate.setDate(minDate.getDate() - settings.supervisorBackdateDays);
      if (occurredAt < minDate) {
        return NextResponse.json({ error: `Супервайзеру доступен ввод задним числом только на ${settings.supervisorBackdateDays} дней.` }, { status: 403 });
      }
    }

    const locked = await isDateLocked(occurredAt, prisma);
    if (locked && user.role !== 'ADMIN') {
      return NextResponse.json({ error: `Период закрыт. Операции за ${occurredAt.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })} запрещены.` }, { status: 403 });
    }

    const txResult = await accountingEventWriteService.createMovement({
      movementType: data.type as 'IN' | 'OUT' | 'ADJUST',
      occurredAt: occurredAt.toISOString(),
      note: data.note ?? null,
      intakeMode: data.intakeMode,
      headerPurposeId: data.headerPurposeId,
      lines: data.lines,
      context: {
        actorId: user.id,
        actorRole: user.role,
        entryPoint: 'api',
        correlationId: request.headers.get('x-correlation-id') ?? undefined,
      },
    });

    if (!txResult.ok) {
      const status = txResult.kind === 'unexpected' ? 500 : txResult.kind === 'not_found' ? 404 : txResult.kind === 'conflict' ? 409 : 400;
      return NextResponse.json({ error: txResult.message, scenario: txResult.scenario, details: txResult.details }, { status });
    }

    try {
      void sendTxCreated(txResult.data.transaction.id);
    } catch (telegramError) {
      console.error('[telegram] tx notification enqueue failed', telegramError);
    }

    return NextResponse.json({
      transaction: txResult.data.transaction,
      lines: txResult.data.lines,
      projection: txResult.data.projection,
      recovery: txResult.data.recovery,
      ...(txResult.data.warnings?.length ? { warnings: txResult.data.warnings } : {}),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Некорректные данные операции' }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}
