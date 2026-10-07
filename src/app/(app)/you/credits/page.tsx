import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/shell/TopBar'
import { credits, dataCredits } from '@/lib/photos/credits'
import pkg from '../../../../../package.json'

// Credits & attributions (D-29, UI-SPEC §11 "Credits page"). One line per
// curated photo straight from the manifests (cities, then country photos),
// the place-name data (GeoNames, CC BY 4.0) and the map credits. Server-only:
// the manifests and credit rows never reach client JS.

const LABEL = 'font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-muted uppercase'
const LINK = 'font-semibold text-navy underline underline-offset-[3px]'

const MAP_CREDITS: { text: string; href: string }[] = [
  { text: 'Map data © OpenStreetMap contributors', href: 'https://www.openstreetmap.org/copyright' },
  { text: 'Map tiles: OpenFreeMap © OpenMapTiles', href: 'https://openfreemap.org' },
  { text: 'Place lookup: Nominatim (OpenStreetMap)', href: 'https://nominatim.org' },
]

export default async function CreditsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const photos = credits()
  const data = dataCredits()

  return (
    <>
      <TopBar variant="inner" back={{ href: '/you', label: 'You' }} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[640px] px-4 pt-6 pb-12 lg:px-8 lg:pt-8">
          <h1 className="text-[22px] leading-[1.2] font-semibold">Credits</h1>

          <section aria-labelledby="credits-photos" className="mt-8">
            <h2 id="credits-photos" className={LABEL}>
              Photos
            </h2>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {photos.map((p, i) => (
                <li key={`${i}-${p.sourceUrl}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                  <span className="min-w-0 text-base break-words">
                    {p.city}: {p.photographer},{' '}
                    <a href={p.licenceUrl} target="_blank" rel="noopener noreferrer license" className={LINK}>
                      {p.licence}
                    </a>
                  </span>
                  <a
                    href={p.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Source of the ${p.city} photo`}
                    className={`${LINK} inline-flex min-h-11 items-center text-xs`}
                  >
                    Source
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="credits-maps" className="mt-8">
            <h2 id="credits-maps" className={LABEL}>
              Maps
            </h2>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {MAP_CREDITS.map((m) => (
                <li key={m.text} className="flex min-h-14 items-center py-2">
                  <a href={m.href} target="_blank" rel="noopener noreferrer" className="text-base text-navy underline underline-offset-[3px]">
                    {m.text}
                  </a>
                </li>
              ))}
              {data.map((d) => (
                <li key={d.name} className="py-3 text-base">
                  <span>
                    Place names:{' '}
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className={LINK}>
                      {d.name}
                    </a>
                    ,{' '}
                    <a href={d.licenceUrl} target="_blank" rel="noopener noreferrer license" className={LINK}>
                      {d.licence}
                    </a>
                  </span>
                  <span className="mt-0.5 block text-xs leading-[1.33] text-muted">{d.use}</span>
                </li>
              ))}
            </ul>
          </section>

          <p className={`${LABEL} mt-8`}>Barabula {pkg.version}</p>
        </div>
      </div>
    </>
  )
}
