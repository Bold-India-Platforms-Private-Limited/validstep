import { useParams } from 'react-router-dom'
import { Download, Award, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGetUserCertificatesQuery } from '../../store/api/userApi'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatDate } from '../../utils/formatDate'
import axiosClient from '../../api/axiosClient'

export default function CertificateView() {
  const { id } = useParams()
  const { data: cert, isLoading } = useGetUserCertificatesQuery(id)

  const handleDownload = async () => {
    try {
      const response = await axiosClient.get(`/user/certificates/${id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `certificate-${cert?.serial_number || id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Downloaded!')
    } catch {
      toast.error('Download failed')
    }
  }

  if (isLoading) return <PageSpinner />
  if (!cert) return <div className="p-8 text-center text-slate-500">Certificate not found</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Certificate Details</h1>

      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100">
              <Award className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{cert.user?.name}</p>
              <p className="text-slate-500 mt-1">has successfully completed</p>
              <p className="text-xl font-semibold text-primary-600 mt-2">{cert.batch?.name}</p>
              <p className="text-slate-500">{cert.batch?.company?.name}</p>
            </div>
            <div className="flex items-center gap-2 font-mono text-sm bg-slate-100 text-slate-700 px-4 py-2 rounded-lg">
              {cert.serial_number}
            </div>
            <p className="text-sm text-slate-500">
              {formatDate(cert.batch?.start_date)} — {formatDate(cert.batch?.end_date)}
            </p>
            <p className="text-sm text-slate-400">Issued on {formatDate(cert.issued_at)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-center">
        <Button onClick={handleDownload} leftIcon={<Download className="h-4 w-4" />}>
          Download PDF
        </Button>
        {cert.verification_hash && (
          <a
            href={`${import.meta.env.VITE_APP_URL}/verify/${cert.verification_hash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" leftIcon={<ExternalLink className="h-4 w-4" />}>
              Verify Certificate
            </Button>
          </a>
        )}
      </div>
    </div>
  )
}
