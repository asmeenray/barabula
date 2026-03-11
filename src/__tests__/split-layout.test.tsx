import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SplitLayout } from '@/components/chat/SplitLayout'

describe('SplitLayout', () => {
  it('renders both left and right children', () => {
    render(
      <SplitLayout
        left={<div>Left panel</div>}
        right={<div>Right panel</div>}
      />
    )
    expect(screen.getByText('Left panel')).toBeTruthy()
    expect(screen.getByText('Right panel')).toBeTruthy()
  })

  it('has grid-cols-2 for the 50/50 split', () => {
    const { getByTestId } = render(
      <SplitLayout left={<div />} right={<div />} />
    )
    const layout = getByTestId('split-layout')
    expect(layout.className).toContain('grid-cols-2')
  })

  it('has h-screen for full viewport height', () => {
    const { getByTestId } = render(
      <SplitLayout left={<div />} right={<div />} />
    )
    expect(getByTestId('split-layout').className).toContain('h-screen')
  })
})
