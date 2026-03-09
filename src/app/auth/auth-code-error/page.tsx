export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 w-full max-w-md text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-3">Sign in failed</h1>
        <p className="text-gray-500 text-sm mb-6">
          There was a problem completing your sign in. Please try again.
        </p>
        <a href="/login" className="text-blue-600 hover:underline text-sm">
          Back to login
        </a>
      </div>
    </div>
  )
}
