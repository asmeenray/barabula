import { z } from 'zod'
import { isUuid } from '@/lib/uuid'
import { MAX_PASS_DAYS, spanDays } from '@/lib/pass/dates'
import {
  isoDate,
  PassAdultsSchema,
  PassInterestsSchema,
  PassKidsSchema,
  PassNoteSchema,
  PassStopsSchema,
  PassWhenSchema,
} from '@/lib/pass/schema'

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

/** The extra_data keys a client may set when it creates an activity (T-16-33). */
export const ActivityCreateExtraSchema = z.strictObject({
  fixed_time: z.boolean().optional(),
})

/** POST /api/activities (16-11, D-18). The server picks the position (end of the bucket). */
export const ActivityCreateSchema = z.strictObject({
  itinerary_id: z.string().refine(isUuid),
  /** null = Maybe (D-21). */
  day_number: z.number().int().min(1).max(30).nullable(),
  name: z.string().trim().min(1).max(200),
  location: optionalText(300),
  description: optionalText(2000),
  time: optionalText(20),
  extra_data: ActivityCreateExtraSchema.optional(),
})

export type ActivityCreate = z.infer<typeof ActivityCreateSchema>

/**
 * The pass answers a trip-details edit may change (16-17, D-20). Every key is
 * optional (the server merges them into the stored pass); v and client_ref
 * stay server-owned, so a client can't change the create idempotency key.
 */
export const TripPassPatchSchema = z.strictObject({
  stops: PassStopsSchema.optional(),
  when: PassWhenSchema.optional(),
  adults: PassAdultsSchema.optional(),
  kids: PassKidsSchema.optional(),
  interests: PassInterestsSchema.optional(),
  note: PassNoteSchema.optional(),
})

/** The extra_data keys a trip edit may write; everything else there is server-owned (T-16-47). */
export const TripExtraPatchSchema = z.strictObject({
  pass: TripPassPatchSchema.optional(),
  day_count: z.number().int().min(1).max(MAX_PASS_DAYS).optional(),
})

/**
 * PATCH /api/itineraries/{id} (16-17). Dates travel as a pair: both set
 * (start ≤ end, at most 30 days) or both null (undated). is_public is not
 * writable here (sharing is not in phase 16).
 */
export const TripPatchSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(200).optional(),
    destination: optionalText(200),
    start_date: isoDate.nullable().optional(),
    end_date: isoDate.nullable().optional(),
    extra_data: TripExtraPatchSchema.optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, { message: 'Nothing to update' })
  .superRefine((patch, ctx) => {
    const hasStart = patch.start_date !== undefined
    const hasEnd = patch.end_date !== undefined
    if (!hasStart && !hasEnd) return
    if (hasStart !== hasEnd || (patch.start_date === null) !== (patch.end_date === null)) {
      ctx.addIssue({ code: 'custom', message: 'Send both dates, or neither.' })
      return
    }
    if (!patch.start_date || !patch.end_date) return
    const span = spanDays(patch.start_date, patch.end_date)
    if (span === null || span < 1) ctx.addIssue({ code: 'custom', message: 'End date is before the start date.' })
    else if (span > MAX_PASS_DAYS) ctx.addIssue({ code: 'custom', message: 'Trips can be up to 30 days.' })
  })

export type TripPatch = z.infer<typeof TripPatchSchema>
