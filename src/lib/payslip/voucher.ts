// โครงข้อมูลใบสำคัญจ่าย (snapshot) สำหรับแสดงในแอปคนขับ + สร้าง PDF

export interface VoucherLine {
  date: string | null
  jobId: string
  customer: string
  route?: string
  amount: number
}

export interface VoucherData {
  docId: string
  date: string
  company: {
    name?: string | null
    nameEn?: string | null
    address?: string | null
    taxId?: string | null
    logoUrl?: string | null
    phone?: string | null
  }
  driverName: string
  bank: { name?: string | null; accNo?: string | null; accName?: string | null }
  lines: VoucherLine[]
  subtotal: number
  vatRate: number
  vatAmount: number
  whtRate: number
  withholding: number
  claimRate: number
  claimAmount: number
  netTotal: number
}

function sumDriverExtra(extra: unknown): number {
  try {
    let costs = extra
    if (typeof costs === "string") { try { costs = JSON.parse(costs) } catch {} }
    if (typeof costs === "string") { try { costs = JSON.parse(costs) } catch {} }
    if (Array.isArray(costs)) {
      return (costs as { cost_driver?: number }[])
        .filter((c) => c.cost_driver && Number(c.cost_driver) > 0)
        .reduce((a, c) => a + (Number(c.cost_driver) || 0), 0)
    }
  } catch {}
  return 0
}

type PaymentLike = {
  Driver_Payment_ID: string
  Driver_Name: string
  Payment_Date?: string | null
  Total_Amount?: number | null
  VAT_Rate?: number | null; VAT_Amount?: number | null
  WHT_Rate?: number | null; Withholding_Tax?: number | null
  Claim_Rate?: number | null; Claim_Amount?: number | null; Net_Amount?: number | null
}
type JobLike = {
  Job_ID: string
  Plan_Date?: string | null
  Customer_Name?: string | null
  Route_Name?: string | null
  Origin_Location?: string | null
  Cost_Driver_Total?: number | null
  extra_costs_json?: unknown
}
type CompanyLike = Record<string, unknown> | null
type BankLike = { Bank_Name?: string; Bank_Account_No?: string; Bank_Account_Name?: string } | null

/** สร้าง snapshot ใบสำคัญจ่าย จากข้อมูลใน getDriverPaymentByIdWithJobs (สูตรตรงกับหน้าพิมพ์) */
export function buildVoucherData(
  payment: PaymentLike,
  jobs: JobLike[],
  company: CompanyLike,
  bank: BankLike
): VoucherData {
  const lines: VoucherLine[] = jobs.map((j) => ({
    date: j.Plan_Date || null,
    jobId: j.Job_ID,
    customer: j.Customer_Name || "",
    route: j.Route_Name || j.Origin_Location || "",
    amount: (Number(j.Cost_Driver_Total) || 0) + sumDriverExtra(j.extra_costs_json),
  }))

  const subtotal = lines.reduce((s, l) => s + l.amount, 0)
  const p = payment
  const vatRate = Number(p.VAT_Rate) || 0
  const whtRate = p.WHT_Rate != null ? Number(p.WHT_Rate) : 1
  const claimRate = Number(p.Claim_Rate) || 0
  const vatAmount = p.VAT_Amount != null ? Number(p.VAT_Amount) : Math.round(subtotal * vatRate) / 100
  const withholding = p.Withholding_Tax != null ? Number(p.Withholding_Tax) : Math.round(subtotal * whtRate) / 100
  const claimAmount = p.Claim_Amount != null ? Number(p.Claim_Amount) : Math.round(subtotal * claimRate) / 100
  const netTotal = p.Net_Amount != null ? Number(p.Net_Amount) : subtotal + vatAmount - withholding - claimAmount

  const c = (company || {}) as Record<string, unknown>
  return {
    docId: p.Driver_Payment_ID,
    date: p.Payment_Date || "",
    company: {
      // รองรับทั้ง company_profile (company_name) และ accounting_profile (company_name_th)
      name: (c.company_name as string) ?? (c.company_name_th as string) ?? null,
      nameEn: (c.company_name_en as string) ?? null,
      address: (c.address as string) ?? null,
      taxId: (c.tax_id as string) ?? null,
      logoUrl: (c.logo_url as string) ?? null,
      phone: (c.phone as string) ?? null,
    },
    driverName: p.Driver_Name,
    bank: {
      name: bank?.Bank_Name ?? null,
      accNo: bank?.Bank_Account_No ?? null,
      accName: bank?.Bank_Account_Name ?? null,
    },
    lines,
    subtotal,
    vatRate,
    vatAmount,
    whtRate,
    withholding,
    claimRate,
    claimAmount,
    netTotal,
  }
}
