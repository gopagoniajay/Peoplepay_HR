export default function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeType = 'positive',
  description,
  color = '#5554aa',
  bgColor = '#f0f0ff',
  badgeText,
  badgePositive = true,
  progress = null // optional number 0-100
}) {
  const isPositive = changeType === 'positive';

  return (
    <div
      className="card card-interactive"
      style={{
        padding: '22px 24px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Top Accent Gradient Line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: `linear-gradient(90deg, ${color} 0%, transparent 80%)`
      }} />

      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}>
              {title}
            </span>
            {badgeText && (
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontWeight: 600,
                  backgroundColor: badgePositive ? '#f0fdf4' : '#fff1f2',
                  color: badgePositive ? '#15803d' : '#be123c',
                  border: `1px solid ${badgePositive ? '#bbf7d0' : '#fecdd3'}`
                }}
              >
                {badgeText}
              </span>
            )}
          </div>

          {Icon && (
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: bgColor || `${color}14`,
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: `1px solid ${color}22`,
              boxShadow: `0 4px 12px ${color}10`
            }}>
              <Icon size={20} />
            </div>
          )}
        </div>

        <div style={{
          fontSize: '1.95rem',
          fontWeight: 800,
          color: '#0f172a',
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {value}
        </div>

        {/* Optional Progress Bar (e.g. for Satisfaction, Attendance) */}
        {progress !== null && (
          <div style={{ marginTop: '12px' }}>
            <div style={{
              height: '6px',
              width: '100%',
              backgroundColor: '#f0eef6',
              borderRadius: '999px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(Math.max(progress, 0), 100)}%`,
                backgroundColor: color,
                borderRadius: '999px',
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        )}
      </div>

      {(change || description) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.78rem',
          paddingTop: '14px',
          marginTop: '12px',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          {change && (
            <span style={{
              fontWeight: 700,
              color: isPositive ? '#15803d' : '#be123c',
              backgroundColor: isPositive ? '#f0fdf4' : '#fff1f2',
              border: isPositive ? '1px solid #bbf7d0' : '1px solid #fecdd3',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.72rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px'
            }}>
              {isPositive ? '↑' : '↓'} {change}
            </span>
          )}
          {description && (
            <span style={{ color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
