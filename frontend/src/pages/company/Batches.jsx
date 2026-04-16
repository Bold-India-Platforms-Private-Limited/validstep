import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Layers, Plus, Search, Eye } from 'lucide-react'
import { useGetBatchesQuery } from '../../store/api/companyApi'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/SearchInput'
import { BatchStatusBadge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableSkeleton, EmptyTableRow } from '../../components/ui/Table'
import { formatDate } from '../../utils/formatDate'

export default function Batches() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useGetBatchesQuery()

  const batches = data?.batches || data || []
  const filtered = batches.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.program?.name?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Batches</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your certificate batches and share enrollment links
          </p>
        </div>
        <Link to="/company/batches/create">
          <Button leftIcon={<Plus className="h-4 w-4" />}>Create Batch</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Batches</CardTitle>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search batches..."
            className="w-64"
          />
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch Name</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={5} columns={7} />
            ) : filtered.length === 0 ? (
              <EmptyTableRow
                columns={7}
                message={search ? 'No batches match your search' : 'No batches created yet'}
              />
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
                    <span className="text-slate-600">{batch.program?.name || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-slate-600">
                      {formatDate(batch.start_date)} — {formatDate(batch.end_date)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-slate-700">{batch._count?.orders || 0}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-slate-700">₹{batch.certificate_price}</span>
                  </TableCell>
                  <TableCell>
                    <BatchStatusBadge status={batch.status} />
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/company/batches/${batch.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
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
