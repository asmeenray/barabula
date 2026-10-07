import { describe, expect, it } from 'vitest'
import { clusterImageId, clusterLabel, clusterSize, parseClusterImageId } from '@/components/map/clusterImages'

// Places tab cluster discs (16-18): ids carry count × theme so the
// missing-image resolver can draw any cluster on demand.

describe('cluster images', () => {
  it('builds and reads cluster ids, capped at 1000', () => {
    expect(clusterImageId({ count: 7, theme: 'light' })).toBe('cluster-7-light')
    expect(clusterImageId({ count: 4321, theme: 'dark' })).toBe('cluster-1000-dark')
    expect(parseClusterImageId('cluster-42-dark')).toEqual({ count: 42, theme: 'dark' })
    for (const id of ['cluster-1-light', 'cluster-1001-light', 'cluster-7-blue', 'pin-day-03-light', 'cluster-x-light', '']) {
      expect(parseClusterImageId(id)).toBeNull()
    }
  })

  it('round-trips both themes', () => {
    for (const theme of ['light', 'dark'] as const) {
      expect(parseClusterImageId(clusterImageId({ count: 50, theme }))).toEqual({ count: 50, theme })
    }
  })

  it('sizes discs 32 / 40 / 48 and labels 1000 as 999+', () => {
    expect([2, 9, 10, 49, 50, 900].map(clusterSize)).toEqual([32, 32, 40, 40, 48, 48])
    expect(clusterLabel(12)).toBe('12')
    expect(clusterLabel(1000)).toBe('999+')
  })
})
