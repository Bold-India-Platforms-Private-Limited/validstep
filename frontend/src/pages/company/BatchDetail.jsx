import { useState, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Copy, ExternalLink, Settings, ShoppingBag, Award, Palette,
  Upload, Eye, Save, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  CheckCircle2, Clock,
} from 'lucide-react'
import {
  useGetBatchQuery, useUpdateBatchMutation,
  useGetBatchOrdersQuery, useGetBatchTemplatesQuery,
  useSaveTemplateMutation, useIssueCertificatesMutation,
} from '../../store/api/batchApi'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { StatusBadge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { formatDate } from '../../utils/formatDate'
import axiosClient from '../../api/axiosClient'

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin
const API_URL = import.meta.env.VITE_API_URL || '/api'

const TABS = ['Overview', 'Orders', 'Template Builder', 'Settings']

// Default layout config for the certificate builder
const DEFAULT_LAYOUT = {
  companyName:  { x: 50, y: 20, fontSize: 22, color: '#1a237e', align: 'center', bold: true,  visible: true, label: 'Company Name' },
  programType:  { x: 50, y: 31, fontSize: 14, color: '#555555', align: 'center', bold: false, visible: true, label: 'Program Type / Role' },
  subtitle:     { x: 50, y: 42, fontSize: 11, color: '#777777', align: 'center', bold: false, visible: true, label: '"This is to certify that"' },
  name:         { x: 50, y: 54, fontSize: 38, color: '#111111', align: 'center', bold: true,  visible: true, label: 'Participant Name' },
  dates:        { x: 50, y: 67, fontSize: 13, color: '#444444', align: 'center', bold: false, visible: true, label: 'Duration Dates' },
  serial:       { x: 8,  y: 90, fontSize: 9,  color: '#888888', align: 'left',   bold: false, visible: true, label: 'Certificate ID' },
  verification: { x: 50, y: 94, fontSize: 8,  color: '#999999', align: 'center', bold: false, visible: false, label: 'Verification URL' },
  qrCode:       { x: 90, y: 83, size: 70, visible: true, label: 'QR Code' },
  logo:         { x: 50, y: 10, width: 80, height: 50, visible: false, label: 'Company Logo' },
}

// Live preview of the certificate (A4 landscape, scaled down)
function CertPreview({ layout, bgUrl, accentColor, bgColor, companyName }) {
  const W = 842, H = 595 // A4 pts reference
  const scale = 1 // we use CSS transform
  const px = (pct) => `${pct}%`
  const py = (pct) => `${pct}%`

  const elements = [
    { key: 'companyName', text: companyName || 'Company Name', style: { fontSize: layout.companyName.fontSize * 0.55 } },
    { key: 'programType', text: 'Certificate of Internship — Role', style: { fontSize: layout.programType.fontSize * 0.55 } },
    { key: 'subtitle',    text: 'This is to certify that', style: { fontSize: layout.subtitle.fontSize * 0.55 } },
    { key: 'name',        text: 'Participant Name', style: { fontSize: layout.name.fontSize * 0.55 } },
    { key: 'dates',       text: '01 Jan 2025 — 30 Jun 2025', style: { fontSize: layout.dates.fontSize * 0.55 } },
    { key: 'serial',      text: 'Certificate ID: CERT-0001', style: { fontSize: layout.serial.fontSize * 0.55 } },
    { key: 'verification',text: 'Verify: validstep.com/verify/abc123', style: { fontSize: layout.verification.fontSize * 0.55 } },
  ]

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-slate-300 shadow-md"
      style={{ aspectRatio: `${W}/${H}`, background: bgColor || '#fff' }}
    >
      {bgUrl && (
        <img src={bgUrl} alt="bg" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {!bgUrl && (
        <>
          <div className="absolute inset-x-0 top-0 h-[8%]" style={{ background: accentColor || '#1a237e' }} />
          <div className="absolute inset-x-0 bottom-0 h-[5%]" style={{ background: accentColor || '#1a237e' }} />
        </>
      )}

      {elements.map(({ key, text, style }) => {
        const el = layout[key]
        if (!el?.visible) return null
        return (
          <div
            key={key}
            className="absolute pointer-events-none whitespace-nowrap"
            style={{
              left: px(el.x),
              top: py(el.y),
              fontSize: style.fontSize,
              color: el.color,
              fontWeight: el.bold ? 700 : 400,
              transform: el.align === 'center' ? 'translateX(-50%)' : el.align === 'right' ? 'translateX(-100%)' : 'none',
            }}
          >
            {text}
          </div>
        )
      })}

      {layout.qrCode?.visible && (
        <div
          className="absolute border border-slate-300 bg-white flex items-center justify-center"
          style={{
            left: px(layout.qrCode.x),
            top: py(layout.qrCode.y),
            width: layout.qrCode.size * 0.55,
            height: layout.qrCode.size * 0.55,
            transform: 'translate(-50%, -50%)',
            fontSize: 8,
            color: '#999',
          }}
        >
          QR
        </div>
      )}
    </div>
  )
}

// Controls for a single element
function ElementRow({ elKey, el, onChange }) {
  const [expanded, setExpanded] = useState(false)
  const isImage = elKey === 'qrCode' || elKey === 'logo'

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(elKey, { visible: !el.visible })}
            className="text-slate-500 hover:text-primary-600 transition-colors"
            title={el.visible ? 'Hide' : 'Show'}
          >
            {el.visible ? <ToggleRight className="h-5 w-5 text-primary-600" /> : <ToggleLeft className="h-5 w-5" />}
          </button>
          <span className="text-xs font-medium text-slate-700">{el.label}</span>
        </div>
        <button type="button" onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && el.visible && (
        <div className="border-t border-slate-200 bg-white px-3 py-3 grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">X Position (%)</label>
            <input type="range" min="0" max="100" value={el.x || 50}
              onChange={(e) => onChange(elKey, { x: +e.target.value })}
              className="w-full h-1.5 accent-primary-600" />
            <span className="text-xs text-slate-400">{el.x || 50}%</span>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Y Position (%)</label>
            <input type="range" min="0" max="100" value={el.y || 50}
              onChange={(e) => onChange(elKey, { y: +e.target.value })}
              className="w-full h-1.5 accent-primary-600" />
            <span className="text-xs text-slate-400">{el.y || 50}%</span>
          </div>

          {!isImage && (
            <>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Font Size (pt)</label>
                <input type="number" min="6" max="72" value={el.fontSize || 12}
                  onChange={(e) => onChange(elKey, { fontSize: +e.target.value })}
                  className="w-full rounded border border-slate-200 px-2 py-1 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Color</label>
                <input type="color" value={el.color || '#000000'}
                  onChange={(e) => onChange(elKey, { color: e.target.value })}
                  className="h-7 w-full cursor-pointer rounded border border-slate-200" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Align</label>
                <select value={el.align || 'center'} onChange={(e) => onChange(elKey, { align: e.target.value })}
                  className="w-full rounded border border-slate-200 px-2 py-1 text-xs">
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">Bold</label>
                <input type="checkbox" checked={!!el.bold} onChange={(e) => onChange(elKey, { bold: e.target.checked })}
                  className="accent-primary-600" />
              </div>
            </>
          )}

          {isImage && (
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Size (px)</label>
              <input type="number" min="20" max="200" value={el.size || 70}
                onChange={(e) => onChange(elKey, { size: +e.target.value })}
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Template Builder Tab ───────────────────────────────────────────────────
function TemplateBuilder({ batchId, batchName, companyName }) {
  const { data: templates } = useGetBatchTemplatesQuery(batchId)
  const activeTemplate = templates?.find((t) => t.is_active)
  const [saveTemplate, { isLoading: saving }] = useSaveTemplateMutation()

  const [templateName, setTemplateName] = useState(activeTemplate?.template_name || 'Custom Template')
  const [templateType, setTemplateType] = useState(activeTemplate?.template_type || 'CUSTOM')
  const [bgColor, setBgColor] = useState(activeTemplate?.background_color || '#FFFFFF')
  const [accentColor, setAccentColor] = useState(activeTemplate?.accent_color || '#1a237e')
  const [customText, setCustomText] = useState(activeTemplate?.custom_text || '')
  const [bgUrl, setBgUrl] = useState(activeTemplate?.background_image_url || '')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const [layout, setLayout] = useState(() => {
    const saved = activeTemplate?.layout_config
    if (saved && typeof saved === 'object') {
      const merged = { ...DEFAULT_LAYOUT }
      for (const [k, v] of Object.entries(saved)) {
        merged[k] = { ...DEFAULT_LAYOUT[k], ...v }
      }
      return merged
    }
    return { ...DEFAULT_LAYOUT }
  })

  const handleElementChange = useCallback((key, patch) => {
    setLayout((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }, [])

  const handleBgUpload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('background', file)
      const res = await axiosClient.post(`/company/batches/${batchId}/templates/upload-background`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = res.data?.data?.url || res.data?.url
      setBgUrl(url)
      setTemplateType('CUSTOM')
      toast.success('Background uploaded!')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed')
    } finally { setUploading(false) }
  }

  const handleSave = async () => {
    try {
      // Strip label from layout before saving to reduce payload
      const cleanLayout = {}
      for (const [k, v] of Object.entries(layout)) {
        const { label, ...rest } = v
        cleanLayout[k] = rest
      }
      await saveTemplate({
        batchId,
        template_name: templateName,
        template_type: templateType,
        background_color: bgColor,
        accent_color: accentColor,
        custom_text: customText,
        background_image_url: bgUrl,
        layout_config: cleanLayout,
      }).unwrap()
      toast.success('Template saved!')
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save')
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Controls - left panel */}
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Palette className="h-4 w-4" />Template Settings</h3>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Template Name</label>
            <input value={templateName} onChange={(e) => setTemplateName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Base Style</label>
            <select value={templateType} onChange={(e) => setTemplateType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="CLASSIC">Classic</option>
              <option value="MODERN">Modern</option>
              <option value="MINIMAL">Minimal</option>
              <option value="CUSTOM">Custom (use background image)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Accent Color</label>
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
                className="h-9 w-full cursor-pointer rounded-lg border border-slate-300" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Background Color</label>
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                className="h-9 w-full cursor-pointer rounded-lg border border-slate-300" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Additional Text</label>
            <textarea value={customText} onChange={(e) => setCustomText(e.target.value)} rows={2}
              placeholder="Optional text shown on certificate"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>

          {/* Background image upload */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700">Background Image (JPG/PNG)</label>
            {bgUrl && (
              <div className="flex items-center gap-2">
                <img src={bgUrl} alt="bg" className="h-12 w-20 rounded-lg object-cover border border-slate-200" />
                <button onClick={() => setBgUrl('')} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden"
              onChange={(e) => handleBgUpload(e.target.files?.[0])} />
            <Button
              variant="secondary" size="sm"
              leftIcon={<Upload className="h-3.5 w-3.5" />}
              isLoading={uploading}
              onClick={() => fileRef.current?.click()}
              className="w-full"
            >
              {uploading ? 'Uploading…' : bgUrl ? 'Replace Background' : 'Upload Background'}
            </Button>
            <p className="text-xs text-slate-400">Max 10 MB. Use "CUSTOM" style to show this image.</p>
          </div>
        </div>

        {/* Element position controls */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-slate-900">Element Positions</h3>
          <div className="space-y-2">
            {Object.entries(layout).map(([key, el]) => (
              <ElementRow key={key} elKey={key} el={el} onChange={handleElementChange} />
            ))}
          </div>
        </div>

        <Button onClick={handleSave} isLoading={saving} className="w-full" leftIcon={<Save className="h-4 w-4" />}>
          Save Template
        </Button>
      </div>

      {/* Preview - right panel */}
      <div className="lg:col-span-3 space-y-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Live Preview (A4 Landscape)</span>
          <span className="text-xs text-slate-400">— Actual PDF may vary slightly</span>
        </div>
        <CertPreview
          layout={layout}
          bgUrl={templateType === 'CUSTOM' ? bgUrl : ''}
          accentColor={accentColor}
          bgColor={bgColor}
          companyName={companyName}
        />
        <p className="text-xs text-slate-400 text-center">
          Positions are shown as percentages of the A4 landscape canvas (842 × 595 pt).
          Drag the sliders to reposition elements.
        </p>
      </div>
    </div>
  )
}

// ─── Orders Tab ─────────────────────────────────────────────────────────────
function OrdersTab({ batchId }) {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState([])
  const { data, isLoading, refetch } = useGetBatchOrdersQuery({ id: batchId, page, limit: 50 })
  const [issue, { isLoading: issuing }] = useIssueCertificatesMutation()
  const orders = data?.orders || []
  const pagination = data?.pagination

  const paidOrders = orders.filter((o) => o.status === 'PAID' && !o.certificate?.is_issued)
  const allSelected = paidOrders.length > 0 && paidOrders.every((o) => selected.includes(o.id))

  const toggleAll = () => setSelected(allSelected ? [] : paidOrders.map((o) => o.id))
  const toggleOne = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])

  const handleIssue = async () => {
    if (selected.length === 0) return toast.error('Select at least one paid order')
    try {
      const res = await issue({ batchId, order_ids: selected }).unwrap()
      toast.success(`${res.filter?.((r) => r.status !== 'already_issued').length || selected.length} certificate(s) queued`)
      setSelected([])
      refetch()
    } catch (err) { toast.error(err?.data?.message || 'Failed to issue') }
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      {selected.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-primary-50 border border-primary-200 px-4 py-3">
          <p className="text-sm font-medium text-primary-800">{selected.length} order(s) selected</p>
          <Button size="sm" onClick={handleIssue} isLoading={issuing} leftIcon={<Award className="h-3.5 w-3.5" />}>
            Issue Certificates
          </Button>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <ShoppingBag className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No orders yet</p>
          <p className="text-sm text-slate-400 mt-1">Share your batch link to start receiving orders</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-primary-600" />
                </th>
                {['Name', 'Email', 'Amount', 'Status', 'Certificate', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.map((o) => {
                const canSelect = o.status === 'PAID' && !o.certificate?.is_issued
                return (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      {canSelect && (
                        <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggleOne(o.id)} className="accent-primary-600" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{o.user?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{o.user?.email}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">₹{parseFloat(o.amount || 0).toFixed(0)}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3">
                      {o.certificate?.is_issued ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />Issued</span>
                      ) : o.status === 'PAID' ? (
                        <span className="flex items-center gap-1 text-xs text-amber-600"><Clock className="h-3.5 w-3.5" />Pending</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDate(o.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {pagination?.pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">Page {page} of {pagination.pages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-slate-50">Prev</button>
                <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-slate-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Settings Tab ───────────────────────────────────────────────────────────
function SettingsTab({ batch }) {
  const [updateBatch, { isLoading }] = useUpdateBatchMutation()
  const [status, setStatus] = useState(batch.status)

  const handleStatusUpdate = async () => {
    try {
      await updateBatch({ id: batch.id, status }).unwrap()
      toast.success('Status updated')
    } catch (err) { toast.error(err?.data?.message || 'Failed') }
  }

  return (
    <div className="max-w-md space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-900">Batch Status</h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="DRAFT">Draft (hidden)</option>
              <option value="ACTIVE">Active (accepting payments)</option>
              <option value="HOLD">Hold (temporarily paused)</option>
              <option value="COMPLETED">Completed (closed)</option>
            </select>
          </div>
          <p className="text-xs text-slate-400">
            Batch links remain accessible until you set status to HOLD or COMPLETED.
            HOLD shows a "temporarily paused" message. COMPLETED fully closes the batch.
          </p>
          <Button onClick={handleStatusUpdate} isLoading={isLoading} size="sm">Update Status</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main BatchDetail Component ─────────────────────────────────────────────
export default function BatchDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Overview')

  const { data: batch, isLoading } = useGetBatchQuery(id)

  if (isLoading) return <PageSpinner />
  if (!batch) return <div className="p-8 text-center text-slate-500">Batch not found</div>

  const batchLink = `${APP_URL}/order/${batch.unique_slug}`

  const copyLink = () => { navigator.clipboard.writeText(batchLink); toast.success('Link copied!') }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/company/batches')} className="mt-1 rounded-lg p-2 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{batch.name}</h1>
            <StatusBadge status={batch.status} />
          </div>
          <p className="text-sm text-slate-500">{batch.program?.name} · {batch.program?.type} · {formatDate(batch.start_date)} — {formatDate(batch.end_date)}</p>
        </div>
      </div>

      {/* Batch link */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-slate-600">{batchLink}</span>
        <button onClick={copyLink} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-500" title="Copy">
          <Copy className="h-4 w-4" />
        </button>
        <a href={batchLink} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-500" title="Open">
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Overview' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Certificate Price', value: `₹${parseFloat(batch.certificate_price).toFixed(0)}` },
            { label: 'Certificate Prefix', value: batch.id_prefix },
            { label: 'Role', value: batch.role || '—' },
            { label: 'Currency', value: batch.currency },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'Orders' && <OrdersTab batchId={id} />}

      {tab === 'Template Builder' && (
        <TemplateBuilder batchId={id} batchName={batch.name} companyName={batch.company?.name || ''} />
      )}

      {tab === 'Settings' && <SettingsTab batch={batch} />}
    </div>
  )
}
