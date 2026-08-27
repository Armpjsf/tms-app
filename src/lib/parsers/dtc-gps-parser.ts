import * as XLSX from 'xlsx';

export interface DTCRawRow {
  index: number;
  dateTime: string;
  speed: number;
  status: string;
  cardId: string;
  driverName: string;
  stationName: string;
  subdistrict: string;
  district: string;
  province: string;
  odometer: number;
  totalDistance: number;
  deltaDistance: number;
  lat: number;
  lon: number;
  fuelPercent: number;
  batteryBox: string;
  batteryVehicle: string;
  mapUrl: string;
  workingHour: string;
}

export interface DTCTrip {
  tripId: string;
  vehiclePlate: string;
  driverName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  startLocation: string;
  endLocation: string;
  startOdo: number;
  endOdo: number;
  distanceKm: number;
  maxSpeed: number;
  avgSpeed: number;
  idleMinutes: number;
  startFuelPct: number;
  endFuelPct: number;
  startLat?: number;
  startLon?: number;
  endLat?: number;
  endLon?: number;
}

export interface DTCRefuelEvent {
  dateTime: string;
  location: string;
  odometer: number;
  fuelPctBefore: number;
  fuelPctAfter: number;
  fuelPctIncrease: number;
  distanceSinceLastKm: number;   // ระยะทาง GPS ที่วิ่งตั้งแต่การเติมครั้งก่อน (odometer delta)
  // เติมหลังจับคู่กับบิลจริง (Fuel_Logs) ในฝั่ง client:
  matchedLogId?: string;
  matchedLiters?: number;        // ลิตรที่เติมจริงจากบิล
  matchedCost?: number;
  matchedStation?: string;
  kmPerLiter?: number | null;    // full-to-full: distanceSinceLastKm / matchedLiters
}

export interface DTCAnalysisResult {
  vehiclePlate: string;
  period: string;
  totalDistanceKm: number;
  totalTripsCount: number;
  totalDrivingMinutes: number;
  totalIdleMinutes: number;
  startOdometer: number;
  endOdometer: number;
  trips: DTCTrip[];
  refuelEvents: DTCRefuelEvent[];
  dailySummary: {
    date: string;
    tripsCount: number;
    distanceKm: number;
    drivingMinutes: number;
    idleMinutes: number;
    maxSpeed: number;
    startOdo: number;
    endOdo: number;
    drivers: string[];
    fuelRefueledLiters?: number;
    fuelCost?: number;
  }[];
  weeklySummary: {
    week: string;
    distanceKm: number;
    tripsCount: number;
    drivingMinutes: number;
    fuelCost?: number;
  }[];
  monthlySummary: {
    month: string;
    distanceKm: number;
    tripsCount: number;
    drivingMinutes: number;
    fuelCost?: number;
  }[];
}

/**
 * Parse a DTC GPS Excel file (Buffer or ArrayBuffer)
 */
