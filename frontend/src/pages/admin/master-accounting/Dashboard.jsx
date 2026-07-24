import { useState } from 'react'
import {
  useGetBrandPnLQuery, useGetTrendQuery, useGetTrendByTypeQuery, useGetCategorySummaryQuery, useGetBrandsQuery,
  useGetGatewayChargesTrendQuery,
} from '../../../store/api/masterAccountingApi'
import { PageSpinner } from '../../../components/ui/Spinner'
import { Badge } from '../../../components/ui/Badge'
import { GroupedBarChart } from '../../../components/ui/GroupedBarChart'
import { formatCurrency } from '../../../utils/formatDate'
import { useCAMode, useMasterAccountingFilter } from '../../../components/layouts/MasterAccountingLayout'

// Validated categorical pair (node scripts/validate_palette.js "#008300,#e34948" --mode light
// passes lightness/chroma/CVD/contrast) — matches the credit=green, debit=red convention
// already used in the tables on this page, so the same data never wears two different colors.
const REVENUE_COLOR = '#008300'
const EXPENSE_COLOR = '#e34948'

const GRANULARITIES = [
  { value: 'month', label: 'Monthly' },
  { value: 'quarter', label: 'Quarterly' },
  { value: 'half-year', label: 'Half-Yearly' },
  { value: 'fy', label: 'Financial Year' },
]

