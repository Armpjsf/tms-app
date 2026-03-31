
export const ZONES = [
    { id: 'BKK', name: 'Bangkok (BKK)' },
    { id: 'Central', name: 'Central Region' },
    { id: 'North', name: 'Northern Region' },
    { id: 'South', name: 'Southern Region' },
    { id: 'East', name: 'Eastern Region' },
    { id: 'West', name: 'Western Region' },
]

export const VEHICLE_TYPES = [
    '4-Wheel',
    '6-Wheel',
    '10-Wheel',
    'Pickup',
    'Motorcycle'
]

export const VEHICLE_CAPACITIES: Record<string, { weight: number, volume: number }> = {
    '4-Wheel': { weight: 1500, volume: 4.0 },
    'Pickup': { weight: 1500, volume: 4.0 },
    '6-Wheel': { weight: 5000, volume: 15.0 },
    '10-Wheel': { weight: 12000, volume: 35.0 },
    'Motorcycle': { weight: 30, volume: 0.2 },
}
