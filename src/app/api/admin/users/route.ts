import { Prisma, Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { createAdminUser, createUserSchema, listAdminUsers, usersListQuerySchema } from '@/lib/admin/users';

async function requireAdmin(): Promise<{ id: string } | NextResponse> {
  const session = await getSessionFromRequestCookies();

  if (!session) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  }

  return { id: session.user.id };
}

export async function GET(request: Request): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const parsed = usersListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Некорректные параметры запроса' }, { status: 400 });
  }

  const response = await listAdminUsers(parsed.data);
  return NextResponse.json(response);
}

export async function POST(request: Request): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  try {
    const body = await request.json().catch(() => null);
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }

    const response = await createAdminUser(parsed.data, admin.id);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Логин уже существует' }, { status: 409 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
