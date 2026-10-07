'use client'

// Places search and filters (UI-SPEC §10): a search field ("Search your
// places") and one chip row — Select "All trips" · ToggleGroup All / To visit /
// Visited · Select "All types" (only the types in the data). Phone: floating
// over the map at a 16 px inset; laptop: at the top of the 400 px panel.
// Filtering runs on data already loaded; nothing is sent anywhere (T-16-53).

import { Select } from '@base-ui/react/select'
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { CheckIcon, ChevronDownIcon, SearchIcon, XIcon } from '@/components/icons'
import type { PlaceFilters, PlaceType, VisitedFilter } from '@/lib/places-tab/filter'

const VISITED: { value: VisitedFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'to-visit', label: 'To visit' },
  { value: 'visited', label: 'Visited' },
]

const TYPE_LABELS: Record<PlaceType, string> = { places: 'Places', stays: 'Stays' }

const ALL = '__all'

type Variant = 'floating' | 'panel'

/** Floating controls sit on the map: a soft drop shadow in light, a 1 px line in dark (UI-SPEC Elevation). */
function surface(variant: Variant): string {
  return variant === 'floating'
    ? 'bg-surface shadow-[0_2px_10px_rgb(11_16_20/0.18)] dark:shadow-none dark:border dark:border-line'
    : 'bg-surface border-[1.5px] border-field'
}

const POPUP =
  'max-h-[min(320px,var(--available-height))] min-w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface py-1 text-ink shadow-[0_8px_24px_rgb(11_16_20/0.16)] outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none'
const ITEM =
  'grid min-h-11 cursor-default grid-cols-[20px_1fr] items-center gap-2 px-3 text-base outline-none select-none data-highlighted:bg-surface-2'

function FilterSelect({
  label,
  value,
  items,
  onChange,
  variant,
}: {
  label: string
  value: string
  items: { value: string; label: string }[]
  onChange: (value: string) => void
  variant: Variant
}) {
  return (
    <Select.Root
      items={items}
      value={value}
      onValueChange={(v) => {
        if (typeof v === 'string') onChange(v)
      }}
      modal={false}
    >
      <Select.Trigger
        aria-label={label}
        className={`${surface(variant)} flex h-11 shrink-0 items-center gap-1.5 rounded-full pr-3 pl-4 text-base whitespace-nowrap text-ink transition-transform duration-150 ease-out active:scale-[0.97] data-popup-open:ring-2 data-popup-open:ring-ink`}
      >
        <Select.Value className="max-w-[160px] truncate" />
        <Select.Icon className="text-muted">
          <ChevronDownIcon size={18} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="z-[60] outline-none" alignItemWithTrigger={false} sideOffset={4} collisionPadding={16}>
          <Select.Popup className={POPUP}>
            <Select.List>
              {items.map((item) => (
                <Select.Item key={item.value} value={item.value} className={ITEM}>
                  <Select.ItemIndicator className="col-start-1">
                    <CheckIcon size={16} />
                  </Select.ItemIndicator>
                  <Select.ItemText className="col-start-2 truncate">{item.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}

interface PlacesFiltersProps {
  filters: PlaceFilters
  onChange: (next: PlaceFilters) => void
  /** Trips that have places, in home order. */
  trips: { id: string; title: string }[]
  types: PlaceType[]
  variant: Variant
}

export function PlacesFilters({ filters, onChange, trips, types, variant }: PlacesFiltersProps) {
  const set = <K extends keyof PlaceFilters>(key: K, value: PlaceFilters[K]) => onChange({ ...filters, [key]: value })
  const tripItems = [{ value: ALL, label: 'All trips' }, ...trips.map((t) => ({ value: t.id, label: t.title }))]
  const typeItems = [{ value: ALL, label: 'All types' }, ...types.map((t) => ({ value: t, label: TYPE_LABELS[t] }))]

  return (
    <div className="flex flex-col gap-2">
      <div className={`${surface(variant)} relative flex h-12 items-center rounded-lg`}>
        <SearchIcon aria-hidden size={20} className="pointer-events-none absolute left-3 text-muted" />
        <input
          type="search"
          aria-label="Search your places"
          placeholder="Search your places"
          autoComplete="off"
          enterKeyHint="search"
          value={filters.q}
          onChange={(e) => set('q', e.target.value)}
          className="h-full w-full rounded-lg bg-transparent pr-11 pl-10 text-base text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink [&::-webkit-search-cancel-button]:hidden"
        />
        {filters.q !== '' && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => set('q', '')}
            className="absolute right-0.5 inline-flex size-11 items-center justify-center rounded-lg text-muted hover:text-ink"
          >
            <XIcon size={18} />
          </button>
        )}
      </div>

      {/* One row; on a narrow phone it scrolls sideways instead of wrapping over the map. */}
      <div
        className={`flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          variant === 'floating' ? '-mx-4 px-4 py-1' : 'flex-wrap'
        }`}
      >
        <FilterSelect
          label="Trip"
          value={filters.tripId ?? ALL}
          items={tripItems}
          onChange={(v) => set('tripId', v === ALL ? null : v)}
          variant={variant}
        />
        <ToggleGroup
          aria-label="Visited"
          value={[filters.visited]}
          // A segmented control: one value always stays chosen.
          onValueChange={(v) => {
            const next = v[0] as VisitedFilter | undefined
            if (next) set('visited', next)
          }}
          className={`${surface(variant)} flex h-11 shrink-0 items-center gap-0.5 rounded-full p-0.5`}
        >
          {VISITED.map((o) => (
            <Toggle
              key={o.value}
              value={o.value}
              className="flex h-full items-center rounded-full px-3.5 text-base whitespace-nowrap text-ink transition-[background-color,color] duration-150 ease-out hover:bg-surface-2 data-[pressed]:bg-ink data-[pressed]:text-bg"
            >
              {o.label}
            </Toggle>
          ))}
        </ToggleGroup>
        <FilterSelect
          label="Type"
          value={filters.type ?? ALL}
          items={typeItems}
          onChange={(v) => set('type', v === ALL ? null : (v as PlaceType))}
          variant={variant}
        />
      </div>
    </div>
  )
}
