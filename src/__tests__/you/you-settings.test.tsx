import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PassengerCard } from '@/components/you/PassengerCard'
import { SettingsList } from '@/components/you/SettingsList'
import { PENDING_PASS_KEY } from '@/lib/pass/pending'
import { THEME_KEY } from '@/lib/theme/theme'
import { HAPTICS_KEY } from '@/lib/client/haptics'

// You tab (16-19, D-29, D-41, D-43).

const calls: string[] = []
const updateUser = vi.fn(async (attrs: unknown) => (void attrs, ({ data: {}, error: null as null | { message: string } })))
const signOut = vi.fn(async () => {
  calls.push(`signOut:${localStorage.getItem(PENDING_PASS_KEY) === null ? 'cleared' : 'kept'}`)
  return { error: null }
})
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { updateUser, signOut } }),
}))

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))

beforeEach(() => {
  calls.length = 0
  updateUser.mockClear()
  signOut.mockClear()
  push.mockClear()
  refresh.mockClear()
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('PassengerCard', () => {
  it('shows PASSENGER, the name, trips and — for no home city, with initials', () => {
    render(<PassengerCard name="Asmeen Ray" avatarUrl={null} trips={3} homeCity={null} />)
    expect(screen.getByText('Passenger')).toBeInTheDocument()
    const name = screen.getByRole('heading', { level: 1, name: 'Asmeen Ray' })
    expect(name).toHaveAttribute('title', 'Asmeen Ray')
    expect(screen.getByTestId('passenger-trips')).toHaveTextContent('3')
    expect(screen.getByTestId('passenger-home')).toHaveTextContent('—')
    expect(screen.getByText('AR')).toBeInTheDocument()
  })

  it('shows the home city', () => {
    render(<PassengerCard name="A" avatarUrl={null} trips={0} homeCity="Lisbon" />)
    expect(screen.getByTestId('passenger-home')).toHaveTextContent('Lisbon')
  })
})

describe('SettingsList', () => {
  it('renders every row and the version, and no export or delete account', () => {
    const { container } = render(<SettingsList homeCity={null} version="0.1.0" />)
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Appearance' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Add your home city')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Haptics' })).toBeChecked()
    expect(screen.getByText('Short vibrations on Android when places land or move.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Credits & attributions' })).toHaveAttribute('href', '/you/credits')
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.getByText('Barabula 0.1.0')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/export|delete account/i)
  })

  it('Appearance Dark applies the theme and stores it on the device', () => {
    render(<SettingsList homeCity={null} version="0.1.0" />)
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    fireEvent.click(screen.getByRole('button', { name: 'System' }))
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
  })

  it('Haptics off is stored on the device', () => {
    render(<SettingsList homeCity={null} version="0.1.0" />)
    fireEvent.click(screen.getByRole('switch', { name: 'Haptics' }))
    expect(localStorage.getItem(HAPTICS_KEY)).toBe('off')
    expect(screen.getByRole('switch', { name: 'Haptics' })).not.toBeChecked()
  })

  it('saves the home city to user_metadata through updateUser, trimmed', async () => {
    render(<SettingsList homeCity={null} version="0.1.0" />)
    fireEvent.change(screen.getByPlaceholderText('Add your home city'), { target: { value: '  Lisbon ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ data: { home_city: 'Lisbon' } }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('shows DELAYED when the home city does not save', async () => {
    updateUser.mockResolvedValueOnce({ data: {}, error: { message: 'offline' } })
    render(<SettingsList homeCity={null} version="0.1.0" />)
    fireEvent.change(screen.getByPlaceholderText('Add your home city'), { target: { value: 'Porto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText("Couldn't save.")).toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('Sign out clears the pending pass before signing out, then goes home', async () => {
    localStorage.setItem(PENDING_PASS_KEY, '{"v":1}')
    render(<SettingsList homeCity={null} version="0.1.0" />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
    expect(calls).toEqual(['signOut:cleared'])
    expect(refresh).toHaveBeenCalled()
  })
})
