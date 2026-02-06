import type { TransitOption } from "../types/models.types"

const transitOptions: TransitOption[] = [
    { n: 'Walk/Bike', c: 15, l: 1, subText: "Cheapest of all options but shoes and bikes wear out over time" },
    { n: 'Bus Pass', c: 95, l: 2, subText: "Public transit is a great option if it's available in your city, and can save you a lot of money compared to owning a car" },
    { n: 'Used Car', c: 380, l: 3, subText: "Buying a used car can be a more affordable option than purchasing new, but be sure to factor in potential maintenance costs" },
    { n: 'Car Lease', c: 450, l: 3, subText: "Leasing a car can offer lower monthly payments and the opportunity to drive a new vehicle every few years, but be mindful of mileage limits and potential fees" },
    { n: 'New Car', c: 550, l: 3, subText: "Buying a new car provides the latest features and a full warranty, but it also comes with a higher price tag and faster depreciation" },
    { n: 'Uber/Lyft', c: 200, l: 2, subText: "Ridesharing services can be a convenient and cost-effective option for those who don't need a car on a daily basis, but costs can add up if used frequently" },
    { n: 'Chauffer Service', c: 800, l: 3, subText: "Hiring a chauffeur can provide a luxurious and stress-free transportation experience, but it's typically the most expensive option and may not be practical for everyday use" },
    { n: 'Helicopter', c: 5000, l: 3, subText: "Helicopters are the ultimate luxury transportation option, but they're extremely expensive and require significant maintenance and licensing" },
]

export default transitOptions
