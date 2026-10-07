import { z } from 'zod'
import { isUuid } from '@/lib/uuid'
import { INTEREST_CHIPS } from './interests'
import { isoDay, MAX_PASS_DAYS, spanDays } from './dates'

// POST /api/itineraries body: the blank pass answers (T-16-27). Strict objects
// (unknown keys fail), every length bounded, the 30-day cap enforced here and
// not only in the UI, interests from the chip list only.

const isoDate = z.string().refine((s) => isoDay(s) !== null, { message: 'Invalid date' })

const PassWhenSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('dates'), start: isoDate, end: isoDate }),
    z.strictObject({ kind: z.literal('length'), days: z.number().int().min(1).max(MAX_PASS_DAYS) }),
    z.strictObject({ kind: z.literal('unsure') }),
  ])
  .nullable()
  .superRefine((when, ctx) => {
    if (when?.kind !== 'dates') return
    const span = spanDays(when.start, when.end)
    if (span === null || span < 1) ctx.addIssue({ code: 'custom', message: 'End date is before the start date.' })
    else if (span > MAX_PASS_DAYS) ctx.addIssue({ code: 'custom', message: 'Trips can be up to 30 days.' })
  })

export const PassCreateSchema = z.strictObject({
  stops: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
  when: PassWhenSchema.default(null),
  adults: z.number().int().min(1).max(20).nullable().default(null),
  kids: z.number().int().min(0).max(20).nullable().default(null),
  interests: z
    .array(z.enum(INTEREST_CHIPS))
    .max(INTEREST_CHIPS.length)
    .default([])
    .transform((list) => [...new Set(list)]),
  /** No limit in the UI; bounded on the server only (Asmeen, 2026-10-06). */
  note: z
    .string()
    .trim()
    .max(5000)
    .transform((s) => (s === '' ? null : s))
    .nullable()
    .default(null),
  /** Client-made id that makes a retried create idempotent (Pitfall 7). */
  client_ref: z.string().refine(isUuid, { message: 'Invalid client_ref' }),
})

export type PassCreate = z.infer<typeof PassCreateSchema>
