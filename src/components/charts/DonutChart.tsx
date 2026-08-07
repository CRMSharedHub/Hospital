interface DonutChartProps {
  data: { label: string; value: number; color: string }[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string
}

export function DonutChart({ data, size = 160, thickness = 24, centerLabel, centerValue }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={thickness}
            className="text-gray-100 dark:text-gray-800"
          />
          {total > 0 && data.map((item, idx) => {
            const dash = (item.value / total) * circumference
            const segment = (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            )
            offset += dash
            return segment
          })}
        </svg>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && <span className="text-2xl font-bold text-gray-900 dark:text-white">{centerValue}</span>}
            {centerLabel && <span className="text-xs text-gray-500 dark:text-gray-400">{centerLabel}</span>}
          </div>
        )}
      </div>
      <div className="space-y-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {item.value} ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
