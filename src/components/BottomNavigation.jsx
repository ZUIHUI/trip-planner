import React from 'react';
import { motion } from 'motion/react';
import {
  MOBILE_TRIP_NAV_ITEMS,
  MORE_CHILD_TAB_IDS,
  isMobileTripNavActive
} from './trip/tripNavigation';
import { TP_MOTION_TRANSITIONS } from '../utils/motionPresets';

const PresenceTabMarker = ({ count = 0 }) => {
  if (!count) return null;

  return (
    <motion.span
      className="tp-status-pulse tp-nav-presence-marker"
      title={`${count} 位旅伴在這裡`}
      aria-label={`${count} 位旅伴在這裡`}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={TP_MOTION_TRANSITIONS.spring}
    >
      {count > 1 ? count : ''}
    </motion.span>
  );
};

const BottomNavigation = ({ activeTab, onTabChange, isModalOpen = false, presenceByTab = {} }) => {
  const handleTabChange = (tabId) => {
    onTabChange(tabId);
  };

  const getMobilePresenceCount = (tabId) => {
    if (tabId === 'more') {
      return [...MORE_CHILD_TAB_IDS].reduce((total, id) => total + Number(presenceByTab?.[id] || 0), 0);
    }

    return Number(presenceByTab?.[tabId] || 0);
  };

  return (
    <>
      <nav
        className={`tp-ambient-dock tp-bottom-nav tp-atlas-dock ${
          isModalOpen ? 'pointer-events-none translate-y-full opacity-0' : 'pointer-events-auto translate-y-0 opacity-100'
        }`}
        aria-label="主要功能導覽"
      >
        <div className="tp-atlas-dock-track tp-bottom-nav-mobile-track">
          {MOBILE_TRIP_NAV_ITEMS.map((tab) => {
            const Icon = tab.icon;
            const isActive = isMobileTripNavActive(tab.id, activeTab);
            return (
              <motion.button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                whileTap={{ y: 1 }}
                transition={TP_MOTION_TRANSITIONS.micro}
                className={`touch-target tp-press-feedback tp-nav-item ${isActive ? 'tp-nav-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={tab.label}
                title={tab.label}
              >
                {isActive && (
                  <motion.span
                    layoutId="tp-bottom-nav-active-pill"
                    className="tp-nav-active-pill"
                    transition={TP_MOTION_TRANSITIONS.spring}
                    aria-hidden="true"
                  />
                )}
                <PresenceTabMarker count={getMobilePresenceCount(tab.id)} />
                <span className="tp-nav-item-content">
                  <Icon size={20} />
                  <span className="tp-nav-label">{tab.mobileLabel || tab.label}</span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>

      <div className="tp-bottom-nav-spacer" />
    </>
  );
};

export default BottomNavigation;
