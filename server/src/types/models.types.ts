export type City = { name: string; p: number; r: number; icon: string; lat?: number; lon?: number; country?: string }
export type JobExperienceRequirement = {
	roles: string[]
	minMonths: number
}
export type Job = {
	title: string
	base: number
	req?: string | null
	certReq?: string | null
	tReq: number
	odds?: number
	cat?: string
	subcat?: string
	expReq?: JobExperienceRequirement | null
	capacity?: number
}
export type LifeEvent = { id: string; title: string; amt: number; type: 'in' | 'out'; icon: string; desc: string; trigger: string }
export type TransitOption = { n: string; c: number; l: number; subText?: string }
export type AcademyCourse = {
	n: string
	m: number
	c: number
	type?: 'degree' | 'cert'
	prereq?: string | null
	icon?: string
	category?: string
	subcategory?: string
}
export type Application = { id: string; job: Job; appliedMonth: number; appliedYear: number; decisionMonth: number; decisionYear: number; score: number; status: string; chosen?: boolean }
