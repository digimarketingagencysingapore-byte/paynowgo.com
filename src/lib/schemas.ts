import { z } from 'zod';

// Order creation schema
export const CreateOrderSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be at least 0.01 SGD').max(999999.99, 'Amount too large'),
  reference: z.string()
    .min(1, 'Reference is required')
    .max(25, 'Reference cannot exceed 25 characters')
    .regex(/^[A-Za-z0-9\-_/]+$/, 'Reference can only contain letters, numbers, hyphens, underscores, and slashes'),
  expiresAt: z.string().datetime().optional()
});

// Mark paid schema
export const MarkPaidSchema = z.object({
  note: z.string().optional()
});

// Display registration schema
export const DisplayRegisterSchema = z.object({
  name: z.string().min(1, 'Display name is required').max(50, 'Name too long'),
  tenantId: z.string().uuid('Invalid tenant ID')
});

export type CreateOrderRequest = z.infer<typeof CreateOrderSchema>;
export type MarkPaidRequest = z.infer<typeof MarkPaidSchema>;
export type DisplayRegisterRequest = z.infer<typeof DisplayRegisterSchema>;