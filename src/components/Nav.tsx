import React from 'react'

export default function Nav({ tab, setTab }: any) {
  const tabs = [
    { id: 'ledger', label: '📓 Journal' },
    { id: 'careers', label: '💼 Careers' },
    { id: 'academy', label: '🏛️ Academy' },
    { id: 'transit', label: '🚗 Transit' },
    { id: 'relocate', label: '✈️ Relocate' },
    { id: 'resume', label: '📄 Resume' }
  ]
  return (
    <nav className="col-span-2">
      <div className="space-y-2 sticky top-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`w-full text-left px-4 py-3 glass ${tab === t.id ? 'tab-active' : 'text-slate-500'}`}>{t.label}</button>
        ))}
      </div>
    </nav>
  )
}
