const vehicleTypes = [
  { id: 'sedan', name: 'Sedan', costPerKm: 0.35, baseValue: 25000, icon: '🚗' },
  { id: 'suv', name: 'SUV', costPerKm: 0.45, baseValue: 40000, icon: '🚙' },
  { id: 'truck', name: 'Truck', costPerKm: 0.5, baseValue: 35000, icon: '🚚' },
  {
    id: 'luxury',
    name: 'Luxury Car',
    costPerKm: 0.3,
    baseValue: 80000,
    icon: '🏎️',
  },
  {
    id: 'electric',
    name: 'Electric Car',
    costPerKm: 0.2,
    baseValue: 45000,
    icon: '🔌',
  },
  {
    id: 'motorcycle',
    name: 'Motorcycle',
    costPerKm: 0.25,
    baseValue: 15000,
    icon: '🏍️',
  },
  {
    id: 'bicycle',
    name: 'Bicycle',
    costPerKm: 0.05,
    baseValue: 500,
    icon: '🚲',
  },
  {
    id: 'helicopter',
    name: 'Helicopter',
    costPerKm: 7.5,
    baseValue: 1500000,
    icon: '🚁',
  },
  {
    id: 'sports',
    name: 'Sports Car',
    costPerKm: 0.8,
    baseValue: 60000,
    icon: '🚗💨',
  },
  {
    id: 'unrealistic',
    name: 'Unrealistic Vehicle',
    costPerKm: 2.25,
    baseValue: 100000,
    icon: '🚀',
  },
];

export default vehicleTypes;
