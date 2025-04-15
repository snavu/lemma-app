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
  const content = getCurrentTabContent();
  const tagRegex = /^#+ .+/gm;
  const tags = content.match(tagRegex);
  
  // Populate tag options for Select component
  const tagOptions: Option[] = tags?.map((tag) => ({
    label: tag,
    value: tag,
  })) || [];

    const headingElements = document.querySelectorAll('h1[data-nodeid], h2[data-nodeid], h3[data-nodeid], h4[data-nodeid], h5[data-nodeid], h6[data-nodeid]');
    const options: Option[] = Array.from(headingElements)
        .map(el => {
        const nodeId = el.getAttribute('data-nodeid');
        const tag = el.tagName.toLowerCase();
        const label = el.textContent?.trim() || '';
        if (!nodeId) return null;
        return {
            value: `${tag}:${nodeId}`,
            label,
        };
        })
        .filter((opt): opt is Option => opt !== null)
    console.log(options);
    const handleChange = (option: Option | null) => {
        setSelectedOption(option);
        if (!option) return;
        const [tag, nodeId] = option.value.split(':');
        const target = document.querySelector(`${tag}[data-nodeid="${nodeId}"]`) as HTMLElement;
        const container = document.querySelector('.markdown-content') as HTMLElement;
        const targetRect = target.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const offset = targetRect.top - containerRect.top + container.scrollTop;

        container.scrollTo({
            top: offset,
            behavior: 'smooth',
        });

    }

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