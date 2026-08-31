export const TP_MOTION_EASE = [0.22, 1, 0.36, 1];

export const TP_MOTION_TRANSITIONS = {
  micro: { duration: 0.15, ease: TP_MOTION_EASE },
  panel: { duration: 0.18, ease: TP_MOTION_EASE },
  spring: { type: 'spring', stiffness: 460, damping: 36, mass: 0.55 }
};

export const TP_TAB_CONTENT_MOTION = {
  initial: { opacity: 0, y: 7 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 },
  transition: TP_MOTION_TRANSITIONS.panel
};
