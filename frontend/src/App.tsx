// Updated 2025-12-07 21:15 CST by ChatGPT
import { useEffect, useState } from 'react'

type Health = {
  status: string
  database: string
  firestore: string
  pubsub: string
}

function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: Health) => setHealth(data))
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-royal-purple/10 via-white to-aqua/10">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="backdrop-blur-glass bg-white/70 border border-white/60 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-deep-indigo mb-2">Finity Frontend</h1>
          <p className="text-slate-700 mb-6">
            Local React + Vite dev server (port 5175) proxied to FastAPI at 8001.
          </p>

          <h2 className="text-xl font-semibold text-royal-purple mb-3">Backend health</h2>
          <div className="bg-white/80 border border-slate-200 rounded-lg p-4">
            {health ? (
              <ul className="space-y-1 text-slate-800">
                <li>
                  <strong>Status:</strong> {health.status}
                </li>
                <li>
                  <strong>Database:</strong> {health.database}
                </li>
                <li>
                  <strong>Firestore:</strong> {health.firestore}
                </li>
                <li>
                  <strong>Pub/Sub:</strong> {health.pubsub}
                </li>
              </ul>
            ) : error ? (
              <p className="text-red-600">Failed to fetch health: {error}</p>
            ) : (
              <p className="text-slate-600">Checking health...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