export function parseDTCExcel(dataBuffer: ArrayBuffer | Uint8Array | Buffer): DTCAnalysisResult {
  const workbook = XLSX.read(dataBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  if (rawRows.length < 5) {
    throw new Error('รูปแบบไฟล์ DTC ไม่ถูกต้อง: ข้อมูลน้อยเกินไป');
  }

  // 1. Extract Header Metadata
  let vehiclePlate = '';
  let period = '';
  let totalDistanceKm = 0;

  for (let i = 0; i < Math.min(rawRows.length, 6); i++) {
    const row = rawRows[i];
    const rowStr = Array.isArray(row) ? row.join(' ') : String(row);
    if (rowStr.includes('ทะเบียน:')) {
      const match = rowStr.match(/ทะเบียน:\s*([^\s]+)/);
      if (match) vehiclePlate = match[1].trim();
    }
    if (rowStr.includes('ช่วงเวลา :')) {
      const match = rowStr.match(/ช่วงเวลา\s*:\s*([^]+)/);
      if (match) period = match[1].trim();
    }
    if (rowStr.includes('รวมระยะทางทั้งสิ้น')) {
      const match = rowStr.match(/รวมระยะทางทั้งสิ้น\s*([\d,.]+)/);
      if (match) totalDistanceKm = parseFloat(match[1].replace(/,/g, ''));
    }
  }

  // Find Header Row (usually row 5)
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    if (Array.isArray(row) && row.some(cell => String(cell).includes('วัน-เวลา') || String(cell).includes('ไมล์'))) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) headerRowIdx = 4;

  const dataRows = rawRows.slice(headerRowIdx + 1);

  // 2. Parse Points
  const points: DTCRawRow[] = [];
  for (const r of dataRows) {
    if (!Array.isArray(r) || !r[2]) continue;
    const dtStr = String(r[2]).trim();
    if (!dtStr || !dtStr.includes('/')) continue;

    const odo = parseFloat(String(r[12] || 0)) || 0;
    const speed = parseFloat(String(r[3] || 0)) || 0;
    const deltaDist = parseFloat(String(r[14] || 0)) || 0;
    const cumDist = parseFloat(String(r[13] || 0)) || 0;
    const lat = parseFloat(String(r[15] || 0)) || 0;
    const lon = parseFloat(String(r[16] || 0)) || 0;
    const fuelPct = parseFloat(String(r[21] || 0)) || 0;

    points.push({
      index: parseInt(String(r[0])) || points.length + 1,
      dateTime: dtStr,
      speed,
      status: String(r[5] || '').trim(),
      cardId: String(r[6] || '').trim(),
      driverName: String(r[7] || '').trim().replace(/^-\s*/, '') || 'ไม่ระบุคนขับ',
      stationName: String(r[8] || '').trim(),
      subdistrict: String(r[9] || '').trim(),
      district: String(r[10] || '').trim(),
      province: String(r[11] || '').trim(),
      odometer: odo,
      totalDistance: cumDist,
      deltaDistance: deltaDist,
      lat,
      lon,
      fuelPercent: fuelPct,
      batteryBox: String(r[22] || ''),
      batteryVehicle: String(r[23] || ''),
      mapUrl: String(r[26] || ''),
      workingHour: String(r[27] || '')
    });
  }

  if (points.length === 0) {
    throw new Error('ไม่พบข้อมูลจุดพิกัดการเดินรถในไฟล์');
  }

  const startOdometer = points[0].odometer;
  const endOdometer = points[points.length - 1].odometer;
  if (!totalDistanceKm) {
    totalDistanceKm = +(endOdometer - startOdometer).toFixed(2);
  }

  // 3. Segment Points into Trips / Sessions
  const trips: DTCTrip[] = [];
  const refuelEvents: DTCRefuelEvent[] = [];

  let currentTripPoints: DTCRawRow[] = [];
  let prevPoint: DTCRawRow | null = null;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];

    // Detect Refuel Event (Fuel percentage jump >= 8% when stationary/slow)
    if (prevPoint && pt.fuelPercent > prevPoint.fuelPercent + 8 && pt.speed < 10) {
      refuelEvents.push({
        dateTime: pt.dateTime,
        location: [pt.subdistrict, pt.district, pt.province].filter(Boolean).join(' ') || pt.stationName,
        odometer: pt.odometer,
        fuelPctBefore: prevPoint.fuelPercent,
        fuelPctAfter: pt.fuelPercent,
        fuelPctIncrease: +(pt.fuelPercent - prevPoint.fuelPercent).toFixed(1),
        distanceSinceLastKm: 0
      });
    }

    const isMovingOrActive = pt.speed > 0 || pt.status.includes('วิ่ง') || pt.status.includes('สตาร์ท');
    const isEngineOff = pt.status.includes('ดับเครื่อง') || pt.status.includes('รถจอด');

    if (isMovingOrActive) {
      currentTripPoints.push(pt);
    } else if (isEngineOff && currentTripPoints.length > 0) {
      currentTripPoints.push(pt);
      const trip = buildTrip(currentTripPoints, vehiclePlate, trips.length + 1);
      if (trip && (trip.distanceKm >= 0.2 || trip.durationMinutes >= 3)) {
        trips.push(trip);
      }
      currentTripPoints = [];
    }

    prevPoint = pt;
  }

  if (currentTripPoints.length > 0) {
    const trip = buildTrip(currentTripPoints, vehiclePlate, trips.length + 1);
    if (trip && trip.distanceKm >= 0.1) trips.push(trip);
  }

  // 3b. ระยะทาง GPS ต่อรอบเติม (full-to-full): ไมล์ตอนเติมนี้ - ไมล์ตอนเติมครั้งก่อน
  for (let i = 0; i < refuelEvents.length; i++) {
    const prevOdo = i === 0 ? startOdometer : refuelEvents[i - 1].odometer;
    const dist = refuelEvents[i].odometer - prevOdo;
    refuelEvents[i].distanceSinceLastKm = dist > 0 ? +dist.toFixed(2) : 0;
  }

  // 4. Compute Daily, Weekly, Monthly Aggregations
  const dailyMap = new Map<string, {
    date: string;
    tripsCount: number;
    distanceKm: number;
    drivingMinutes: number;
    idleMinutes: number;
    maxSpeed: number;
    startOdo: number;
    endOdo: number;
    drivers: Set<string>;
  }>();

  for (const trip of trips) {
    const [d] = trip.startTime.split(' ');
    const dateKey = convertDateStrToIso(d); // YYYY-MM-DD

    const curr = dailyMap.get(dateKey) || {
      date: dateKey,
      tripsCount: 0,
      distanceKm: 0,
      drivingMinutes: 0,
      idleMinutes: 0,
      maxSpeed: 0,
      startOdo: trip.startOdo,
      endOdo: trip.endOdo,
      drivers: new Set<string>()
    };

    curr.tripsCount += 1;
    curr.distanceKm = +(curr.distanceKm + trip.distanceKm).toFixed(2);
    curr.drivingMinutes += trip.durationMinutes;
    curr.idleMinutes += trip.idleMinutes;
    curr.maxSpeed = Math.max(curr.maxSpeed, trip.maxSpeed);
    curr.endOdo = trip.endOdo;
    if (trip.driverName && trip.driverName !== 'ไม่ระบุคนขับ') {
      curr.drivers.add(trip.driverName);
    }

    dailyMap.set(dateKey, curr);
  }

  const dailySummary = Array.from(dailyMap.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(d => ({
      ...d,
      drivers: Array.from(d.drivers)
    }));

  // Weekly Aggregation
  const weeklyMap = new Map<string, { week: string; distanceKm: number; tripsCount: number; drivingMinutes: number }>();
  for (const d of dailySummary) {
    const weekKey = getWeekKey(d.date);
    const curr = weeklyMap.get(weekKey) || { week: weekKey, distanceKm: 0, tripsCount: 0, drivingMinutes: 0 };
    curr.distanceKm = +(curr.distanceKm + d.distanceKm).toFixed(2);
    curr.tripsCount += d.tripsCount;
    curr.drivingMinutes += d.drivingMinutes;
    weeklyMap.set(weekKey, curr);
  }
  const weeklySummary = Array.from(weeklyMap.values()).sort((a, b) => b.week.localeCompare(a.week));

  // Monthly Aggregation
  const monthlyMap = new Map<string, { month: string; distanceKm: number; tripsCount: number; drivingMinutes: number }>();
  for (const d of dailySummary) {
    const monthKey = d.date.slice(0, 7); // YYYY-MM
    const curr = monthlyMap.get(monthKey) || { month: monthKey, distanceKm: 0, tripsCount: 0, drivingMinutes: 0 };
    curr.distanceKm = +(curr.distanceKm + d.distanceKm).toFixed(2);
    curr.tripsCount += d.tripsCount;
    curr.drivingMinutes += d.drivingMinutes;
    monthlyMap.set(monthKey, curr);
  }
  const monthlySummary = Array.from(monthlyMap.values()).sort((a, b) => b.month.localeCompare(a.month));

  const totalDrivingMinutes = trips.reduce((s, t) => s + t.durationMinutes, 0);
  const totalIdleMinutes = trips.reduce((s, t) => s + t.idleMinutes, 0);

  return {
    vehiclePlate,
    period,
    totalDistanceKm: +totalDistanceKm.toFixed(2),
    totalTripsCount: trips.length,
    totalDrivingMinutes,
    totalIdleMinutes,
    startOdometer,
    endOdometer,
    trips,
    refuelEvents,
    dailySummary,
    weeklySummary,
    monthlySummary
  };
}

