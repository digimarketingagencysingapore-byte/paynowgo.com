import { z } from 'zod';

export const DisplayLoginSchema = z.object({
  deviceKey: z.string()
    .min(1, 'Device key is required')
    .max(10, 'Device key too long')
    .regex(/^[0-9]+$/, 'Device key can only contain numbers')
});

export const DisplayEventSchema = z.object({
  type: z.enum(['show', 'hide']),
  orderId: z.string().uuid().optional(),
  qrSvg: z.string().optional(),
  amount: z.number().positive().optional(),
  reference: z.string().optional(),
  expiresAt: z.string().datetime().optional()
});

export type DisplayLoginRequest = z.infer<typeof DisplayLoginSchema>;
export type DisplayEvent = z.infer<typeof DisplayEventSchema>;