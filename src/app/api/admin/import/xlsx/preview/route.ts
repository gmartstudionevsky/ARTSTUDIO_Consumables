import { ImportJobStatus, Role } from '@prisma/client';
import { NextResponse } from 'next/server';

import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { parseImportWorkbook } from '@/lib/import/xlsx/parse';
import { validateImportData } from '@/lib/import/xlsx/validate';

async function requireAdmin(): Promise<{ id: string } | NextResponse> {
  const session = await getSessionFromRequestCookies();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  return { id: session.user.id };
}

export async function POST(request: Request): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Файл не передан' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const parsed = await parseImportWorkbook(arrayBuffer);
  const existingItems = await prisma.item.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      synonyms: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  });
  const payload = validateImportData(parsed, existingItems);

  const job = await prisma.importJob.create({
    data: {
      createdById: admin.id,
      status: ImportJobStatus.DRAFT,
      sourceFilename: file.name || 'import.xlsx',
      payload,
    },
    select: { id: true },
  });

  return NextResponse.json({
    jobId: job.id,
    summary: payload.summary,
    errors: payload.errors,
    warnings: payload.warnings,
    syncRows: payload.syncPlan.rows,
  });
}
