import type { TransitOption } from "../types/models.types"

const transitOptions: TransitOption[] = [
    // L1 - Walk/Bike
    { n: 'L1 - Walk/Bike', c: 15, l: 1, subText: "Cheapest of all options but shoes and bikes wear out over time" },
    
    // L2 - Public Transport
    { n: 'L2 - Public Transport - Bus/Train', c: 95, l: 2, subText: "Public transit is a great option if it's available in your city, and can save you a lot of money compared to owning a car" },
    
    // L3 - Rideshare
    { n: 'L3 - Rideshare - Uber/Lyft', c: 200, l: 3, subText: "Ridesharing services can be a convenient and cost-effective option for those who don't need a car on a daily basis, but costs can add up if used frequently" },
    
    // L4 - Owned Vehicle
    { n: 'L4 - Owned Vehicle', c: 425, l: 4, subText: "Buying a vehicle provides convenience and independence, but also comes with ongoing costs like maintenance, insurance, and depreciation" },

    
    // L5 - Chauffeur
    { n: 'L5 - Chauffeur Service', c: 800, l: 5, subText: "Hiring a chauffeur can provide a luxurious and stress-free transportation experience, but it's typically the most expensive option and may not be practical for everyday use" },
    { n: 'L5 - Helicopter', c: 5000, l: 5, subText: "Helicopters are the ultimate luxury transportation option, but they're extremely expensive and require significant maintenance and licensing" },
]

export default transitOptions
