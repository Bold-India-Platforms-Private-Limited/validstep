import { Loader2 } from 'lucide-react'

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin text-primary-600 ${className}`} />
}

export function PageSpinner() {
  return (
    <div className="flex min-h-[300px] items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  )
}
