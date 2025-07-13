import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <div className="iina-card text-center max-w-md">
        <div className="text-6xl mb-4">🎬</div>
        <h1 className="text-2xl font-semibold mb-2">Page Not Found</h1>
        <p className="text-iina-text-muted mb-6">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link 
          href="/" 
          className="iina-button-primary px-6 py-3 inline-flex items-center"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}