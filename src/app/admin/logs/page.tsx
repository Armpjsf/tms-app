import { getSystemLogs } from '@/lib/supabase/logs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getAllBranches } from '@/lib/supabase/branches'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function LogsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const branchId = typeof searchParams.branchId === 'string' ? searchParams.branchId : undefined
  const moduleFilter = typeof searchParams.module === 'string' ? searchParams.module : undefined
  
  let logs: any[] = []
  let branches: any[] = []

  try {
    logs = await getSystemLogs({
      branchId,
      module: moduleFilter,
      limit: 100
    })
    branches = await getAllBranches()
  } catch (error) {
    console.error('Error fetching logs data:', error)
  }

  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">สร้าง</Badge>
      case 'UPDATE':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">แก้ไข</Badge>
      case 'DELETE':
        return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200">ลบ</Badge>
      case 'APPROVE':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">อนุมัติ</Badge>
      case 'EXPORT':
        return <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200">ดึงรายงาน</Badge>
      case 'LOGIN':
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200">เข้าสู่ระบบ</Badge>
      case 'LOGOUT':
        return <Badge className="bg-slate-50 text-slate-500 hover:bg-slate-50 border-slate-100">ออกจากระบบ</Badge>
      default:
        return <Badge variant="outline">{action}</Badge>
    }
  }

  const getModuleLabel = (module: string) => {
    switch (module) {
      case 'Jobs': return 'จัดการงาน'
      case 'Auth': return 'เข้าระบบ'
      case 'Billing': return 'การเงิน/วางบิล'
      case 'Reports': return 'รายงาน'
      case 'Fuel': return 'น้ำมัน'
      case 'Maintenance': return 'ซ่อมบำรุง'
      case 'Settings': return 'ตั้งค่า'
      case 'Users': return 'ผู้ใช้งาน'
      default: return module
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
          <p className="text-muted-foreground">ติดตามประวัติการใช้งานและกิจกรรมในระบบทั้งหมด</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>บันทึกกิจกรรมล่าสุด (100 รายการล่าสุด)</CardTitle>
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2 border rounded-md px-3 py-1 bg-background">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="ค้นหาชื่อผู้ใช้หรือโมดูล..." 
                className="border-0 focus-visible:ring-0 w-64 h-8"
              />
            </div>
            {/* Filter UI would go here with Select components */}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[180px]">วันเวลา</TableHead>
                  <TableHead>ผู้ใช้งาน</TableHead>
                  <TableHead>สาขา</TableHead>
                  <TableHead>โมดูล</TableHead>
                  <TableHead>การกระทำ</TableHead>
                  <TableHead className="max-w-[300px]">รายละเอียด</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      ไม่พบข้อมูลบันทึกกิจกรรม
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss', { locale: th })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.username}</span>
                          <span className="text-[10px] text-muted-foreground">{log.role}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {log.branch_id || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-blue-600">{getModuleLabel(log.module)}</TableCell>
                      <TableCell>{getActionBadge(log.action_type)}</TableCell>
                      <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground" title={JSON.stringify(log.details, null, 2)}>
                        {log.target_id && <span className="text-foreground font-semibold mr-1">[{log.target_id}]</span>}
                        {JSON.stringify(log.details)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
