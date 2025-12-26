// Updated 2025-12-08 21:49 CST by ChatGPT
import { useMemo, useState } from 'react'
import { TransactionTable } from '../components/TransactionTable'
import { useTransactions } from '../hooks/useTransactions'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ui/Toast'

export const Transactions = () => {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)

  const { profile } = useAuth()
  const toast = useToast()
  const [scope, setScope] = useState<'personal' | 'household'>('personal')

  const { transactions, total, pageSize, loading, refetch, updateOne, remove } = useTransactions({
    filters: { category: category || undefined, page, pageSize: 10, scope },
    search: search || undefined,
  })

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    refetch()
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-deep-indigo">Transactions</h1>
          <p className="text-slate-600">Filter, search, and bulk edit your transactions.</p>
        </div>
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-royal-purple text-white hover:bg-deep-indigo"
          onClick={() => window.alert('Export to CSV coming soon.')}
        >
          Export CSV
        </button>
      </header>

      <form
        onSubmit={handleSearch}
        className="bg-white/80 border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row gap-3"
      >
        <input
          type="text"
          placeholder="Search merchant or description"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-royal-purple"
        />
        
        {/* Scope Toggle */}
        <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setScope('personal')}
            className={`px-3 py-1 text-sm rounded-md transition-all ${
              scope === 'personal'
                ? 'bg-royal-purple text-white shadow font-medium'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Personal
          </button>
          <button
            type="button"
            onClick={() => {
              const isUltimate = profile?.plan?.toLowerCase().includes('ultimate');
              if (!isUltimate) {
                toast.show("Upgrade to Ultimate to view Family transactions.", "error");
                return;
              }
              setScope('household');
            }}
            className={`px-3 py-1 text-sm rounded-md transition-all ${
              scope === 'household'
                ? 'bg-royal-purple text-white shadow font-medium'
                : 'text-slate-500 hover:text-slate-700'
            } ${!profile?.plan?.toLowerCase().includes('ultimate') ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Family
          </button>
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-48 rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-royal-purple"
        >
          <option value="">All categories</option>
          <option value="Income">Income</option>
          <option value="Bills">Bills</option>
          <option value="Food">Food</option>
          <option value="Transport">Transport</option>
          <option value="Shopping">Shopping</option>
          <option value="Health">Health</option>
          <option value="Travel">Travel</option>
          <option value="Other">Other</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-royal-purple text-white hover:bg-deep-indigo"
        >
          Apply
        </button>
      </form>

      <section className="bg-white/80 border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading transactions...</p>
        ) : (
          <TransactionTable
            transactions={transactions}
            onEdit={(id) => updateOne(id, {})}
            onDelete={remove}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(next) => {
              if (next < 1 || next > totalPages) return
              setPage(next)
              refetch()
            }}
          />
        )}
      </section>
    </div>
  )
}
