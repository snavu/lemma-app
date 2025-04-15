import React, { useState, useEffect } from 'react';
import Select from 'react-select';

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

  // const content = getCurrentTabContent();
  // const tagRegex = /^#{1,3} .+/gm;
  // const tags = content.match(tagRegex);
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
  

  return (
    <div>
      <label>
        <Select<Option>
          value={selectedOption}
          onChange={handleChange}
          options={options}
        />
      </label>
    </div>
  );
};