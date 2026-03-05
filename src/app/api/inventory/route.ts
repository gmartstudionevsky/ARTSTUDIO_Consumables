import { InventoryStatus, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { createInventorySchema, listInventorySchema } from '@/lib/inventory/validators';

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requireSupervisorOrAboveApi();
  if (error) return error;

  try {
    const query = listInventorySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const where: Prisma.InventorySessionWhereInput = {};

    if (query.status === 'draft') where.status = InventoryStatus.DRAFT;
    if (query.status === 'applied') where.status = InventoryStatus.APPLIED;
    if (query.status === 'cancelled') where.status = InventoryStatus.CANCELLED;
    if (query.from || query.to) {
      where.occurredAt = {};
      if (query.from) where.occurredAt.gte = new Date(query.from);
      if (query.to) where.occurredAt.lte = new Date(query.to);
    }
    if (query.q) {
      where.OR = [{ note: { contains: query.q, mode: 'insensitive' } }, { createdBy: { login: { contains: query.q, mode: 'insensitive' } } }];
    }

    const [sessions, total] = await Promise.all([
      prisma.inventorySession.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        skip: query.offset,
        take: query.limit,
        include: {
          createdBy: { select: { id: true, login: true } },
          appliedBy: { select: { id: true, login: true } },
          _count: { select: { lines: true } },
        },
      }),
      prisma.inventorySession.count({ where }),
    ]);

    return NextResponse.json({
      items: sessions.map((session) => ({
        id: session.id,
        occurredAt: session.occurredAt,
        status: session.status,
        createdAt: session.createdAt,
        createdBy: session.createdBy,
        appliedAt: session.appliedAt,
        appliedBy: session.appliedBy,
        note: session.note,
        linesTotal: session._count.lines,
        mode: session.mode,
      })),
      total,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Некорректные параметры' }, { status: 400 });
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const { user, error } = await requireSupervisorOrAboveApi();
  if (error || !user) return error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    const data = createInventorySchema.parse(body);

    const session = await prisma.inventorySession.create({
      data: {
        occurredAt: new Date(data.occurredAt),
        note: data.note ?? null,
        mode: data.mode,
        status: InventoryStatus.DRAFT,
        createdById: user.id,
      },
      include: { createdBy: { select: { id: true, login: true } }, appliedBy: { select: { id: true, login: true } } },
    });

    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
