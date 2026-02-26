import { getSystemLogs } from '@/lib/supabase/logs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getBranches } from '@/lib/supabase/branches'
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
  const module = typeof searchParams.module === 'string' ? searchParams.module : undefined
  
  const logs = await getSystemLogs({
    branchId,
    module,
    limit: 100
  })

  const branches = await getBranches()

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE': return <Badge variant="default" className="bg-green-500">สร้าง</Badge>
      case 'UPDATE': return <Badge variant="secondary" className="bg-blue-500 text-white">แก้ไข</Badge>
      case 'DELETE': return <Badge variant="destructive">ลบ</Badge>
      case 'LOGIN': return <Badge className="bg-purple-500">เข้าสู่ระบบ</Badge>
      case 'LOGOUT': return <Badge className="bg-gray-500">ออกจากระบบ</Badge>
      case 'APPROVE': return <Badge className="bg-emerald-500">อนุมัติ</Badge>
      default: return <Badge variant="outline">{action}</Badge>
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
                      <TableCell className="font-medium text-blue-600">{log.module}</TableCell>
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
