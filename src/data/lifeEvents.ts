import { LifeEvent } from '../types/models'

const lifeEvents: LifeEvent[] = [
  { id: 'all_1', title: 'Tax Refund', amt: 350, type: 'in', icon: '💸', desc: 'Government check arrived.', trigger: 'none' },
  { id: 'all_2', title: 'Phone Fix', amt: 120, type: 'out', icon: '📱', desc: 'Screen cracked.', trigger: 'none' },
  { id: 'car_1', title: 'Flat Tire', amt: 180, type: 'out', icon: '🔧', desc: 'Nail in the road.', trigger: 'car' },
  { id: 'acad_1', title: 'Book Costs', amt: 200, type: 'out', icon: '📚', desc: 'Course supplies.', trigger: 'academy' },
  { id: 'stress_1', title: 'Burnout Recovery', amt: 300, type: 'out', icon: '🏥', desc: 'Rest needed.', trigger: 'burnout' },
  { id: 'work_1', title: 'Workplace Sprain', amt: 250, type: 'out', icon: '🩹', desc: 'Injury on the clock.', trigger: 'hazard' }
]

export default lifeEvents
