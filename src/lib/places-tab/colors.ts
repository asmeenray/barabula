// Places tab trip colours (UI-SPEC "Color", D-28). Six hues with no blue in
// them (project rule), each drawn with a 2 px ring on the map so every pin
// passes 3:1 whatever the hue. Colour is never the only cue: the trip filter
// and the grouped list name the trip.

export const TRIP_COLORS = ['#D55E00', '#CC79A7', '#009E73', '#8C510A', '#7B3294', '#3A444F'] as const

/** The colour of the i-th trip (0-based, in home order); cycles after six. */
export function tripColor(i: number): string {
  const n = TRIP_COLORS.length
  return TRIP_COLORS[((Math.floor(i) % n) + n) % n]
}
