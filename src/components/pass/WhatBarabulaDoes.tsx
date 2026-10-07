// "What Barabula does" (UI-SPEC §2 item 7, D-08): SAVE · PLAN · GO, shown to
// everyone, signed in or not. Numbered because the order is the point. SAVE
// carries a SOON chip until capture ships. Words stay sentence case in the DOM
// and CSS sets the uppercase (like StatusChip). Ask Barabula is not rendered
// (phase 20). Server-safe, no client JS.

type Step = { key: 'SAVE' | 'PLAN' | 'GO'; verb: string; body: string; soon?: boolean }

const STEPS: Step[] = [
  {
    key: 'SAVE',
    verb: 'Save',
    body: 'Paste a link or share a reel and confirm the places it finds.',
    soon: true,
  },
  { key: 'PLAN', verb: 'Plan', body: 'Make a trip, add your places and arrange them by day.' },
  { key: 'GO', verb: 'Go', body: 'Follow your plan on the street and tick places off as you go.' },
]

const SOON = 'Soon' // the SOON chip

export function WhatBarabulaDoes() {
  return (
    <section aria-labelledby="what-barabula-does">
      <h2
        id="what-barabula-does"
        className="font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-muted uppercase"
      >
        What Barabula does
      </h2>
      <ol className="mt-3 border-t border-line md:grid md:grid-cols-3 md:gap-8 md:border-t-0">
        {STEPS.map((step, i) => (
          <li
            key={step.key}
            data-step={step.key}
            className="grid grid-cols-[32px_1fr] gap-x-2 border-b border-line py-4 md:border-t md:border-b-0"
          >
            <span aria-hidden="true" className="pt-0.5 font-mono text-xs leading-[1.33] text-muted tabular-nums">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-2">
                <span className="font-mono text-base leading-tight font-semibold tracking-[0.04em] text-ink uppercase">
                  {step.verb}
                </span>
                {step.soon && (
                  <span className="inline-flex h-6 items-center rounded-[4px] border border-field px-1.5 font-label text-xs leading-none font-semibold tracking-[0.16em] text-muted uppercase">
                    {SOON}
                  </span>
                )}
              </p>
              <p className="mt-1 max-w-[60ch] text-base text-ink">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
