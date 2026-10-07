import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { RowMenu } from '@/components/board/RowMenu'

// The row "⋯" menu (D-22): Move to day… lists every day plus Maybe with the
// current one disabled; choosing a day calls move(day).

function setup(props: Partial<React.ComponentProps<typeof RowMenu>> = {}) {
  const move = vi.fn()
  render(<RowMenu placeName="Time Out Market" day={1} dayCount={3} move={move} {...props} />)
  return { move }
}

async function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Time Out Market' }))
  return screen.findByRole('menu')
}

async function openSubmenu(label: string) {
  const menu = await openMenu()
  fireEvent.click(within(menu).getByRole('menuitem', { name: label }))
  await waitFor(() => expect(screen.getAllByRole('menu')).toHaveLength(2))
  return screen.getAllByRole('menu')[1]
}

describe('RowMenu', () => {
  it('names the trigger after the place', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Actions for Time Out Market' })).toBeTruthy()
  })

  it('lists the actions in order; Edit place is off without an edit handler', async () => {
    setup({ moveUp: vi.fn(), moveDown: vi.fn(), remove: vi.fn() })
    const menu = await openMenu()
    const names = within(menu)
      .getAllByRole('menuitem')
      .map((el) => el.textContent?.trim())
    expect(names).toEqual(['Move to day…', 'Move up', 'Move down', 'Move to Maybe', 'Edit place', 'Remove from trip'])
    expect(within(menu).getByRole('menuitem', { name: 'Edit place' }).getAttribute('aria-disabled')).toBe('true')
  })

  it('Edit place calls edit (16-11)', async () => {
    const edit = vi.fn()
    setup({ edit })
    const menu = await openMenu()
    const item = within(menu).getByRole('menuitem', { name: 'Edit place' })
    expect(item.getAttribute('aria-disabled')).not.toBe('true')
    fireEvent.click(item)
    expect(edit).toHaveBeenCalledTimes(1)
  })

  it('a locked (not yet saved) place has its menu off', () => {
    setup({ locked: true })
    expect(screen.getByRole('button', { name: 'Actions for Time Out Market' }).getAttribute('aria-disabled')).toBe('true')
  })

  it('Move to day… lists every day plus Maybe, current day disabled', async () => {
    setup()
    const sub = await openSubmenu('Move to day…')
    const items = within(sub).getAllByRole('menuitem')
    expect(items.map((el) => el.textContent?.trim())).toEqual(['Day 1', 'Day 2', 'Day 3', 'Maybe'])
    expect(items[0].getAttribute('aria-disabled')).toBe('true')
    expect(items[1].getAttribute('aria-disabled')).not.toBe('true')
  })

  it('choosing Day 2 calls move(2)', async () => {
    const { move } = setup()
    const sub = await openSubmenu('Move to day…')
    fireEvent.click(within(sub).getByRole('menuitem', { name: 'Day 2' }))
    expect(move).toHaveBeenCalledWith(2)
  })

  it('from Maybe shows Move to a day… (days only) and disables Maybe in Move to day…', async () => {
    const { move } = setup({ day: null })
    const menu = await openMenu()
    expect(within(menu).queryByRole('menuitem', { name: 'Move to Maybe' })).toBeNull()
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Move to a day…' }))
    await waitFor(() => expect(screen.getAllByRole('menu')).toHaveLength(2))
    const sub = screen.getAllByRole('menu')[1]
    expect(within(sub).getAllByRole('menuitem').map((el) => el.textContent?.trim())).toEqual(['Day 1', 'Day 2', 'Day 3'])
    fireEvent.click(within(sub).getByRole('menuitem', { name: 'Day 3' }))
    expect(move).toHaveBeenCalledWith(3)
  })

  it('Move to Maybe calls move(null)', async () => {
    const { move } = setup()
    const menu = await openMenu()
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Move to Maybe' }))
    expect(move).toHaveBeenCalledWith(null)
  })

  it('disables Move up / Move down / Remove when no handler is given', async () => {
    setup()
    const menu = await openMenu()
    for (const name of ['Move up', 'Move down', 'Remove from trip']) {
      expect(within(menu).getByRole('menuitem', { name }).getAttribute('aria-disabled')).toBe('true')
    }
  })

  it('the day submenu scrolls past 8 items (max height 320)', async () => {
    setup({ dayCount: 12 })
    const sub = await openSubmenu('Move to day…')
    expect(sub.className).toContain('max-h-[320px]')
    expect(sub.className).toContain('overflow-y-auto')
    expect(within(sub).getAllByRole('menuitem')).toHaveLength(13)
  })
})
