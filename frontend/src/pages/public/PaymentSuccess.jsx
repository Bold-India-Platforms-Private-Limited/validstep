import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import axiosClient from '../../api/axiosClient'
import toast from 'react-hot-toast'

export default function PaymentSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('verifying') // verifying | success | error

  useEffect(() => {
    const verifyAndRedirect = async () => {
      try {
        // Pass all query params to backend for verification
        const params = Object.fromEntries(searchParams.entries())
        await axiosClient.post('/payment/verify', params)
        setStatus('success')
        toast.success('Payment successful! Your order is confirmed.')
        setTimeout(() => navigate('/dashboard'), 2500)
      } catch {
        setStatus('error')
        toast.error('Payment verification failed. Please contact support.')
        setTimeout(() => navigate('/dashboard'), 3000)
      }
    }
    verifyAndRedirect()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-md">
        {status === 'verifying' && (
          <>
            <Loader2 className="mx-auto mb-4 h-14 w-14 animate-spin text-primary-600" />
            <h2 className="text-xl font-bold text-slate-800">Verifying Payment...</h2>
            <p className="mt-2 text-slate-500">Please wait while we confirm your payment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-700">Payment Successful!</h2>
            <p className="mt-2 text-slate-500">Your certificate order has been placed.</p>
            <p className="mt-4 text-sm text-slate-400">Redirecting to your dashboard...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <CheckCircle2 className="h-10 w-10 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-amber-700">Verification Issue</h2>
            <p className="mt-2 text-slate-500">
              We couldn't verify your payment. If you were charged, please contact support.
            </p>
            <p className="mt-4 text-sm text-slate-400">Redirecting to dashboard...</p>
          </>
        )}
      </div>
    </div>
  )
}
