import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, ToggleLeft, ToggleRight } from 'lucide-react'
import { useGetAdminCompaniesQuery, useUpdateCompanyStatusMutation } from '../../store/api/adminApi'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { SearchInput } from '../../components/ui/SearchInput'
import { CompanyStatusBadge } from '../../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableSkeleton, EmptyTableRow } from '../../components/ui/Table'
import { formatDate } from '../../utils/formatDate'

export default function AdminCompanies() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useGetAdminCompaniesQuery()
  const [updateStatus] = useUpdateCompanyStatusMutation()

  const companies = data?.companies || []
  const filtered = companies.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()),
  )

  const handleToggle = async (company) => {
    try {
      await updateStatus({ id: company.id, is_active: !company.is_active }).unwrap()
      toast.success(`${company.name} ${company.is_active ? 'deactivated' : 'activated'}`)
    } catch (err) {
      toast.error(err?.data?.message || 'Operation failed')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
        <p className="mt-1 text-sm text-slate-500">Manage all registered companies</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Companies ({companies.length})</CardTitle>
          <SearchInput value={search} onChange={setSearch} placeholder="Search companies..." className="w-64" />
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Batches</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={6} columns={7} />
            ) : filtered.length === 0 ? (
              <EmptyTableRow columns={7} message="No companies found" />
            ) : (
              filtered.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-800">{company.name}</p>
                      <p className="text-xs text-slate-500">{company.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{company.phone || '—'}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-slate-700">{company.batch_count || 0}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-slate-700">{company.order_count || 0}</span>
                  </TableCell>
                  <TableCell>{formatDate(company.created_at)}</TableCell>
                  <TableCell>
                    <CompanyStatusBadge isActive={company.is_active} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/admin/companies/${company.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                      <button
                        onClick={() => handleToggle(company)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          company.is_active
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {company.is_active ? (
                          <><ToggleRight className="h-3.5 w-3.5" />Deactivate</>
                        ) : (
                          <><ToggleLeft className="h-3.5 w-3.5" />Activate</>
                        )}
                      </button>
                    </div>
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
