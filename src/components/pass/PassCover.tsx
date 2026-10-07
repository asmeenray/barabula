// Pass cover (UI-SPEC §3 Pass anatomy, D-06, D-37): the curated photo or the
// styled city-map cover, with the two fixed scrims and the text slots on top.
// Server-safe (no hooks); the photo itself is the small CoverImage client
// island. No glass or blur over photos; the only blur is the ≤10 px placeholder
// while the photo loads, with one exception: the laptop blank-pass title tiles
// (Asmeen, 7 Oct 2026, hero polish option A), which sit over a lighter laptop
// scrim. Text on the cover is always white inside a scrim.
// Moment 4 (16-22, D-30): given a trip id, the cover is a React ViewTransition
// named trip-cover-{id} (share="morph", default="none"); the plan header strip
// carries the same name, so opening a trip morphs the pass cover into it.

import { ViewTransition } from 'react'
import type { CoverPhoto } from '@/lib/photos/manifest'
import { coverTransitionName } from '@/lib/client/trip-open'
import { CityMapCover } from './CityMapCover'
import { CoverImage } from './CoverImage'
import { SplitFlap } from '@/components/motion/SplitFlap'

export type PassVariant = 'blank' | 'nownext' | 'upcoming' | 'header' | 'past'

// Phone heights (UI-SPEC "Fixed dimensions: pass covers"); laptop sizes come
// from the caller's className.
const HEIGHT: Record<PassVariant, string> = {
  blank: 'h-60',
  nownext: 'h-50',
  upcoming: 'h-36',
  header: 'h-24',
  past: 'h-18',
}

// Passes that use the 1920 laptop crop on wide screens; the rest stay ≤ 600 px wide.
const LARGE: Record<PassVariant, boolean> = {
  blank: true,
  nownext: true,
  upcoming: false,
  header: false,
  past: false,
}

// Display 36 on the blank and Now/Next passes; Mono 22 on the smaller covers.
const TITLE: Record<PassVariant, string> = {
  blank: 'text-[36px] leading-none tracking-[-0.02em]',
  nownext: 'text-[36px] leading-none tracking-[-0.02em]',
  upcoming: 'text-[22px] leading-[1.2] tracking-[-0.01em]',
  header: 'text-[22px] leading-[1.2] tracking-[-0.01em]',
  past: 'text-[22px] leading-[1.2] tracking-[-0.01em]',
}

// Bottom scrim strengthened after UAT (7 Oct 2026): titles keep >= 3:1 against
// the brightest 5% of pixels behind them on all 108 curated photos (was 26 below,
// worst Marrakech 1.9:1). Measured with the phone blank-pass and header crops.
const SCRIMS =
  'linear-gradient(to top, rgba(5,8,12,.84), rgba(5,8,12,.48) 38%, rgba(5,8,12,.05) 70%), linear-gradient(to bottom, rgba(5,8,12,.55), transparent 35%)'

// Laptop scrim behind the flap-tile title (A-3, 7 Oct 2026): lighter, since
// the tiles carry their own dark backing. The status line keeps >= 4.5:1 and
// the tile letters >= 3:1 on all 108 photos (src/__tests__/photos/cover-contrast.test.ts).
export const LIGHT_SCRIMS =
  'linear-gradient(to top, rgba(5,8,12,.55), rgba(5,8,12,.05) 45%), linear-gradient(to bottom, rgba(5,8,12,.45), transparent 30%)'

// The decided pair alone left the status line under 4.5:1 on 20 of the 108
// photos (worst Switzerland winter, 3.06:1 on the vertical pass). One narrow
// band under the tile rows only (the bottom 42 px; the rows end 42 px above
// the cover's bottom edge), at the lowest alpha that passes all 108: .21.
export const STATUS_BAND = 'linear-gradient(to top, rgba(5,8,12,.21), rgba(5,8,12,.21) 36px, transparent 42px)'

