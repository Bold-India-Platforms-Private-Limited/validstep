import { useNavigate } from 'react-router-dom'
import { XCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '../../components/ui/Button'

export default function PaymentFailure() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-md">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <XCircle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Payment Failed</h2>
        <p className="mt-3 text-slate-500">
          Your payment could not be processed. No amount has been deducted from your account.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          You can try again from your dashboard.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button
            onClick={() => navigate('/dashboard')}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Go to Dashboard & Retry
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            leftIcon={<Home className="h-4 w-4" />}
          >
            Go to Homepage
          </Button>
        </div>
      </div>
    </div>
  )
}
