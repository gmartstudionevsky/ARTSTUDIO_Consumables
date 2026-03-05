import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { commitImportJob } from '@/lib/import/commit';

const schema = z.object({
  jobId: z.string().uuid(),
  options: z.object({ createOpening: z.boolean().optional() }).optional(),
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
    const result = await commitImportJob({ jobId: data.jobId, userId: admin.id, options: data.options });
    return NextResponse.json({ ok: true, created: result.created, openingCreated: result.openingCreated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка импорта';
    const status = message.includes('не найден') || message.includes('содержит ошибки') || message.includes('уже импортировано') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