function SummaryCard({ label, value, sub, tone = 'default' }) {
  const toneClass = tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-red-600' : 'text-slate-900'
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${toneClass}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

export default function MasterAccountingDashboard() {
  const caMode = useCAMode()
  const { from, to } = useMasterAccountingFilter()
  const [trendGranularity, setTrendGranularity] = useState('month')

  const params = { from: from || undefined, to: to || undefined }
  const { data: pnl, isLoading: pnlLoading } = useGetBrandPnLQuery(params)
  const { data: trend, isLoading: trendLoading } = useGetTrendQuery({ ...params, granularity: trendGranularity })
  const { data: categories, isLoading: catLoading } = useGetCategorySummaryQuery(params, { skip: caMode })
  const { data: brands } = useGetBrandsQuery()

  const validstepId = brands?.find((b) => b.code === 'VALIDSTEP')?.id
  const riseflakeId = brands?.find((b) => b.code === 'RISEFLAKE')?.id

  const { data: pnlTrend, isLoading: pnlTrendLoading } = useGetTrendByTypeQuery({ ...params, granularity: trendGranularity })
  const { data: payuTrend } = useGetTrendByTypeQuery({ ...params, granularity: trendGranularity, brandId: validstepId }, { skip: !validstepId })
  const { data: rzpTrend } = useGetTrendByTypeQuery({ ...params, granularity: trendGranularity, brandId: riseflakeId }, { skip: !riseflakeId })
  const { data: payuCharges } = useGetGatewayChargesTrendQuery({ ...params, granularity: trendGranularity, gateway: 'PAYU' })
  const { data: rzpCharges } = useGetGatewayChargesTrendQuery({ ...params, granularity: trendGranularity, gateway: 'RAZORPAY' })

  const bankChartData = (trend || []).map((t) => ({ period: t.period, credit: t.credit, debit: t.debit }))
  const revenueExpenseSeries = [
    { key: 'revenue', label: 'Revenue', color: REVENUE_COLOR },
    { key: 'expense', label: 'Expense', color: EXPENSE_COLOR },
  ]
  const creditDebitSeries = [
    { key: 'credit', label: 'Credit', color: REVENUE_COLOR },
    { key: 'debit', label: 'Debit', color: EXPENSE_COLOR },
  ]
  const grossChargesSeries = [
    { key: 'gross', label: 'Gross Volume', color: REVENUE_COLOR },
    { key: 'charges', label: 'Gateway Charges', color: EXPENSE_COLOR },
  ]

  if (pnlLoading || trendLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Master Accounting Dashboard</h1>
        {(from || to) && (
          <p className="text-sm text-slate-500">
            {from || '…'} <span className="text-slate-400">to</span> {to || '…'}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Company Revenue" value={formatCurrency(pnl?.company_total?.revenue || 0)} />
        <SummaryCard label="Company Expense" value={formatCurrency(pnl?.company_total?.expense || 0)} />
        <SummaryCard
          label="Net Profit"
          value={formatCurrency(pnl?.company_total?.net_profit || 0)}
          tone={(pnl?.company_total?.net_profit || 0) >= 0 ? 'positive' : 'negative'}
        />
        {!caMode && (
          <SummaryCard
            label="Pending Classification"
            value={formatCurrency((pnl?.unclassified?.debit || 0) + (pnl?.unclassified?.credit || 0))}
            sub="Bank rows awaiting a category"
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(pnl?.by_brand || []).map((b) => (
          <div key={b.brand_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{b.brand_name}</h3>
              <Badge variant={b.net_profit >= 0 ? 'success' : 'danger'}>{formatCurrency(b.net_profit)} net</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-slate-500">Revenue</p><p className="font-semibold text-slate-900">{formatCurrency(b.revenue)}</p></div>
              <div><p className="text-xs text-slate-500">Expense</p><p className="font-semibold text-slate-900">{formatCurrency(b.expense)}</p></div>
            </div>
          </div>
        ))}
        {!caMode && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-slate-900">Shared / Company-Level Expense</h3>
            <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(pnl?.shared_expense || 0)}</p>
            <p className="mt-0.5 text-xs text-slate-500">Not attributed to a single brand (e.g. director salary, general business expenses)</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <GroupedBarChart
          title="Profit & Loss"
          subtitle="Company-wide revenue vs. expense, by period"
          data={pnlTrendLoading ? [] : pnlTrend}
          series={revenueExpenseSeries}
        />
        <GroupedBarChart
          title="Bank Credit vs. Debit"
          subtitle="Raw bank ledger movement, by period"
          data={bankChartData}
          series={creditDebitSeries}
        />
        <GroupedBarChart
          title="PayU (Validstep)"
          subtitle="Revenue vs. expense attributed to Validstep, by period"
          data={payuTrend || []}
          series={revenueExpenseSeries}
        />
        <GroupedBarChart
          title="Razorpay (RiseFlake)"
          subtitle="Revenue vs. expense attributed to RiseFlake, by period"
          data={rzpTrend || []}
          series={revenueExpenseSeries}
        />
        <GroupedBarChart
          title="PayU Gateway Charges"
          subtitle="Gross transaction volume vs. combined fees + tax + refunds + chargebacks"
          data={payuCharges || []}
          series={grossChargesSeries}
        />
        <GroupedBarChart
          title="Razorpay Gateway Charges"
          subtitle="Gross transaction volume vs. combined fees + tax + refunds"
          data={rzpCharges || []}
          series={grossChargesSeries}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="font-semibold text-slate-900">Trend</h3>
          <select value={trendGranularity} onChange={(e) => setTrendGranularity(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
            {GRANULARITIES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2 text-right">Credit</th>
                <th className="px-4 py-2 text-right">Debit</th>
                <th className="px-4 py-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {(trend || []).map((t) => (
                <tr key={t.period} className="border-b border-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-900">{t.period}</td>
                  <td className="px-4 py-2 text-right text-emerald-600">{formatCurrency(t.credit)}</td>
                  <td className="px-4 py-2 text-right text-red-600">{formatCurrency(t.debit)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-900">{formatCurrency(t.net)}</td>
                </tr>
              ))}
              {(!trend || trend.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">No bank data in this period yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!caMode && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="font-semibold text-slate-900">Category Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2 text-right">Credit</th>
                  <th className="px-4 py-2 text-right">Debit</th>
                  <th className="px-4 py-2 text-right">Rows</th>
                </tr>
              </thead>
              <tbody>
                {catLoading && <tr><td colSpan={5} className="px-4 py-6 text-center"><PageSpinner /></td></tr>}
                {(categories || []).map((c) => (
                  <tr key={c.category_id || 'unclassified'} className="border-b border-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900">{c.category_name}</td>
                    <td className="px-4 py-2">{c.category_type ? <Badge variant="default">{c.category_type}</Badge> : <Badge variant="warning">Needs Review</Badge>}</td>
                    <td className="px-4 py-2 text-right text-emerald-600">{formatCurrency(c.credit)}</td>
                    <td className="px-4 py-2 text-right text-red-600">{formatCurrency(c.debit)}</td>
                    <td className="px-4 py-2 text-right text-slate-500">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
