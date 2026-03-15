
export const FUEL_BASELINES: Record<string, { minKmPerLiter: number; maxKmPerLiter: number }> = {
  "4-Wheel": { minKmPerLiter: 10, maxKmPerLiter: 15 },
  "6-Wheel": { minKmPerLiter: 6, maxKmPerLiter: 9 },
  "10-Wheel": { minKmPerLiter: 4, maxKmPerLiter: 6 },
  "Trailer": { minKmPerLiter: 2.5, maxKmPerLiter: 4.5 },
  "Default": { minKmPerLiter: 5, maxKmPerLiter: 10 }
};

export const FUEL_FRAUD_THRESHOLD = 0.20; // แจ้งเตือนหากสิ้นเปลืองผิดปกติเกิน 20%
