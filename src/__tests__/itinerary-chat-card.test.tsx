import { render, screen } from '@testing-library/react'
import { ItineraryChatCard } from '@/components/chat/ItineraryChatCard'

const testData = {
  title: 'Tokyo Adventure',
  destination: 'Tokyo, Japan',
  start_date: '2024-04-01',
  end_date: '2024-04-07',
  dayCount: 7,
  activityCount: 21,
}

it('renders trip title and destination', () => {
  render(<ItineraryChatCard data={testData} />)
  expect(screen.getByText('Tokyo Adventure')).toBeInTheDocument()
  expect(screen.getByText('Tokyo, Japan')).toBeInTheDocument()
})

it('renders date range', () => {
  render(<ItineraryChatCard data={testData} />)
  expect(screen.getByText(/2024-04-01.*2024-04-07/)).toBeInTheDocument()
})

it('renders day count and activity count', () => {
  render(<ItineraryChatCard data={testData} />)
  expect(screen.getByText(/7 days.*21 activities/)).toBeInTheDocument()
})
