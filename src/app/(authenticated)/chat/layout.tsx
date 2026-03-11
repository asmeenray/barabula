export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 bg-white">
      {children}
    </div>
  )
}
