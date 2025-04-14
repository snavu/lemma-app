import React, { useEffect, useRef } from 'react';
import './context-menu.css';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  options: {
    label?: string;
    onClick?: () => void;
    className?: string;
    icon?: React.ReactNode;
    isSeparator?: boolean;
  }[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, options }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Ensure the menu doesn't go off screen
  let menuX = x;
  let menuY = y;
  
  useEffect(() => {
    const menu = menuRef.current;
    if (menu) {
      const rect = menu.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      if (x + rect.width > windowWidth) {
        menuX = windowWidth - rect.width;
      }
      
      if (y + rect.height > windowHeight) {
        menuY = windowHeight - rect.height;
      }
    }
  }, [x, y]);

  return (
    <div 
      className="context-menu" 
      ref={menuRef} 
      style={{ left: `${menuX}px`, top: `${menuY}px` }}
    >
      <ul>
        {options.map((option, index) => (
          option.isSeparator ? (
            <li key={index} className="menu-separator"></li>
          ) : (
            <li 
              key={index} 
              onClick={() => {
                option.onClick();
                onClose();
              }}
              className={option.className}
            >
              {option.icon && <span className="menu-icon">{option.icon}</span>}
              {option.label}
            </li>
          )
        ))}
      </ul>
    </div>
  );
};