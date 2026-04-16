import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Building2, Mail, Phone, Globe,
  ToggleLeft, ToggleRight, BookOpen, Layers,
  ChevronDown, ChevronRight, ExternalLink,
} from 'lucide-react'
import { useGetAdminCompanyQuery, useUpdateCompanyStatusMutation } from '../../store/api/adminApi'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { CompanyStatusBadge, BatchStatusBadge, Badge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatDate } from '../../utils/formatDate'

const TYPE_LABELS = {
  INTERNSHIP: 'Internship / Fellowship',
  COURSE: 'Course',
  PARTICIPATION: 'Participation',
  HACKATHON: 'Hackathon',
  OTHER: 'Other',
}

const TYPE_VARIANTS = {
  INTERNSHIP: 'primary',
  COURSE: 'success',
  PARTICIPATION: 'info',
  HACKATHON: 'warning',
  OTHER: 'default',
}

function ProgramRow({ program, companyId }) {
  const [expanded, setExpanded] = useState(true)
  const batches = program.batches || []

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Program header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100 transition-colors"
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100">
          <BookOpen className="h-4 w-4 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">{program.name}</span>
            <Badge variant={TYPE_VARIANTS[program.type] || 'default'}>
              {TYPE_LABELS[program.type] || program.type}
            </Badge>
          </div>
          {program.description && (
            <p className="mt-0.5 text-xs text-slate-500 truncate">{program.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-slate-400">{batches.length} batch{batches.length !== 1 ? 'es' : ''}</span>
          {expanded
            ? <ChevronDown className="h-4 w-4 text-slate-400" />
            : <ChevronRight className="h-4 w-4 text-slate-400" />
          }
        </div>
      </button>

      {/* Batches list */}
      {expanded && (
        <div className="divide-y divide-slate-100">
          {batches.length === 0 ? (
            <div className="px-6 py-4 text-sm text-slate-400 italic">No batches in this program</div>
          ) : (
            batches.map((batch) => (
              <div key={batch.id} className="flex items-center gap-4 px-4 py-3 pl-14 hover:bg-slate-50 transition-colors">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <Layers className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">{batch.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(batch.start_date)} — {formatDate(batch.end_date)}
                    {' · '}
                    {batch._count?.orders || 0} orders
                    {' · '}
                    {batch._count?.certificates || 0} certs
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <BatchStatusBadge status={batch.status} />
                  <Link
                    to={`/admin/batches/${batch.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Batch
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminCompanyDetail() {
  const { id } = useParams()
  const { data: company, isLoading } = useGetAdminCompanyQuery(id)
  const [toggleStatus, { isLoading: toggling }] = useUpdateCompanyStatusMutation()

  const handleToggle = async () => {
    try {
      await toggleStatus({ id, is_active: !company.is_active }).unwrap()
      toast.success(`Company ${company.is_active ? 'deactivated' : 'activated'}`)
    } catch (err) {
      toast.error(err?.data?.message || 'Failed')
    }
  }

  if (isLoading) return <PageSpinner />
  if (!company) return <div className="p-8 text-center text-slate-500">Company not found</div>

  const programs = company.programs || []
  const totalBatches = programs.reduce((sum, p) => sum + (p.batches?.length || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/admin/companies"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Companies
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="h-10 w-10 rounded-lg object-contain" />
              ) : (
                <Building2 className="h-6 w-6 text-slate-600" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <CompanyStatusBadge isActive={company.is_active} />
                {company.is_verified && <Badge variant="success">Verified</Badge>}
              </div>
            </div>
          </div>
          <Button
            variant={company.is_active ? 'danger' : 'success'}
            size="sm"
            isLoading={toggling}
            onClick={handleToggle}
            leftIcon={company.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
          >
            {company.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </div>

      {/* Stats + Info row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Company info */}
        <Card>
          <CardHeader><CardTitle>Company Info</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="text-sm font-medium text-slate-700">{company.email}</p>
                </div>
              </div>
              {company.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400">Phone</p>
                    <p className="text-sm font-medium text-slate-700">{company.phone}</p>
                  </div>
                </div>
              )}
              {company.website && (
                <div className="flex items-start gap-2">
                  <Globe className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400">Website</p>
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary-600 hover:underline"
                    >
                      {company.website}
                    </a>
                  </div>
                </div>
              )}
              {company.description && (
                <div>
                  <p className="text-xs text-slate-400">About</p>
                  <p className="text-sm text-slate-600">{company.description}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400">Member since</p>
                <p className="text-sm font-medium text-slate-700">{formatDate(company.created_at)}</p>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <div className="lg:col-span-2 grid grid-cols-3 gap-4 content-start">
          {[
            { label: 'Programs', value: programs.length, color: 'primary' },
            { label: 'Batches', value: company._count?.batches ?? totalBatches, color: 'slate' },
            { label: 'Orders', value: company._count?.orders || 0, color: 'emerald' },
            { label: 'Certificates', value: company._count?.certificates || 0, color: 'amber' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl border border-${color}-200 bg-${color}-50 p-4`}>
              <p className={`text-sm text-${color}-600`}>{label}</p>
              <p className={`mt-1 text-2xl font-bold text-${color}-800`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Programs → Batches drill-down */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Programs &amp; Batches
          </h2>
          <span className="text-sm text-slate-500">
            {programs.length} program{programs.length !== 1 ? 's' : ''} · {totalBatches} batch{totalBatches !== 1 ? 'es' : ''}
          </span>
        </div>

        {programs.length === 0 ? (
          <Card>
            <CardContent>
              <div className="py-10 text-center">
                <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-400">No programs created yet</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {programs.map((program) => (
              <ProgramRow key={program.id} program={program} companyId={id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
