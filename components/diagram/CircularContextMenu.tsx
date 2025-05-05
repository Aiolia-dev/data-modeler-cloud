"use client";

import React from 'react';
import ReactDOM from 'react-dom';

export interface CircularMenuOption {
  key: string;
  icon: React.ReactNode;
  label: string;
  onClick?: (e: React.MouseEvent) => void;
}

interface CircularContextMenuProps {
  open: boolean;
  position: { x: number; y: number } | null;
  onClose: () => void;
  options: CircularMenuOption[];
}

const CIRCLE_RADIUS = 90;
const BUTTON_RADIUS = 24;

const CircularContextMenu: React.FC<CircularContextMenuProps> = ({ open, position, onClose, options }) => {
  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const overlayRoot = document.getElementById('overlay-root');
      if (overlayRoot && overlayRoot.contains(e.target as Node)) return;
      onClose();
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  if (!open || !position) return null;

  // Calculate positions for each option in a circle
  const angleStep = (2 * Math.PI) / options.length;

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 2147483647,
        pointerEvents: 'auto',
      }}
      onClick={e => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <div className="relative" style={{ width: CIRCLE_RADIUS * 2, height: CIRCLE_RADIUS * 2 }}>
        {/* Outer circle */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 rounded-full shadow-xl border-4 border-gray-700"
          style={{ width: CIRCLE_RADIUS * 2, height: CIRCLE_RADIUS * 2 }}
        ></div>
        {/* Central close button */}
        <button
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white text-gray-900 flex items-center justify-center text-2xl shadow-md border-2 border-gray-300 hover:bg-gray-200"
          onClick={onClose}
          tabIndex={-1}
          style={{ zIndex: 2 }}
        >
          &times;
        </button>
        {/* Menu options in a circle */}
        {options.map((opt, idx) => {
          const angle = -Math.PI / 2 + idx * angleStep;
          const left = CIRCLE_RADIUS - BUTTON_RADIUS + CIRCLE_RADIUS * Math.cos(angle);
          const top = CIRCLE_RADIUS - BUTTON_RADIUS + CIRCLE_RADIUS * Math.sin(angle);
          return (
            <button
              key={opt.key}
              className="absolute bg-gray-800 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-primary transition-colors"
              style={{
                width: BUTTON_RADIUS * 2,
                height: BUTTON_RADIUS * 2,
                left,
                top,
              }}
              tabIndex={-1}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                if (opt.onClick) opt.onClick(e);
                onClose();
              }}
              title={opt.label}
            >
              {opt.icon}
            </button>
          );
        })}
      </div>
    </div>,
    document.getElementById('overlay-root') as HTMLElement
  );
};

export default CircularContextMenu;
