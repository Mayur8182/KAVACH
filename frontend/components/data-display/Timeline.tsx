import React from 'react';

export interface TimelineItem {
  id: string;
  timestamp: string;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actor?: string;
  type?: 'default' | 'danger' | 'warning' | 'success' | 'info';
}

interface TimelineProps {
  items: TimelineItem[];
  emptyMessage?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ items, emptyMessage = 'No activity recorded' }) => {
  if (!items || items.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', position: 'relative' }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        let dotColor = 'var(--color-primary)';
        if (item.type === 'danger') dotColor = 'var(--color-danger)';
        else if (item.type === 'warning') dotColor = 'var(--color-warning)';
        else if (item.type === 'success') dotColor = 'var(--color-success)';
        else if (item.type === 'info') dotColor = 'var(--color-info)';

        return (
          <div key={item.id} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
            {/* Vertical connector line & dot */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px', flexShrink: 0 }}>
              <div
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  backgroundColor: dotColor,
                  marginTop: '4px',
                  boxShadow: `0 0 0 2px var(--color-bg), 0 0 8px ${dotColor}80`,
                  zIndex: 2,
                }}
              />
              {!isLast && (
                <div
                  style={{
                    width: '1px',
                    flexGrow: 1,
                    backgroundColor: 'var(--color-border)',
                    margin: '4px 0',
                  }}
                />
              )}
            </div>

            {/* Event Content */}
            <div style={{ paddingBottom: isLast ? '0px' : '20px', flexGrow: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'var(--weight-medium)', color: 'var(--color-text-primary)' }}>
                    {item.title}
                  </span>
                  {item.badge}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {item.timestamp}
                </span>
              </div>

              {item.description && (
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                  {item.description}
                </div>
              )}

              {item.actor && (
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Actor: <code style={{ color: 'var(--color-text-primary)' }}>{item.actor}</code>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
