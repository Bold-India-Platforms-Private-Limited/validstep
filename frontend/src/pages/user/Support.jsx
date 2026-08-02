import { useState } from 'react'
import {
  useGetUserOrdersQuery, useGetMyQueriesQuery, useCreateQueryMutation,
} from '../../store/api/userApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Input, Textarea, Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { formatDate } from '../../utils/formatDate'
import { MessageSquareText } from 'lucide-react'
import toast from 'react-hot-toast'

function RaiseQueryModal({ open, onClose, orders }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [orderId, setOrderId] = useState('')
  const [createQuery, { isLoading }] = useCreateQueryMutation()

  const handleClose = () => { setSubject(''); setMessage(''); setOrderId(''); onClose() }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) { toast.error('Subject and message are required'); return }
    try {
      await createQuery({ subject, message, ...(orderId && { order_id: orderId }) }).unwrap()
      toast.success('Query submitted — our team will get back to you')
      handleClose()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to submit query')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Raise a Query">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-500">Have a question, or need a correction on your certificate details? Let us know.</p>
        {orders.length > 0 && (
          <Select label="Related Order (optional)" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
            <option value="">Not related to a specific order</option>
            {orders.map((o) => <option key={o.id} value={o.id}>{o.batch?.name} — {o.certificate_serial}</option>)}
          </Select>
        )}
        <Input label="Subject" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Name spelled incorrectly on certificate" />
        <Textarea label="Message" required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your query or correction request..." />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Submit</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function UserSupport() {
  const [showQuery, setShowQuery] = useState(false)
  const { data: orders, isLoading: ordersLoading } = useGetUserOrdersQuery()
  const { data: myQueries, isLoading: queriesLoading } = useGetMyQueriesQuery()
  const orderList = orders?.orders || []

  if (ordersLoading || queriesLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support</h1>
          <p className="text-sm text-slate-500">Queries & correction requests</p>
        </div>
        <button
          onClick={() => setShowQuery(true)}
          className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors"
        >
          Raise a Query
        </button>
      </div>

      {(myQueries?.queries || []).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <MessageSquareText className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No queries raised yet</p>
          <p className="mt-1 text-sm text-slate-400">Questions or correction requests will appear here</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {myQueries.queries.map((q) => (
            <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">{q.subject}</p>
                <Badge variant={q.status === 'OPEN' ? 'warning' : 'success'}>{q.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">{q.message}</p>
              <p className="mt-2 text-xs text-slate-400">
                {formatDate(q.created_at)}
                {q.order?.batch?.name && ` · ${q.order.batch.name}`}
              </p>
            </div>
          ))}
        </div>
      )}

      <RaiseQueryModal open={showQuery} onClose={() => setShowQuery(false)} orders={orderList} />
    </div>
  )
}
