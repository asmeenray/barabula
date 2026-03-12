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

  it('container uses flex layout', () => {
    const { getByTestId } = render(
      <SplitLayout left={<div />} right={<div />} />
    )
    const layout = getByTestId('split-layout')
    expect(layout.className).toContain('flex')
  })

  it('container uses h-full', () => {
    const { getByTestId } = render(
      <SplitLayout left={<div />} right={<div />} />
    )
    expect(getByTestId('split-layout').className).toContain('h-full')
  })

  it('hides right section on mobile (hidden md:flex)', () => {
    // This test will FAIL until Plan 02 wraps drag handle + right panel
    // in a div with className="hidden md:flex h-full"
    const { container } = render(
      <SplitLayout left={<div>Left</div>} right={<div data-testid="right-content">Right</div>} />
    )
    // After Plan 02, there will be a wrapper div around drag handle + right panel
    // with className containing "hidden" and "md:flex"
    const rightWrapper = container.querySelector('.hidden.md\\:flex')
    expect(rightWrapper).not.toBeNull()
    expect(rightWrapper?.className).toContain('hidden')
    expect(rightWrapper?.className).toContain('md:flex')
  })

  it('left panel fills width when right is hidden (flex-1)', () => {
    // This test will FAIL until Plan 02 adds flex-1 to the left panel div
    const { getByTestId } = render(
      <SplitLayout left={<div data-testid="left-content">Left</div>} right={<div />} />
    )
    // After Plan 02, left panel's className will contain "flex-1"
    const layout = getByTestId('split-layout')
    const leftPanel = layout.firstElementChild
    expect(leftPanel?.className).toContain('flex-1')
  })
})
