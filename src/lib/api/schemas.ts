import { z } from 'zod'

// Request schemas for the app's write routes (zod 4). Objects are strict:
// unknown keys fail, so a client can't mass-assign columns (T-16-17).

/** Optional text: trimmed, at most `max` characters; blank or null is stored as null. */
function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .transform((s) => (s === '' ? null : s))
    .nullable()
    .optional()
}

/** The extra_data keys a client may write on an activity; everything else there is server-owned. */
export const ActivityExtraPatchSchema = z.strictObject({
  visited: z.boolean().optional(),
  fixed_time: z.boolean().optional(),
})

export const ActivityPatchSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(200).optional(),
    time: optionalText(20),
    description: optionalText(2000),
    location: optionalText(300),
    /** null = Maybe (D-21). */
    day_number: z.number().int().min(1).max(30).nullable().optional(),
    /** Fractional order inside a day. z.number() already rejects NaN and ±Infinity. */
    position: z.number().optional(),
    duration: optionalText(100),
    tips: optionalText(2000),
    extra_data: ActivityExtraPatchSchema.optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, { message: 'Nothing to update' })

export type ActivityPatch = z.infer<typeof ActivityPatchSchema>
