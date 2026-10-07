// Pass cover (UI-SPEC §3 Pass anatomy, D-06, D-37): the curated photo or the
// styled city-map cover, with the two fixed scrims and the text slots on top.
// Server-safe (no hooks); the photo itself is the small CoverImage client
// island. No glass or blur over photos; the only blur is the ≤10 px placeholder
// while the photo loads. Text on the cover is always white inside a scrim.

import type { CoverPhoto } from '@/lib/photos/manifest'
import { CityMapCover } from './CityMapCover'
import { CoverImage } from './CoverImage'

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

const SCRIMS =
  'linear-gradient(to top, rgba(5,8,12,.82), rgba(5,8,12,.05) 55%), linear-gradient(to bottom, rgba(5,8,12,.55), transparent 35%)'

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
  className?: string
}

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
  className = '',
}: Props) {
  return (
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

      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: SCRIMS }} />

      {(stateLabel || code) && (
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 px-4 pt-3 font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] uppercase">
          <span>{stateLabel}</span>
          {code && <span className="font-mono tracking-[0.08em]">{code}</span>}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
        <Title
          {...titleAttrs}
          className={`${oneLine ? 'truncate' : 'line-clamp-2 text-balance break-words'} max-w-[85%] font-mono font-semibold uppercase ${TITLE[variant]}`}
        >
          {title}
        </Title>
        {statusLine && <p className="mt-1 truncate font-mono text-base leading-tight tabular-nums">{statusLine}</p>}
      </div>
    </div>
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
