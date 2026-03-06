import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { rollbackImportJob } from '@/lib/import/commit';

const schema = z.object({
  jobId: z.string().uuid(),
});

async function requireAdmin(): Promise<{ id: string } | NextResponse> {
  const session = await getSessionFromRequestCookies();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  return { id: session.user.id };
}

export async function POST(request: Request): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  try {
    const body = await request.json().catch(() => null);
    const data = schema.parse(body);
    const result = await rollbackImportJob({ jobId: data.jobId, userId: admin.id });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка отката импорта';
    const status = message.includes('не найден') || message.includes('недоступен') || message.includes('уже был') || message.includes('Нельзя откатить') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
