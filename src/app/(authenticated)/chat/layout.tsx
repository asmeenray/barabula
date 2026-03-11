export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 top-0 z-10 bg-white">
      {children}
    </div>
  )
}
