import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import { domainBadgeStyle, resolveDomainKey } from '../constants/domainColors.constants'

type CourseNode = { n: string; m: number; c: number; type?: string; prereq?: string | null; icon?: string; subcategory?: string; children: CourseNode[] }

function toCurrency(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function filterCareerLinkedCourses(courses: any[], jobs: any[]) {
  const normalizedCourses = Array.isArray(courses) ? courses : []
  const normalizedJobs = Array.isArray(jobs) ? jobs : []
  const courseByName = new Map(normalizedCourses.map((course: any) => [String(course?.n || '').trim(), course]))
  const relevantCourseNames = new Set<string>()

  for (const job of normalizedJobs) {
    for (const requirement of [job?.req, job?.certReq]) {
      const name = String(requirement || '').trim()
      if (name && courseByName.has(name)) relevantCourseNames.add(name)
    }
  }

  const stack = Array.from(relevantCourseNames)
  while (stack.length > 0) {
    const currentName = stack.pop()!
    const course = courseByName.get(currentName)
    const prereq = String(course?.prereq || '').trim()
    if (!prereq || relevantCourseNames.has(prereq) || !courseByName.has(prereq)) continue
    relevantCourseNames.add(prereq)
    stack.push(prereq)
  }

  return normalizedCourses.filter((course: any) => relevantCourseNames.has(String(course?.n || '').trim()))
}

export default function Academy() {
  const { state, dispatch, academyCourses, jobBoard } = useGame()
  const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '')
  const [serverAcademyCourses, setServerAcademyCourses] = useState<any[] | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadAcademyCourses = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/game/academy-courses`)
        if (!response.ok) return
        const data = await response.json()
        if (cancelled || !Array.isArray(data)) return
        setServerAcademyCourses(data)
      } catch {
        // Fall back to context academy courses when server catalog is unavailable.
      }
    }
    void loadAcademyCourses()
    return () => {
      cancelled = true
    }
  }, [API_BASE_URL])

  const uniqueAcademyCourses = useMemo(() => {
    const source = Array.isArray(serverAcademyCourses) ? serverAcademyCourses : academyCourses
    const filteredSource = filterCareerLinkedCourses(source, jobBoard as any[])
    const seen = new Set<string>()
    return filteredSource.filter((course: any) => {
      const name = String(course?.n || '').trim()
      if (!name || seen.has(name)) return false
      seen.add(name)
      return true
    })
  }, [academyCourses, jobBoard, serverAcademyCourses])

  const jobsByCourse = (courseName: string) => {
    return (jobBoard as any[]).filter((j: any) => j.certReq === courseName || j.req === courseName).slice(0, 3)
  }
  const [academyView, setAcademyView] = useState<'courses' | 'tree'>('courses')
  const [treeSubcat, setTreeSubcat] = useState<string>('all')

  const groupedCourses = uniqueAcademyCourses.reduce((acc: Record<string, any[]>, course: any) => {
    const key = `${course.category || 'Programs'} / ${course.subcategory || 'General'}`
    acc[key] = acc[key] || []
    acc[key].push(course)
    return acc
  }, {})

  const canEnroll = (course: any) => {
    // Can't enroll if already graduated
    if (state.credentials.includes(course.n)) return false
    // If already in progress, can't enroll another
    if (state.activeEdu === course.n) return true // show as "enrolled" state
    // Check prerequisites
    if (course.prereq && !state.credentials.includes(course.prereq)) {
      return false
    }
    return true
  }

  const getStatusMessage = (course: any) => {
    if (state.credentials.includes(course.n)) {
      return 'GRADUATED'
    }
    if (course.prereq && !state.credentials.includes(course.prereq)) {
      return `Requires: ${course.prereq}`
    }
    return null
  }

  return (
    <div>
      <div className="mb-6 flex gap-3 border-b border-slate-300">
        <button onClick={() => setAcademyView('courses')} className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors ${academyView === 'courses' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>📚 All Courses</button>
        <button onClick={() => setAcademyView('tree')} className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors ${academyView === 'tree' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>🌳 Skill / Degree Progression</button>
      </div>

      {academyView === 'courses' && (
      <div className="space-y-5">
      {Object.entries(groupedCourses as Record<string, any[]>).map(([groupName, courses]) => (
      <div key={groupName}>
        {(() => {
          const category = groupName.split(' / ')[0] || 'Programs'
          const subcategory = groupName.split(' / ')[1] || 'General'
          const domain = resolveDomainKey(`${category} ${subcategory}`)
          return (
        <div className="subcat-banner mb-2">
          <span className="category-pill" style={domainBadgeStyle(domain)}>{category}</span>
          <span className="subcat-pill" style={domainBadgeStyle(domain)}>{subcategory}</span>
        </div>
          )
        })()}
        <div className="grid grid-cols-2 gap-4">
        {courses.map((e: any) => {
        const domain = resolveDomainKey(`${e.category || ''} ${e.subcategory || ''}`)
        const has = state.credentials.includes(e.n)
        const inProgress = state.activeEdu === e.n
        const progress = Math.min(100, (state.eduProgress[e.n] || 0) / e.m * 100)
        const locked = !canEnroll(e)
        const statusMsg = getStatusMessage(e)

        return (
          <div key={e.n} className={`glass p-6 ${locked ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{e.icon}</span>
              <h4 className="font-bold">{e.n}</h4>
            </div>
            <div className="subcat-banner mb-2">
              <span className="subcat-pill" style={domainBadgeStyle(domain)}>{e.subcategory || 'General'}</span>
            </div>
            <p className="text-xs text-slate-500 mb-2">${e.c}/mo × {e.m} months</p>
            {statusMsg && <p className="text-[10px] text-amber-600 font-bold mb-2">{statusMsg}</p>}
            <div className="w-full bg-slate-100 h-2 rounded-full mb-4 overflow-hidden">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            {(() => {
              const relatedJobs = jobsByCourse(e.n)
              return relatedJobs.length > 0 ? (
                <div className="mb-3">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Unlocks Jobs</p>
                  <div className="space-y-1">
                    {relatedJobs.map((j: any) => (
                      <div key={j.title} className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold text-slate-700 truncate">{j.title}</span>
                        <span className="text-[10px] text-emerald-700 font-bold whitespace-nowrap">{toCurrency(j.base)}/mo</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            })()}
            {has ? (
              <p className="text-emerald-600 font-bold text-xs">✓ GRADUATED</p>
            ) : inProgress ? (
              <button disabled className="w-full py-2 bg-amber-500 text-white rounded-lg text-xs font-bold uppercase">In Progress</button>
            ) : (
              <button
                disabled={locked}
                onClick={() => dispatch({ type: 'SET_STATE', payload: { activeEdu: e.n } })}
                className={`w-full py-2 rounded-lg text-xs font-bold uppercase ${locked ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white'}`}
              >
                Enroll
              </button>
            )}
          </div>
        )
          })}
          </div>
        </div>
        ))}
      </div>
      )}

      {academyView === 'tree' && (() => {
        const nodeMap = new Map<string, CourseNode>();
        (uniqueAcademyCourses as any[]).forEach((c: any) => {
          if (!nodeMap.has(c.n)) nodeMap.set(c.n, { ...c, children: [] })
        });
        const roots: CourseNode[] = [];
        (uniqueAcademyCourses as any[]).forEach((c: any) => {
          const node = nodeMap.get(c.n)!
          if (c.prereq && nodeMap.has(c.prereq)) {
            const parent = nodeMap.get(c.prereq)!
            if (!parent.children.find(ch => ch.n === node.n)) parent.children.push(node)
          } else if (!roots.find(r => r.n === node.n)) {
            roots.push(node)
          }
        })
        const subcats = ['all', ...Array.from(new Set<string>((uniqueAcademyCourses as any[]).map((c: any) => c.subcategory || 'General'))).sort()]
        function hasRelevant(node: CourseNode, sub: string): boolean {
          if (sub === 'all') return true
          if ((node.subcategory || 'General') === sub) return true
          return node.children.some(ch => hasRelevant(ch, sub))
        }
        function renderNode(node: CourseNode) {
          const owned = state.credentials.includes(node.n)
          const inProgress = state.activeEdu === node.n
          const progress = Math.min(100, (state.eduProgress[node.n] || 0) / node.m * 100)
          const highlighted = treeSubcat === 'all' || (node.subcategory || 'General') === treeSubcat
          const kids = node.children.filter(ch => hasRelevant(ch, treeSubcat))
          return (
            <div key={node.n}>
              <div className={`inline-flex items-start gap-2 px-3 py-2 rounded-xl border-2 mb-1 ${
                owned ? 'bg-emerald-50 border-emerald-400' :
                inProgress ? 'bg-amber-50 border-amber-400' :
                highlighted ? 'bg-white border-slate-300 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-40'
              }`}>
                <span className="text-base mt-0.5">{node.icon || '📄'}</span>
                <div>
                  <div className="font-bold text-sm text-slate-900 leading-tight">{node.n}</div>
                  <div className="text-[10px] text-slate-500">{node.m}mo · ${node.c}/mo · {node.type === 'degree' ? 'Degree' : 'Cert'}</div>
                  {owned && <div className="text-[10px] font-bold text-emerald-600">✓ Graduated</div>}
                  {inProgress && <div className="text-[10px] font-bold text-amber-600">⏳ {Math.round(progress)}% done</div>}
                  {(() => {
                    const relatedJobs = jobsByCourse(node.n)
                    return relatedJobs.length > 0 ? (
                      <div className="mt-1 space-y-0.5">
                        {relatedJobs.map((j: any) => (
                          <div key={j.title} className="text-[10px] text-slate-600">💼 {j.title} <span className="text-emerald-700 font-bold">{toCurrency(j.base)}/mo</span></div>
                        ))}
                      </div>
                    ) : null
                  })()}
                </div>
              </div>
              {kids.length > 0 && (
                <div className="ml-5 pl-4 border-l-2 border-dashed border-slate-300 space-y-2 pb-1">
                  {kids.map(ch => renderNode(ch))}
                </div>
              )}
            </div>
          )
        }
        return (
          <div className="space-y-4">
            <div className="glass p-4">
              <h3 className="font-bold text-lg mb-1">🌳 Skill & Degree Progression</h3>
              <p className="text-sm text-slate-600 mb-4">Follow the prerequisite chains to plan your learning path. <span className="font-bold text-emerald-600">Green</span> = earned · <span className="font-bold text-amber-600">Amber</span> = in progress · Dim = not yet unlocked.</p>
              <div className="flex flex-wrap gap-2">
                {subcats.map(sub => (
                  <button key={sub} onClick={() => setTreeSubcat(sub)} className={`req-tag ${treeSubcat === sub ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {sub === 'all' ? 'All Categories' : sub}
                  </button>
                ))}
              </div>
            </div>
            <div className="glass p-6">
              <div className="space-y-4">
                {roots.filter(r => hasRelevant(r, treeSubcat)).map(r => renderNode(r))}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
