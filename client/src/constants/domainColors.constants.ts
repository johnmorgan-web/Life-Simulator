export type DomainKey =
  | 'technology'
  | 'healthcare'
  | 'finance'
  | 'engineering'
  | 'legal'
  | 'education'
  | 'logistics'
  | 'service'
  | 'creative'
  | 'military'
  | 'general'

type DomainTone = { bg: string; border: string; text: string }

const DOMAIN_TONES: Record<DomainKey, DomainTone> = {
  technology: { bg: '#dbeafe', border: '#93c5fd', text: '#1d4ed8' },
  healthcare: { bg: '#dcfce7', border: '#86efac', text: '#166534' },
  finance: { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
  engineering: { bg: '#ffedd5', border: '#fdba74', text: '#9a3412' },
  legal: { bg: '#e2e8f0', border: '#94a3b8', text: '#334155' },
  education: { bg: '#cffafe', border: '#67e8f9', text: '#155e75' },
  logistics: { bg: '#ecfccb', border: '#bef264', text: '#3f6212' },
  service: { bg: '#ffe4e6', border: '#fda4af', text: '#9f1239' },
  creative: { bg: '#fce7f3', border: '#f9a8d4', text: '#9d174d' },
  military: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
  general: { bg: '#f1f5f9', border: '#cbd5e1', text: '#0f172a' }
}

export function resolveDomainKey(label: string): DomainKey {
  const value = (label || '').toLowerCase()
  if (value.includes('tech') || value.includes('cyber') || value.includes('intelligence')) return 'technology'
  if (value.includes('health') || value.includes('medical') || value.includes('nurs')) return 'healthcare'
  if (value.includes('finance') || value.includes('business')) return 'finance'
  if (value.includes('engineer') || value.includes('trade') || value.includes('construction')) return 'engineering'
  if (value.includes('legal') || value.includes('security') || value.includes('law')) return 'legal'
  if (value.includes('education') || value.includes('social')) return 'education'
  if (value.includes('logistics') || value.includes('transport') || value.includes('aviation')) return 'logistics'
  if (value.includes('service') || value.includes('hospitality')) return 'service'
  if (value.includes('creative') || value.includes('commercial')) return 'creative'
  if (value.includes('military') || value.includes('combat')) return 'military'
  return 'general'
}

export function domainBadgeStyle(domain: DomainKey) {
  const tone = DOMAIN_TONES[domain]
  return {
    backgroundColor: tone.bg,
    borderColor: tone.border,
    color: tone.text
  }
}
