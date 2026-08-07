interface ProgressBarProps {
  label: string
  value: number
  max: number
  color?: string
  formatValue?: (v: number) => string
}

export function ProgressBar({ label, value, max, color = 'bg-primary-500', formatValue = (v) => String(v) }: ProgressBarProps) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-300 truncate" title={label}>{label}</span>
        <span className="font-medium text-gray-900 dark:text-white">{formatValue(value)}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
