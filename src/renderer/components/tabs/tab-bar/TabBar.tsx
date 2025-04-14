import React, { useRef } from 'react';
import { Tab } from '../Tab';
import './tab-bar.css';

interface TabInfo {
  id: string;
  fileName: string;
}

interface TabBarProps {
  tabs: TabInfo[];
  activeTab: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onTabSelect,
  onTabClose
}) => {
  const tabsRef = useRef<HTMLDivElement>(null);

  // Scroll tab into view when it becomes active
  const scrollTabIntoView = (tabId: string) => {
    if (!tabsRef.current) return;
    
    const tabElement = tabsRef.current.querySelector(`[data-tab-id="${tabId}"]`);
    if (tabElement) {
      tabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  };

  const handleTabSelect = (tabId: string) => {
    onTabSelect(tabId);
    scrollTabIntoView(tabId);
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="tab-bar" ref={tabsRef}>
      {tabs.map(tab => (
        <Tab
          key={tab.id}
          id={tab.id}
          title={tab.fileName}
          active={activeTab === tab.id}
          onSelect={() => handleTabSelect(tab.id)}
          onClose={() => onTabClose(tab.id)}
        />
      ))}
    </div>
  );
};