function buildTrip(points: DTCRawRow[], vehiclePlate: string, tripNum: number): DTCTrip | null {
  if (points.length === 0) return null;
  const first = points[0];
  const last = points[points.length - 1];

  const startOdo = first.odometer;
  const endOdo = last.odometer;
  const distanceKm = Math.max(0, +(endOdo - startOdo).toFixed(2));

  const speeds = points.map(p => p.speed);
  const maxSpeed = Math.max(...speeds, 0);
  const avgSpeed = speeds.length > 0 ? +(speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1) : 0;

  const durationMinutes = Math.max(1, calculateMinutesDiff(first.dateTime, last.dateTime));
  const idleMinutes = points.filter(p => p.speed === 0).length;

  const startLoc = [first.subdistrict, first.district, first.province].filter(Boolean).join(' ') || first.stationName || 'ต้นทาง';
  const endLoc = [last.subdistrict, last.district, last.province].filter(Boolean).join(' ') || last.stationName || 'ปลายทาง';

  const driver = points.find(p => p.driverName && p.driverName !== 'ไม่ระบุคนขับ')?.driverName || 'ไม่ระบุคนขับ';

  return {
    tripId: `DTC-TRIP-${tripNum.toString().padStart(4, '0')}`,
    vehiclePlate,
    driverName: driver,
    startTime: first.dateTime,
    endTime: last.dateTime,
    durationMinutes,
    startLocation: startLoc,
    endLocation: endLoc,
    startOdo,
    endOdo,
    distanceKm,
    maxSpeed,
    avgSpeed,
    idleMinutes,
    startFuelPct: first.fuelPercent,
    endFuelPct: last.fuelPercent,
    startLat: first.lat,
    startLon: first.lon,
    endLat: last.lat,
    endLon: last.lon
  };
}

function calculateMinutesDiff(dtStr1: string, dtStr2: string): number {
  try {
    const parse = (s: string) => {
      const [d, t] = s.split(' ');
      const [day, month, year] = d.split('/').map(Number);
      const [hour, min, sec] = t.split(':').map(Number);
      return new Date(year, month - 1, day, hour, min, sec).getTime();
    };
    const diffMs = parse(dtStr2) - parse(dtStr1);
    return Math.max(1, Math.round(diffMs / 60000));
  } catch {
    return 1;
  }
}

function convertDateStrToIso(dStr: string): string {
  try {
    const [day, month, year] = dStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch {
    return dStr;
  }
}

function getWeekKey(isoDate: string): string {
  const d = new Date(isoDate);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const pastDaysOfYear = (d.getTime() - startOfYear.getTime()) / 86400000;
  const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}
