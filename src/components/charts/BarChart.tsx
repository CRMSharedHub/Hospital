interface BarChartProps {
  data: { label: string; value: number; color?: string }[]
  height?: number
  formatValue?: (v: number) => string
}

export function BarChart({ data, height = 200, formatValue = (v) => String(v) }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="flex items-end justify-between gap-3" style={{ height }}>
      {data.map((item, idx) => {
        const percent = max > 0 ? Math.round((item.value / max) * 100) : 0
        return (
          <div key={idx} className="flex flex-col items-center gap-2 flex-1 h-full">
            <div className="flex-1 w-full flex items-end justify-center relative group">
              <div
                style={{ height: `${percent}%` }}
                className={`w-full max-w-[40px] min-h-[2px] rounded-t-lg transition-all opacity-90 hover:opacity-100 ${item.color || 'bg-gradient-to-t from-primary-600 to-primary-400'}`}
              />
              <span className="absolute -top-5 text-xs font-medium text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {formatValue(item.value)}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 text-center truncate w-full" title={item.label}>
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
