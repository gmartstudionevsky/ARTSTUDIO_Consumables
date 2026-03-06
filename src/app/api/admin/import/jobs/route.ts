import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

async function requireAdmin(): Promise<{ id: string } | NextResponse> {
  const session = await getSessionFromRequestCookies();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  return { id: session.user.id };
}

export async function GET(request: Request): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  const [items, total] = await Promise.all([
    prisma.importJob.findMany({
      where: { createdById: admin.id },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      skip: query.offset,
      select: { id: true, createdAt: true, status: true, sourceFilename: true, error: true, payload: true },
    }),
    prisma.importJob.count({ where: { createdById: admin.id } }),
  ]);

  return NextResponse.json({
    items: items.map((job) => {
      const payload = job.payload as { rollback?: { rolledBackAt?: string } } | null;
      return {
        id: job.id,
        createdAt: job.createdAt,
        status: job.status,
        sourceFilename: job.sourceFilename,
        error: job.error,
        canRollback: Boolean(payload?.rollback),
        rolledBackAt: payload?.rollback?.rolledBackAt ?? null,
      };
    }),
    total,
  });
}
