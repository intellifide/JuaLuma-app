// Updated 2025-12-08 20:31 CST by ChatGPT
import { Link } from 'react-router-dom'

export const Home = () => (
  <div className="bg-gradient-to-br from-royal-purple/10 via-white to-aqua/10 min-h-screen">
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="bg-white/80 border border-slate-200 rounded-2xl shadow-xl p-10 backdrop-blur">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-wide text-royal-purple">Customer Support Portal</p>
            <h1 className="text-4xl font-bold text-deep-indigo">
              Build AI-powered support with secure financial workflows.
            </h1>
            <p className="text-slate-700">
              Finity helps support teams answer faster, automate routine requests, and keep account changes safe. Use
              the dashboard to manage tickets, verify customers, and launch guided flows with your AI assistant.
            </p>
            <div className="flex gap-3">
              <Link
                to="/signup"
                className="px-5 py-3 rounded-xl bg-royal-purple text-white font-semibold hover:bg-deep-indigo transition-colors"
              >
                Get started
              </Link>
              <Link
                to="/login"
                className="px-5 py-3 rounded-xl border border-royal-purple text-royal-purple font-semibold hover:bg-royal-purple hover:text-white transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
          <div className="bg-gradient-to-br from-royal-purple/10 to-aqua/20 rounded-2xl p-6 border border-slate-200 w-full md:w-80">
            <h3 className="text-lg font-semibold text-deep-indigo mb-2">Local Dev Notes</h3>
            <ul className="text-sm text-slate-700 space-y-2">
              <li>Frontend Vite dev server runs on 5175.</li>
              <li>FastAPI backend runs on 8001.</li>
              <li>Firebase Auth emulator expected at 9099.</li>
              <li>Use Testmail for email flows in development.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
)
