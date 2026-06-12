import React from 'react';

const AmbientMotionLayer = ({ variant = 'default' }) => (
  <div className={`tp-motion-layer tp-motion-layer-${variant}`} aria-hidden="true">
    <span className="tp-motion-route tp-motion-route-main">
      <span />
    </span>
    <span className="tp-motion-route tp-motion-route-soft">
      <span />
    </span>
    <span className="tp-motion-plane" />
    <span className="tp-motion-ticket tp-motion-ticket-a" />
    <span className="tp-motion-ticket tp-motion-ticket-b" />
    <span className="tp-motion-spark tp-motion-spark-a" />
    <span className="tp-motion-spark tp-motion-spark-b" />
  </div>
);

export default AmbientMotionLayer;
