import React, { useState, useEffect } from 'react';
import Select, { StylesConfig } from 'react-select';

interface SearchProps {
  getCurrentTabContent: () => string;
}

interface Option {
  value: string;
  label: string;
}

export const Search: React.FC<SearchProps> = ({ getCurrentTabContent }) => {
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [options, setOptions] = useState<Option[]>([]);

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
  }, [getCurrentTabContent]); 

  const handleChange = (option: Option | null) => {
    setSelectedOption(option);
    if (!option) return;
  
    const [tag, label] = option.value.split(':');
    
    const target = Array.from(document.querySelectorAll(tag)).find(
      (heading) => heading.textContent?.trim() === label
    ) as HTMLElement;
  
    const container = document.querySelector('.editor-content-area') as HTMLElement;
    
    const targetRect = target.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const offset = targetRect.top - containerRect.top + container.scrollTop;

    container.scrollTo({
      top: offset,
      behavior: 'smooth',
    });
  };
  
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
        <Select<Option>
          placeholder="Search for Tag" 
          value={selectedOption}
          onChange={handleChange}
          options={options}
          components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
          styles={customStyles}
        />
      </label>
      <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '12px' }}></div>
    </div>
  );
};