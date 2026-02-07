export type LuxuryService = {
  id: string
  name: string
  monthlyBase: number
  minSalary: number
  icon: string
  description: string
}

export type LifestyleExpenses = {
  luxuryServices: LuxuryService[]
  entertainmentOptions: { name: string; monthlyCost: number; icon: string }[]
}

const lifestyleExpenses: LifestyleExpenses = {
  luxuryServices: [
    {
      id: 'chef',
      name: 'Personal Chef',
      monthlyBase: 4000,
      minSalary: 6000,
      icon: '👨‍🍳',
      description: 'Meals prepared fresh daily. Eliminates food costs.'
    },
    {
      id: 'housekeeper',
      name: 'Housekeeper',
      monthlyBase: 2000,
      minSalary: 4000,
      icon: '🧹',
      description: 'Professional cleaning and maintenance of your residence.'
    },
    {
      id: 'chauffer',
      name: 'Personal Chauffeur',
      monthlyBase: 3500,
      minSalary: 5500,
      icon: '🚗',
      description: 'Transportation service. Eliminates gas and car maintenance costs.'
    },
    {
      id: 'therapist',
      name: 'Personal Therapist',
      monthlyBase: 2500,
      minSalary: 4500,
      icon: '🧠',
      description: 'Mental health support and wellness counseling.'
    },
    {
      id: 'trainer',
      name: 'Personal Fitness Trainer',
      monthlyBase: 1500,
      minSalary: 3000,
      icon: '💪',
      description: 'In-home fitness coaching and nutrition planning.'
    },
    {
      id: 'concierge',
      name: 'Lifestyle Concierge',
      monthlyBase: 3000,
      minSalary: 6500,
      icon: '🎩',
      description: 'Premium service handling errands, reservations, and lifestyle management.'
    }
  ],
  entertainmentOptions: [
    { name: 'Streaming Service', monthlyCost: 15, icon: '📺' },
    { name: 'Movie Tickets (2x/mo)', monthlyCost: 30, icon: '🎬' },
    { name: 'Concert/Sports (1x/mo)', monthlyCost: 75, icon: '🎵' },
    { name: 'Gaming Subscription', monthlyCost: 20, icon: '🎮' },
    { name: 'Gym Membership', monthlyCost: 50, icon: '🏋️' }
  ]
}

export default lifestyleExpenses
