// Comprehensive vehicle database organized by class and condition
// Easy to extend with new vehicles by adding objects to the appropriate arrays

const vehicleDatabase = {
  classes: {
    economy: {
      name: 'Economy',
      baseMaintenanceFactor: 0.8,
      gasMileage: 28,
      depreciation: { // yearly depreciation rates
        new: 0.15, // 15% first year
        used: 0.08  // 8% per year after
      }
    },
    midrange: {
      name: 'Mid-Range',
      baseMaintenanceFactor: 1.0,
      gasMileage: 24,
      depreciation: {
        new: 0.18,
        used: 0.10
      }
    },
    luxury: {
      name: 'Luxury',
      baseMaintenanceFactor: 1.5,
      gasMileage: 20,
      depreciation: {
        new: 0.20,
        used: 0.12
      }
     },
    unrealistic: {
      name: 'Unrealistic',
      baseMaintenanceFactor: 2.0,
      gasMileage: 10,
      depreciation: {
        new: 0.25,
        used: 0.15
      }
    }
  },
  vehicles: [
    // ECONOMY CLASS
    {
      id: 'honda-civic-2024',
      name: 'Honda Civic',
      class: 'economy',
      body: 'Sedan',
      newPrice: 28000,
      usedPrice: 18000,
      leasePrice: 299,
      year: 2024,
      icon: '🚗',
      baseValue: 28000,
      costPerKm: 0.25
    },
    {
      id: 'toyota-corolla-2024',
      name: 'Toyota Corolla',
      class: 'economy',
      body: 'Sedan',
      newPrice: 27500,
      usedPrice: 17500,
      leasePrice: 289,
      year: 2024,
      icon: '🚗',
      baseValue: 27500,
      costPerKm: 0.24
    },
    {
      id: 'hyundai-elantra-2024',
      name: 'Hyundai Elantra',
      class: 'economy',
      body: 'Sedan',
      newPrice: 25000,
      usedPrice: 16000,
      leasePrice: 259,
      year: 2024,
      icon: '🚗',
      baseValue: 25000,
      costPerKm: 0.22
    },
    {
      id: 'ford-focus-2024',
      name: 'Ford Focus',
      class: 'economy',
      body: 'Hatchback',
      newPrice: 26500,
      usedPrice: 17000,
      leasePrice: 275,
      year: 2024,
      icon: '🚗',
      baseValue: 26500,
      costPerKm: 0.23
    },

    // MID-RANGE CLASS
    {
      id: 'honda-accord-2024',
      name: 'Honda Accord',
      class: 'midrange',
      body: 'Sedan',
      newPrice: 38000,
      usedPrice: 25000,
      leasePrice: 399,
      year: 2024,
      icon: '🚙',
      baseValue: 38000,
      costPerKm: 0.32
    },
    {
      id: 'toyota-camry-2024',
      name: 'Toyota Camry',
      class: 'midrange',
      body: 'Sedan',
      newPrice: 37500,
      usedPrice: 25000,
      leasePrice: 395,
      year: 2024,
      icon: '🚙',
      baseValue: 37500,
      costPerKm: 0.31
    },
    {
      id: 'mazda-6-2024',
      name: 'Mazda 6',
      class: 'midrange',
      body: 'Sedan',
      newPrice: 36000,
      usedPrice: 23500,
      leasePrice: 379,
      year: 2024,
      icon: '🚙',
      baseValue: 36000,
      costPerKm: 0.30
    },
    {
      id: 'chevy-malibu-2024',
      name: 'Chevrolet Malibu',
      class: 'midrange',
      body: 'Sedan',
      newPrice: 35000,
      usedPrice: 23000,
      leasePrice: 369,
      year: 2024,
      icon: '🚙',
      baseValue: 35000,
      costPerKm: 0.29
    },
    {
      id: 'ford-edge-2024',
      name: 'Ford Edge',
      class: 'midrange',
      body: 'SUV',
      newPrice: 42000,
      usedPrice: 28000,
      leasePrice: 439,
      year: 2024,
      icon: '🚙',
      baseValue: 42000,
      costPerKm: 0.35
    },
    {
      id: 'honda-crv-2024',
      name: 'Honda CR-V',
      class: 'midrange',
      body: 'SUV',
      newPrice: 40500,
      usedPrice: 27000,
      leasePrice: 425,
      year: 2024,
      icon: '🚙',
      baseValue: 40500,
      costPerKm: 0.33
    },

    // LUXURY CLASS
    {
      id: 'bmw-3-series-2024',
      name: 'BMW 3 Series',
      class: 'luxury',
      body: 'Sedan',
      newPrice: 65000,
      usedPrice: 42000,
      leasePrice: 699,
      year: 2024,
      icon: '🏎️',
      baseValue: 65000,
      costPerKm: 0.45
    },
    {
      id: 'mercedes-c-class-2024',
      name: 'Mercedes-Benz C-Class',
      class: 'luxury',
      body: 'Sedan',
      newPrice: 68000,
      usedPrice: 44000,
      leasePrice: 729,
      year: 2024,
      icon: '🏎️',
      baseValue: 68000,
      costPerKm: 0.48
    },
    {
      id: 'audi-a4-2024',
      name: 'Audi A4',
      class: 'luxury',
      body: 'Sedan',
      newPrice: 62000,
      usedPrice: 40000,
      leasePrice: 669,
      year: 2024,
      icon: '🏎️',
      baseValue: 62000,
      costPerKm: 0.43
    },
    {
      id: 'lexus-es-2024',
      name: 'Lexus ES',
      class: 'luxury',
      body: 'Sedan',
      newPrice: 64000,
      usedPrice: 41000,
      leasePrice: 689,
      year: 2024,
      icon: '🏎️',
      baseValue: 64000,
      costPerKm: 0.44
    },
    {
      id: 'bmw-x5-2024',
      name: 'BMW X5',
      class: 'luxury',
      body: 'SUV',
      newPrice: 85000,
      usedPrice: 55000,
      leasePrice: 899,
      year: 2024,
      icon: '🏎️',
      baseValue: 85000,
      costPerKm: 0.55
    },
    {
      id: 'mercedes-glc-2024',
      name: 'Mercedes-Benz GLC',
      class: 'luxury',
      body: 'SUV',
      newPrice: 82000,
      usedPrice: 53000,
      leasePrice: 869,
      year: 2024,
      icon: '🏎️',
      baseValue: 82000,
      costPerKm: 0.52
    },
    {
      id: 'audi-q5-2024',
      name: 'Audi Q5',
      class: 'luxury',
      body: 'SUV',
      newPrice: 72000,
      usedPrice: 48000,
      leasePrice: 759,
      year: 2024,
      icon: '🏎️',
      baseValue: 72000,
      costPerKm: 0.48
    },
    {
      id: 'lexus-rx-2024',
      name: 'Lexus RX',
      class: 'luxury',
      body: 'SUV',
      newPrice: 70000,
      usedPrice: 46000,
      leasePrice: 739,
      year: 2024,
      icon: '🏎️',
      baseValue: 70000,
      costPerKm: 0.46
    },

    // LUXURY CLASS
    {
      id: '2025-hennessey-venom-F5',
      name: 'Hennessey Venom F5',
      class: 'unrealistic',
      body: 'Sedan',
      newPrice: 1200000,
      usedPrice: 800000,
      leasePrice: 699,
      year: 2024,
      icon: '🏎️',
      baseValue: 1200000,
      costPerKm: 0.65
    },
    {
      id: '2025-bugatti-chiron-super-sport',
      name: 'Bugatti Chiron Super Sport',
      class: 'unrealistic',
      body: 'Sedan',
      newPrice: 3000000,
      usedPrice: 2000000,
      leasePrice: 1299,
      year: 2024,
      icon: '🏎️',
      baseValue: 3000000,
      costPerKm: 1.25
    },
    {
      id: '2025-koenigsegg-jesko-absolut',
      name: 'Koenigsegg Jesko Absolut',
      class: 'unrealistic',
      body: 'Sedan',
      newPrice: 2500000,
      usedPrice: 1800000,
      leasePrice: 1199,
      year: 2024,
      icon: '🏎️',
      baseValue: 2500000,
      costPerKm: 1.15
    },
    {
      id: '2025-ssc-tuatara',
      name: 'SSC Tuatara',  
      class: 'unrealistic',
      body: 'Sedan',
      newPrice: 1800000,
      usedPrice: 1200000,
      leasePrice: 999,
      year: 2024,
      icon: '🏎️',
      baseValue: 1800000,
      costPerKm: 1.1
    },
    {
      id: '2025-aston-martin-valhalla',
      name: 'Aston Martin Valhalla',
      class: 'unrealistic',
      body: 'Sedan',
      newPrice: 2200000,
      usedPrice: 1500000,
      leasePrice: 1399,
      year: 2024,
      icon: '🏎️',
      baseValue: 2200000,
      costPerKm: 1.18
    },
    {
      id: '2025-lamborghini-sian-fkp-37',
      name: 'Lamborghini Sian FKP 37',
      class: 'unrealistic',
      body: 'Sedan',
      newPrice: 2800000,
      usedPrice: 1900000,
      leasePrice: 1499,
      year: 2024,
      icon: '🏎️',
      baseValue: 2800000,
      costPerKm: 1.35
    },
    {
      id: '2025-ferrari-sf90-stradale',
      name: 'Ferrari SF90 Stradale',
      class: 'unrealistic',
      body: 'Sedan',
      newPrice: 650000,
      usedPrice: 450000,
      leasePrice: 799,
      year: 2024,
      icon: '🏎️',
      baseValue: 650000,
      costPerKm: 1.1
    },
    {
      id: '2025-porsche-918-spyder',
      name: 'Porsche 918 Spyder',
      class: 'unrealistic',
      body: 'Sedan',
      newPrice: 850000,
      usedPrice: 600000,
      leasePrice: 899,
      year: 2024,
      icon: '🏎️' ,
      baseValue: 850000,
      costPerKm: 1.2
    },
    {
      id: '2026-hennessey-velociraptor-6x6',
      name: 'Hennessey Velociraptor 6x6',
      class: 'unrealistic',
      body: 'SUV',
      newPrice: 425000 ,
      usedPrice: 375000,
      leasePrice: 899,
      year: 2025,
      icon: '🏎️' ,
      baseValue: 425000,
      costPerKm: 2.3
    },
    {
      id: '2026-mercedes-maybach-gls-600',
      name: 'Mercedes-Maybach GLS 600',
      class: 'luxury',
      body: 'SUV',
      newPrice: 180000,
      usedPrice: 120000,
      leasePrice: 1299,
      year: 2026,
      icon: '🏎️',
      baseValue: 180000,
      costPerKm: 0.55
    },
    {
      id: '2026-rolls-royce-cullinan',
      name: 'Rolls-Royce Cullinan',
      class: 'luxury',
      body: 'SUV',
      newPrice: 300000,
      usedPrice: 200000,
      leasePrice: 1599,
      year: 2026,
      icon: '🏎️',
      baseValue: 300000,
      costPerKm: 0.65
    },
    {
      id: 'Robinson R44 Raven II',
      name: 'Robinson R44 Raven II',
      class: 'unrealistic',
      body: 'Helicopter',
      newPrice: 120000,
      usedPrice: 80000,
      leasePrice: 1299,
      year: 2024,
      icon: '🚁' ,
      baseValue: 120000,
      costPerKm: 6.7
    },
    {
      id: 'Bell 505 Jet Ranger X',
      name: 'Bell 505 Jet Ranger X',
      class: 'unrealistic',
      body: 'Helicopter',
      newPrice: 2500000,
      usedPrice: 1800000,
      leasePrice: 25998,
      year: 2024,
      icon: '🚁' ,
      baseValue: 2500000,
      costPerKm: 8.5
    },
    {
      id: 'Airbus H225 Super Puma',
      name: 'Airbus H225 Super Puma',
      class: 'unrealistic',
      body: 'Helicopter',
      newPrice: 28000000,
      usedPrice: 15000000,
      leasePrice: 28998,
      year: 2024,
      icon: '🚁' ,
      baseValue: 28000000,
      costPerKm: 17.5
    },

  ],
  conditions: {
    new: {
      label: 'New',
      priceMultiplier: 1.0 +- Math.random() * 0.2,
      label_short: 'New'
    },
    used: {
      label: 'Used (2-5 years)',
      priceMultiplier: 0.65 +- Math.random() * 0.2,
      label_short: 'Used'
    },
    lease: {
      label: 'Lease (36 months)',
      priceMultiplier: 0.8 +- Math.random() * 0.2,
      label_short: 'Lease'
    }
  },
  financingTerms: {
    monthlyPaymentMonths: 60, // 5-year note
    apr: 0.065 // 6.5% APR baseline (can be adjusted by credit score)
  }
}

export default vehicleDatabase
