import { useState } from 'react'
import { useGetAdminOrdersQuery } from '../../store/api/adminApi'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { SearchInput } from '../../components/ui/SearchInput'
import { PaymentStatusBadge, Badge } from '../../components/ui/Badge'
import { Select } from '../../components/ui/Input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableSkeleton, EmptyTableRow } from '../../components/ui/Table'
import { formatDate } from '../../utils/formatDate'

export default function AdminOrders() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const { data, isLoading } = useGetAdminOrdersQuery()

  const orders = data?.orders || data || []
  const filtered = orders.filter((o) => {
    const matchSearch =
      o.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      o.batch?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="mt-1 text-sm text-slate-500">All certificate orders across the platform</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Orders ({orders.length})</CardTitle>
          <div className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm py-2"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
            </Select>
            <SearchInput value={search} onChange={setSearch} placeholder="Search orders..." className="w-56" />
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Serial No.</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Certificate</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={7} columns={8} />
            ) : filtered.length === 0 ? (
              <EmptyTableRow columns={8} message="No orders found" />
            ) : (
              filtered.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-800">{order.user?.name}</p>
                      <p className="text-xs text-slate-500">{order.user?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-slate-700">{order.batch?.name || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-slate-600">{order.batch?.company?.name || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-slate-600">{order.certificate_serial || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">₹{order.amount || order.batch?.certificate_price || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>
                    {order.certificate?.is_issued ? (
                      <Badge variant="success" dot>Issued</Badge>
                    ) : (
                      <Badge variant="warning" dot>Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(order.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
