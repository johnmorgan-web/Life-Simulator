const housingModels = [
  { 
    id: 'studio', 
    name: 'Studio Apartment', 
    price: 25000, 
    size: 'small', 
    rooms: 1, 
    baseUpgrade: 5000,
    visual: `
    ┌─────┐
    │ ⌛  │
    │ ══  │
    └─────┘` 
  },
  { 
    id: 'family', 
    name: 'Family Home', 
    price: 85000, 
    size: 'medium', 
    rooms: 3, 
    baseUpgrade: 15000,
    visual: `
    ┌──────────┐
    │ ⌛  ⌛    │
    │ ══  ══   │
    │ ⌛  ⌛    │
    └──────────┘` 
  },
  { 
    id: 'mansion', 
    name: 'Luxury Mansion', 
    price: 350000, 
    size: 'large', 
    rooms: 8, 
    baseUpgrade: 50000,
    visual: `
    ┌──────────────────┐
    │  ⌛   ⌛   ⌛   ⌛  │
    │  ══   ══   ══   ══  │
    │  ⌛   ⌛   ⌛   ⌛  │
    │  ══   ══   ══   ══  │
    └──────────────────┘` 
  }
]

export default housingModels
