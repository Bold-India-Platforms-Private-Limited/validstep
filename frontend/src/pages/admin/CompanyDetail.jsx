import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useGetAdminCompanyQuery, useUpdateCompanyStatusMutation } from '../../store/api/adminApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { formatDate, formatCurrency } from '../../utils/formatDate'
import { ArrowLeft, Building2, Mail, Phone, Globe, Layers, CheckCircle, XCircle, ToggleLeft, ToggleRight } from 'lucide-react'

export default function AdminCompanyDetail() {
  const { id } = useParams()
  const { data, isLoading } = useGetAdminCompanyQuery(id)
  const [updateStatus, { isLoading: updating }] = useUpdateCompanyStatusMutation()

  if (isLoading) return <PageSpinner />
  if (!data) return <p className="p-6 text-slate-500">Company not found</p>

  // Backend returns programs[].batches[] — flatten to a single batches array
  const company = data
  const batches = (data.programs || []).flatMap((p) =>
    (p.batches || []).map((b) => ({ ...b, program: { name: p.name, type: p.type } }))
  )

  const handleVerify = async (is_verified) => {
    try {
      await updateStatus({ id, is_verified }).unwrap()
      toast.success(is_verified ? 'Company verified' : 'Verification revoked')
    } catch (err) {
      toast.error(err?.data?.message || 'Failed')
    }
  }

  const handleToggleActive = async () => {
    try {
      await updateStatus({ id, is_active: !company.is_active }).unwrap()
      toast.success(company.is_active ? 'Company deactivated' : 'Company activated')
    } catch (err) {
      toast.error(err?.data?.message || 'Failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/companies" className="rounded-lg p-2 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
          <p className="text-sm text-slate-500">Company details</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Company info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-4">
              {company.logo_url ? (
                <img src={company.logo_url} alt="Logo" className="h-16 w-16 rounded-xl object-cover border border-slate-200" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-50">
                  <Building2 className="h-8 w-8 text-primary-400" />
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-900">{company.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${company.is_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {company.is_verified ? 'Verified' : 'Unverified'}
                  </span>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${company.is_active ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'}`}>
                    {company.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="h-4 w-4 text-slate-400" />
                {company.email}
              </div>
              {company.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {company.phone}
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Globe className="h-4 w-4 text-slate-400" />
                  <a href={company.website} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline truncate">{company.website}</a>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-500">
                <Layers className="h-4 w-4 text-slate-400" />
                {batches.length} batches
              </div>
            </div>

            {company.description && (
              <p className="mt-4 text-sm text-slate-600 border-t border-slate-100 pt-4">{company.description}</p>
            )}

            <div className="mt-4 space-y-2">
              {!company.is_verified ? (
                <button
                  onClick={() => handleVerify(true)}
                  disabled={updating}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  Verify Company
                </button>
              ) : (
                <button
                  onClick={() => handleVerify(false)}
                  disabled={updating}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  Revoke Verification
                </button>
              )}
              <button
                onClick={handleToggleActive}
                disabled={updating}
                className={`flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium disabled:opacity-50 transition-colors ${
                  company.is_active
                    ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                {company.is_active
                  ? <><ToggleRight className="h-4 w-4" /> Deactivate</>
                  : <><ToggleLeft className="h-4 w-4" /> Activate</>
                }
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-400">Joined {formatDate(company.created_at)}</p>
          </div>
        </div>

        {/* Batches */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-semibold text-slate-900">Batches</h2>
          {batches.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 text-center">
              <p className="text-sm text-slate-400">No batches yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map((b) => (
                <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{b.name}</p>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{b.program?.name} · {b.program?.type}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(b.start_date)} — {formatDate(b.end_date)}</p>
                    </div>
                    <Link to={`/admin/batches/${b.id}`} className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                      View
                    </Link>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-slate-500">
                    <span>{formatCurrency(b.certificate_price)} per cert</span>
                    <span>{b._count?.orders || 0} orders</span>
                    <span>{b._count?.certificates || 0} certs issued</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
