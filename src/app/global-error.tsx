'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-24 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Critical Global Error!</h2>
          <p className="text-gray-700 mb-8 max-w-xl font-mono text-sm bg-gray-100 p-4 rounded-lg overflow-auto text-left">
            {error.message || 'Unknown error occurred'}
            <br/><br/>
            {error.stack}
          </p>
          <button
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            onClick={() => reset()}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
