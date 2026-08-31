import React from 'react';

const MobileMockupFrame = ({
  icon: Icon,
  eyebrow = 'Trip module',
  title,
  subtitle,
  stats = [],
  action = null,
  tone = 'neutral',
  children,
  className = '',
  ...restProps
}) => {
  const visibleStats = stats
    .filter((item) => item && (item.value !== undefined || item.label))
    .slice(0, 4);

  return (
    <section className={`tp-mobile-feature-frame tp-mobile-feature-${tone} ${className}`} {...restProps}>
      <header className="tp-mobile-feature-header">
        <div className="tp-mobile-feature-heading">
          {Icon && (
            <span className="tp-mobile-feature-icon" aria-hidden="true">
              <Icon size={20} />
            </span>
          )}
          <div className="min-w-0">
            <span className="tp-mobile-feature-eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>

        {action && <div className="tp-mobile-feature-action">{action}</div>}

        {visibleStats.length > 0 && (
          <div className="tp-mobile-feature-stats" aria-label={`${title} summary`}>
            {visibleStats.map((item) => (
              <span key={`${item.label}-${item.value}`} className="tp-mobile-feature-stat">
                <strong>{item.value}</strong>
                <small>{item.label}</small>
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="tp-mobile-feature-body">
        {children}
      </div>
    </section>
  );
};

export default MobileMockupFrame;
