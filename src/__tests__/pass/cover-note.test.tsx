import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { CoverNote } from '@/components/pass/CoverNote'
import { BlankPass } from '@/components/pass/BlankPass'
import { CITY_PHOTOS } from '@/lib/photos/manifest'

// "On the cover" note (quick 261007-wms, A-4): the cover's caption plus a quiet
// "Plan a trip to {City}" shortcut, gone on the first click or typing in its panel.

function Panel(props: Partial<React.ComponentProps<typeof CoverNote>> & { onDismiss?: () => void }) {
  return (
    <div data-testid="panel">
      <input aria-label="Where to?" />
      <CoverNote
        city="Seoul"
        caption="Geunjeongjeon Hall, Gyeongbokgung Palace"
        reducedMotion={false}
        onPlan={() => {}}
        onDismiss={() => {}}
        {...props}
      />
    </div>
  )
}

const note = () => document.querySelector<HTMLElement>('[data-cover-note]')

describe('CoverNote', () => {
  it('shows the label, the caption with the city and the shortcut', () => {
    render(<Panel />)
    expect(screen.getByText('On the cover')).toBeInTheDocument()
    expect(screen.getByText('Geunjeongjeon Hall, Gyeongbokgung Palace · Seoul')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Plan a trip to Seoul' })).toBeInTheDocument()
    // Laptop only: hidden below lg.
    expect(note()).toHaveClass('hidden', 'lg:block')
  })

  it('without a caption shows only the shortcut', () => {
    render(<Panel caption={null} />)
    expect(screen.queryByText('On the cover')).toBeNull()
    expect(screen.queryByText(/ · Seoul/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Plan a trip to Seoul' })).toBeInTheDocument()
  })

  it.each([
    ['pointerdown on the input', (input: HTMLElement) => fireEvent.pointerDown(input)],
    ['a letter key', (input: HTMLElement) => fireEvent.keyDown(input, { key: 'l' })],
    ['an input event', (input: HTMLElement) => fireEvent.input(input, { target: { value: 'L' } })],
  ])('%s fades it out, then dismisses once after the transition', (_name, act1) => {
    const onDismiss = vi.fn()
    render(<Panel onDismiss={onDismiss} />)
    act1(screen.getByRole('textbox', { name: 'Where to?' }))
    expect(note()).toHaveClass('opacity-0')
    expect(onDismiss).not.toHaveBeenCalled()
    fireEvent.transitionEnd(note()!)
    fireEvent.transitionEnd(note()!)
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Where to?' }), { key: 'x' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('under reduced motion it dismisses at once', () => {
    const onDismiss = vi.fn()
    render(<Panel onDismiss={onDismiss} reducedMotion />)
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Where to?' }), { key: 'a' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('Tab, bare modifiers and focus alone do not hide it', () => {
    const onDismiss = vi.fn()
    render(<Panel onDismiss={onDismiss} reducedMotion />)
    const input = screen.getByRole('textbox', { name: 'Where to?' })
    fireEvent.keyDown(input, { key: 'Tab' })
    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true })
    for (const key of ['Shift', 'Control', 'Alt', 'Meta']) fireEvent.keyDown(input, { key })
    fireEvent.focus(input)
    act(() => input.focus())
    expect(onDismiss).not.toHaveBeenCalled()
    expect(note()).not.toHaveClass('opacity-0')
  })

  it('a press inside the note does not dismiss it; the shortcut calls onPlan', () => {
    const onDismiss = vi.fn()
    const onPlan = vi.fn()
    render(<Panel onDismiss={onDismiss} onPlan={onPlan} reducedMotion />)
    const button = screen.getByRole('button', { name: 'Plan a trip to Seoul' })
    fireEvent.pointerDown(button)
    fireEvent.keyDown(button, { key: 'Enter' })
    expect(onDismiss).not.toHaveBeenCalled()
    fireEvent.click(button)
    expect(onPlan).toHaveBeenCalledTimes(1)
  })
})

describe('BlankPass with the cover note', () => {
  const seoul = CITY_PHOTOS.find((p) => p.slug === 'seoul')!

  it('Plan a trip to Seoul fills Where to? with the city and removes the note', async () => {
    render(
      <BlankPass
        coverPhoto={seoul}
        photos={CITY_PHOTOS}
        signedIn={false}
        layout="horizontal"
        coverCaption="Geunjeongjeon Hall, Gyeongbokgung Palace"
      />
    )
    expect(screen.getByText('Geunjeongjeon Hall, Gyeongbokgung Palace · Seoul')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Plan a trip to Seoul' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Seoul' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit destination' })).toBeInTheDocument()
    expect(note()).toBeNull()
  })

  it('the vertical pass has no note', () => {
    render(<BlankPass coverPhoto={seoul} photos={CITY_PHOTOS} signedIn={false} layout="vertical" coverCaption="x y z" />)
    expect(note()).toBeNull()
    expect(screen.queryByRole('button', { name: /Plan a trip to/ })).toBeNull()
  })
})
