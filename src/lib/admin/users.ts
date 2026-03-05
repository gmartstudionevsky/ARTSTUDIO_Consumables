import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';

import { hashPassword } from '@/lib/auth/password';
import { prisma } from '@/lib/db/prisma';

const LOGIN_PATTERN = /^[a-z0-9._-]+$/;
const PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const userRoleSchema = z.nativeEnum(Role);

export const userLoginSchema = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .transform((value) => value.toLowerCase())
  .refine((value) => LOGIN_PATTERN.test(value), {
    message: 'Логин должен содержать только латиницу в нижнем регистре, цифры и символы ._-',
  });

export const userTempPasswordSchema = z.string().trim().min(8).max(64);

export const usersListQuerySchema = z.object({
  q: z.string().trim().optional().default(''),
  role: z.enum(['SUPERVISOR', 'MANAGER', 'ADMIN', 'all']).optional().default('all'),
  active: z.enum(['true', 'false', 'all']).optional().default('all'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(30),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const createUserSchema = z.object({
  login: userLoginSchema,
  role: userRoleSchema,
  tempPassword: userTempPasswordSchema.optional(),
});

export const patchUserSchema = z
  .object({
    role: userRoleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => value.role !== undefined || value.isActive !== undefined, {
    message: 'Нужно передать хотя бы одно поле для изменения',
  });

export const resetPasswordSchema = z.object({
  tempPassword: userTempPasswordSchema.optional(),
});

export type UsersListQuery = z.infer<typeof usersListQuerySchema>;

export type AdminUsersListItem = {
  id: string;
  login: string;
  role: Role;
  isActive: boolean;
  forcePasswordChange: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  createdBy: { id: string; login: string } | null;
  sessionsActive: number;
  hasLegacyPassword: boolean;
};

export function generateTempPassword(minLength = 12, maxLength = 16): string {
  const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
  let result = '';

  for (let index = 0; index < length; index += 1) {
    const charIndex = Math.floor(Math.random() * PASSWORD_ALPHABET.length);
    result += PASSWORD_ALPHABET[charIndex];
  }

  if (!/[A-Za-z]/.test(result)) {
    result = `A${result.slice(1)}`;
  }

  if (!/\d/.test(result)) {
    result = `${result.slice(0, -1)}7`;
  }

  return result;
}

export async function listAdminUsers(query: UsersListQuery): Promise<{ items: AdminUsersListItem[]; total: number }> {
  const where: Prisma.UserWhereInput = {
    ...(query.q ? { login: { contains: query.q.toLowerCase(), mode: 'insensitive' } } : {}),
    ...(query.role !== 'all' ? { role: query.role } : {}),
    ...(query.active !== 'all' ? { isActive: query.active === 'true' } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      skip: query.offset,
      select: {
        id: true,
        login: true,
        role: true,
        isActive: true,
        forcePasswordChange: true,
        createdAt: true,
        lastLoginAt: true,
        createdBy: { select: { id: true, login: true } },
        passwordHash: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  const userIds = rows.map((row) => row.id);
  const sessions = userIds.length
    ? await prisma.session.groupBy({
        by: ['userId'],
        where: {
          userId: { in: userIds },
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        _count: { _all: true },
      })
    : [];

  const sessionsMap = new Map<string, number>(sessions.map((row) => [row.userId, row._count._all]));

  return {
    items: rows.map((row) => ({
      id: row.id,
      login: row.login,
      role: row.role,
      isActive: row.isActive,
      forcePasswordChange: row.forcePasswordChange,
      createdAt: row.createdAt,
      lastLoginAt: row.lastLoginAt,
      createdBy: row.createdBy,
      sessionsActive: sessionsMap.get(row.id) ?? 0,
      hasLegacyPassword: row.passwordHash.startsWith('$argon2') || row.passwordHash.startsWith('argon2$'),
    })),
    total,
  };
}

export async function createAdminUser(input: z.infer<typeof createUserSchema>, adminId: string): Promise<{ user: { id: string; login: string; role: Role; isActive: boolean; forcePasswordChange: boolean }; tempPassword: string }> {
  const tempPassword = input.tempPassword ?? generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.user.create({
    data: {
      login: input.login,
      role: input.role,
      passwordHash,
      forcePasswordChange: true,
      isActive: true,
      createdById: adminId,
    },
    select: {
      id: true,
      login: true,
      role: true,
      isActive: true,
      forcePasswordChange: true,
    },
  });

  return { user, tempPassword };
}

export async function updateAdminUserById(userId: string, data: { role?: Role; isActive?: boolean }) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      login: true,
      role: true,
      isActive: true,
      forcePasswordChange: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
}

export async function resetAdminUserPassword(userId: string, tempPassword?: string): Promise<string> {
  const nextPassword = tempPassword ?? generateTempPassword();
  const passwordHash = await hashPassword(nextPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        forcePasswordChange: true,
      },
    });

    await tx.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });

  return nextPassword;
}

export async function revokeUserSessions(userId: string): Promise<number> {
  const result = await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count;
}
