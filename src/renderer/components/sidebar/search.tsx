import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Select, { StylesConfig } from 'react-select';


interface TabInfo {
  id: string;
  filePath: string;
  fileName: string;
  content: string;
  hashtags: string[];
}

interface SearchProps {
  getCurrentTabContent: () => string;
  tabArray: TabInfo[];
  activeTab: string;
  searchTab: (tabId: string) => void;
}

interface Option {
  value: string;
  label: string;
}

export const Search: React.FC<SearchProps> = ({ getCurrentTabContent, tabArray, activeTab, searchTab }) => {
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [pendingScrollOption, setPendingScrollOption] = useState<Option | null>(null);


  useEffect(() => {
    const editor = document.querySelector('.editor-content-area');
    const headingElements: HTMLElement[] = Array.from(editor?.querySelectorAll('h1, h2, h3') || []);

    const updatedOptions: Option[] = Array.from(headingElements).map((el) => {
      const label = el.textContent?.trim() || ''; 
      const tag = el.tagName.toLowerCase();
      const value = `${tag}:${label}`;
      return {
        value, 
        label,
      };
    });
    setOptions(updatedOptions);
    const activeTabObj = tabArray.find(tab => tab.id === activeTab);
    if (activeTabObj) {
      debouncedUpdateHashtags(activeTabObj, updatedOptions);
    }
  }, [getCurrentTabContent]); 

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
  };

  const updateHashtags = (activeTabObj: TabInfo, options: Option[]) => {
    if (!activeTabObj) return;
    activeTabObj.hashtags.length = 0;
  
    options.forEach((opt) => {
      if (!activeTabObj.hashtags.includes(opt.label)) {
        activeTabObj.hashtags.push(opt.value);
      }
    });
  };

  const debounce = (fn: Function, ms = 1000) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function (...args: any[]) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), ms);
    };
  };

  const debouncedUpdateHashtags = useMemo(() => debounce(updateHashtags, 500), []);

  const groupedHashtagOptions = tabArray.map((tab) => ({
    label: tab.fileName,
    options: tab.hashtags.map((h) => {
      const [tag, label] = h.split(':');
      return {
        value: `${tag}:${tab.id}:${label}`,
        label,
      };
    }),
  }));
  
  console.log(groupedHashtagOptions);
  

  // for handling the scrolling when an option is selected
  const handleChange = (option: Option | null) => {
    setSelectedOption(option);
    if (!option) return;

    const [tag, tabId, label] = option.value.split(':');
    // searchTab(tabId);
    
    setTimeout(() => {
    const target = Array.from(document.querySelectorAll(tag)).find(
      (heading) => heading.textContent?.trim() === label
    ) as HTMLElement;
    // console.log(target);

    const container = document.querySelector('.editor-content-area') as HTMLElement;
    const targetRect = target.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const offset = targetRect.top - containerRect.top + container.scrollTop;

    container.scrollTo({
      top: offset,
      behavior: 'smooth',
    });
  }, 100);
};

  // CSS for react-select
  const customStyles: StylesConfig<Option> = {
    control: (styles) => ({ ...styles, 
                            backgroundColor: 'var(--background-secondary)', 
                            border: 'none',
                            boxShadow: 'none',        
    }),
    menu: (styles) => ({ ...styles,
                        border: '1px solid var(--text-normal)',
                        borderRadius: '6px',
                        backgroundColor: 'var(--background-secondary)',
    }),
    menuList: (styles) => ({ ...styles,
                            "::-webkit-scrollbar": {
                              display: 'none',
                              
                            }
    }),
    option: (styles) => ({ ...styles,
                          color: 'var(--text-normal)',
                          backgroundColor: 'var(--background-secondary)',
    }),
    input: (styles) => ({ ...styles, color: 'var(--text-normal)' }),
    placeholder: (styles) => ({ ...styles, color: 'var(--text-normal)' }),
    singleValue: (styles) => ({ ...styles,color: 'var(--text-normal)' }),
  };

  return (
    <div>
      <label>
        <Select
          placeholder="Search for Tag" 
          value={selectedOption}
          onChange={handleChange}
          options={groupedHashtagOptions}
          components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
          styles={customStyles}
          menuIsOpen={inputValue.length > 0}
          inputValue={inputValue}
          isSearchable={true}
          onInputChange={handleInputChange}
        />
      </label>
      <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '12px' }}></div>
    </div>
  );
};