type Props = {
  photo: CoverPhoto | null
  /** Seeds the city-map cover when there is no photo. */
  cityName: string
  title: string
  stateLabel?: string
  /** IATA code, only when the manifest has a real one. */
  code?: string
  statusLine?: string
  variant: PassVariant
  /** The first pass on the page: eager photo with fetchPriority high. */
  priority?: boolean
  /** Hold the photo download (blur only) until the caller is ready. */
  holdPhoto?: boolean
  /** Called when the photo fails and the map cover takes over (hide the credit). */
  onFallback?: () => void
  titleAs?: 'h1' | 'h2' | 'h3' | 'p'
  /** Extra attributes for the title element (e.g. elementtiming). */
  titleAttrs?: Record<string, string>
  /** One line with ellipsis (trip titles in lists); otherwise up to 2 lines. */
  oneLine?: boolean
  /**
   * Split-flap the Display title (moment 1, the Now/Next title once per
   * visit): a SplitFlap `play` value, falsy on the server render.
   */
  flapTitle?: unknown
  /** Arrival-board settle for the flipped title and status line (blank pass on load). */
  flapBoard?: boolean
  /**
   * Moment 4: the trip whose cover this is, for the pass → plan header morph.
   * null keeps the transition wrapper without a shared name (the blank pass
   * before its trip exists), so naming it later does not remount the cover.
   */
  transitionId?: string | null
  /**
   * Laptop flap-tile title (blank pass, quick 261007-wms): the title as at
   * most two tile rows (tileRows). Adds the lighter laptop scrim and the 18 px
   * laptop status line; the phone keeps today's title and scrim. null or
   * absent: today's markup exactly.
   */
  tiles?: readonly string[] | null
  className?: string
}

// Arrival-board settle (blank pass on load): characters land left to right.
// "Where to next?" settles in ~1.4 s; the status line starts 0.3 s later.
const BOARD_TITLE = { frames: 10, frameMs: 40, cascade: 2 } as const
const BOARD_STATUS = { frames: 8, frameMs: 34, cascade: 1, delayMs: 300 } as const

export function PassCover({
  photo,
  cityName,
  title,
  stateLabel,
  code,
  statusLine,
  variant,
  priority = false,
  holdPhoto = false,
  onFallback,
  titleAs: Title = 'h2',
  titleAttrs,
  oneLine = false,
  flapTitle,
  flapBoard = false,
  transitionId,
  tiles = null,
  className = '',
}: Props) {
  const cover = (
    <div className={`relative isolate overflow-hidden bg-surface-2 text-on-photo ${HEIGHT[variant]} ${className}`}>
      {photo ? (
        <CoverImage
          photo={photo}
          cityName={cityName}
          large={LARGE[variant]}
          priority={priority}
          hold={holdPhoto}
          onFallback={onFallback}
        />
      ) : (
        <CityMapCover cityName={cityName} />
      )}

      {tiles ? (
        <>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 lg:hidden" style={{ backgroundImage: SCRIMS }} />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden lg:block"
            style={{ backgroundImage: `${STATUS_BAND}, ${LIGHT_SCRIMS}` }}
          />
        </>
      ) : (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: SCRIMS }} />
      )}

      {(stateLabel || code) && (
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 px-4 pt-3 font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] uppercase">
          <span>{stateLabel}</span>
          {code && <span className="font-mono tracking-[0.08em]">{code}</span>}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
        <Title
          {...titleAttrs}
          // Chrome names a row of inline-flex tiles letter by letter ("W h e r e"),
          // so with tiles the title carries its own name (headings allow one).
          aria-label={tiles ? title : undefined}
          className={`${oneLine ? 'truncate' : 'line-clamp-2 text-balance break-words'} max-w-[85%] font-mono font-semibold uppercase [text-shadow:0_1px_12px_rgba(5,8,12,.5)] ${TITLE[variant]}${
            tiles ? ' lg:line-clamp-none lg:max-w-none lg:text-wrap' : ''
          }`}
        >
          {flapTitle === undefined ? (
            title
          ) : flapBoard ? (
            <SplitFlap text={title} play={flapTitle} tiles={tiles} {...BOARD_TITLE} />
          ) : (
            <SplitFlap text={title} play={flapTitle} tiles={tiles} />
          )}
        </Title>
        {statusLine && (
          <p
            className={`mt-1 truncate font-mono text-base leading-tight tabular-nums${
              tiles ? ' lg:mt-2 lg:text-[18px] lg:[text-shadow:0_1px_8px_rgba(5,8,12,.6)]' : ''
            }`}
          >
            {flapBoard && flapTitle !== undefined ? (
              <SplitFlap text={statusLine} play={flapTitle} {...BOARD_STATUS} />
            ) : (
              statusLine
            )}
          </p>
        )}
      </div>
    </div>
  )
  if (transitionId === undefined) return cover
  return (
    <ViewTransition name={transitionId ? coverTransitionName(transitionId) : undefined} share="morph" default="none">
      {cover}
    </ViewTransition>
  )
}

/** "Photo: {photographer}, {licence}" for the pass body; never on the photo itself. */
export function PhotoCredit({ photo, className = 'text-muted' }: { photo: CoverPhoto; className?: string }) {
  return (
    <p className={`font-read text-xs leading-[1.33] ${className}`}>
      Photo: {photo.photographer}, {photo.licence}
    </p>
  )
}
