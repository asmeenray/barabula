// Styled city-map cover for cities outside the curated photo set (D-06,
// 16-RESEARCH Open Question 3). Decorative only: an SVG street pattern built
// deterministically from the city name, so the same city always gets the same
// cover. No network request, no map library, no tiles, so it can never delay
// the first paint. Not map data, so it carries no tile attribution.
// The scrims and text slots come from PassCover, the same as on a photo.

type Point = [number, number]

const W = 400
const H = 200
const CX = W / 2
const CY = H / 2

/** FNV-1a over the normalised name: a stable 32-bit seed. */
function seedOf(name: string): number {
  let h = 0x811c9dc5
  for (const ch of name.trim().toLowerCase()) {
    h ^= ch.codePointAt(0) ?? 0
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32: small, deterministic PRNG in 0..1. */
function prng(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const r1 = (n: number) => Math.round(n * 10) / 10

/** A gentle road through the frame: enters one edge, bends twice, leaves the opposite edge. */
function road(rand: () => number, vertical: boolean): string {
  const at = (t: number): Point => {
    const drift = (rand() - 0.5) * (vertical ? W : H) * 0.5
    return vertical ? [CX + drift + (rand() - 0.5) * W * 0.6, t * H] : [t * W, CY + drift + (rand() - 0.5) * H * 0.4]
  }
  const [p0, c1, c2, p3] = [at(-0.1), at(0.35), at(0.65), at(1.1)]
  return `M${r1(p0[0])} ${r1(p0[1])}C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p3[0])} ${r1(p3[1])}`
}

export function cityMapArt(cityName: string) {
  const rand = prng(seedOf(cityName))
  const angle = r1((rand() - 0.5) * 50) // street grid rotation, -25..25 deg
  const step = 18 + Math.floor(rand() * 14) // block size, 18..31
  const lines: number[] = []
  for (let v = -W; v <= W * 2; v += step) lines.push(v)
  const roads = [road(rand, false), road(rand, true), road(rand, rand() > 0.5)]
  const ring = 34 + Math.floor(rand() * 26)
  return { angle, lines, roads, ring }
}

export function CityMapCover({ cityName }: { cityName: string }) {
  const { angle, lines, roads, ring } = cityMapArt(cityName)
  return (
    <div data-cover="map" className="absolute inset-0 bg-surface-2" aria-hidden="true">
      <svg className="h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" focusable="false">
        <g transform={`rotate(${angle} ${CX} ${CY})`} stroke="var(--line)" strokeWidth="1" fill="none">
          {lines.map((v) => (
            <line key={`v${v}`} x1={v} y1={-H} x2={v} y2={H * 2} />
          ))}
          {lines.map((v) => (
            <line key={`h${v}`} x1={-W} y1={v - W / 2} x2={W * 2} y2={v - W / 2} />
          ))}
        </g>
        <g stroke="var(--muted)" strokeOpacity="0.45" strokeLinecap="round" fill="none">
          <circle cx={CX} cy={CY} r={ring} strokeWidth="2" />
          {roads.map((d, i) => (
            <path key={i} d={d} strokeWidth={i === 0 ? 4 : 2.5} />
          ))}
        </g>
        <circle cx={CX} cy={CY} r="7" fill="var(--accent)" fillOpacity="0.25" />
        <circle cx={CX} cy={CY} r="3.5" fill="var(--accent)" />
      </svg>
    </div>
  )
}
