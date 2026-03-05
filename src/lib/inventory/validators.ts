import { z } from 'zod';

const numberSchema = z.union([z.string(), z.number()]).transform((value) => Number(value));

const isIsoDate = (value: string): boolean => !Number.isNaN(Date.parse(value));

export const listInventorySchema = z.object({
  status: z.enum(['draft', 'applied', 'cancelled', 'all']).optional().default('all'),
  from: z.string().optional().refine((value) => !value || isIsoDate(value), { message: 'Некорректный from' }),
  to: z.string().optional().refine((value) => !value || isIsoDate(value), { message: 'Некорректный to' }),
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const createInventorySchema = z.object({
  occurredAt: z.string().refine((value) => isIsoDate(value), { message: 'Некорректная дата' }),
  note: z.string().trim().nullable().optional(),
  mode: z.enum(['REGULAR', 'OPENING']).optional().default('REGULAR'),
});

export const fillInventorySchema = z.object({
  scope: z.enum(['ALL_ACTIVE', 'CATEGORY', 'ITEMS']),
  categoryId: z.string().uuid().optional(),
  itemIds: z.array(z.string().uuid()).optional(),
}).superRefine((data, ctx) => {
  if (data.scope === 'CATEGORY' && !data.categoryId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Укажите раздел' });
  if (data.scope === 'ITEMS' && (!data.itemIds || data.itemIds.length === 0)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Выберите позиции' });
});

export const patchInventoryLinesSchema = z.object({
  updates: z.array(z.object({
    lineId: z.string().uuid(),
    qtyFactInput: numberSchema.nullable().optional(),
    unitId: z.string().uuid().nullable().optional(),
    apply: z.boolean().optional(),
    comment: z.string().trim().nullable().optional(),
  })).min(1),
});

export const applyInventorySchema = z.object({
  reasonId: z.string().uuid().nullable().optional(),
  note: z.string().trim().nullable().optional(),
});
