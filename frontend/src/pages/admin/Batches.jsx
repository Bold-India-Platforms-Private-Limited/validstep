import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { useGetAdminBatchesQuery } from '../../store/api/adminApi'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { SearchInput } from '../../components/ui/SearchInput'
import { BatchStatusBadge } from '../../components/ui/Badge'
import {
  Table, TableHeader, TableBody, TableRow, TableHead,
  TableCell, TableSkeleton, EmptyTableRow,
} from '../../components/ui/Table'
import { formatDate } from '../../utils/formatDate'

export default function AdminBatches() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useGetAdminBatchesQuery()

  const batches = data?.batches || data || []
  const filtered = batches.filter(
    (b) =>
      b.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.company?.name?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">All Batches</h1>
        <p className="mt-1 text-sm text-slate-500">Overview of all batches across companies</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Batches ({batches.length})</CardTitle>
          <SearchInput value={search} onChange={setSearch} placeholder="Search batches..." className="w-64" />
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={6} columns={8} />
            ) : filtered.length === 0 ? (
              <EmptyTableRow columns={8} message="No batches found" />
            ) : (
              filtered.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-800">{batch.name}</p>
                      {batch.role && <p className="text-xs text-slate-500">Role: {batch.role}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {batch.company?.id ? (
                      <Link
                        to={`/admin/companies/${batch.company.id}`}
                        className="text-primary-600 hover:underline"
                      >
                        {batch.company.name}
                      </Link>
                    ) : '—'}
                  </TableCell>
                  <TableCell>{batch.program?.name || '—'}</TableCell>
                  <TableCell>
                    {formatDate(batch.start_date)} — {formatDate(batch.end_date)}
                  </TableCell>
                  <TableCell>₹{batch.certificate_price}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-slate-700">{batch.order_count || 0}</span>
                  </TableCell>
                  <TableCell><BatchStatusBadge status={batch.status} /></TableCell>
                  <TableCell>
                    <Link
                      to={`/admin/batches/${batch.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
