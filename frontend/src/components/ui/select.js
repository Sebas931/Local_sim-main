import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = ({ value, onValueChange, children, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (newValue) => {
    onValueChange(newValue);
    setIsOpen(false);
  };

  // Extract trigger and content from children
  let trigger = null;
  let content = null;
  let selectedLabel = '';

  React.Children.forEach(children, (child) => {
    if (!child) return;

    if (child.type === SelectTrigger) {
      trigger = child;
    } else if (child.type === SelectContent) {
      content = child;

      // Find the selected item's label
      React.Children.forEach(child.props.children, (item) => {
        if (item && item.props && item.props.value === value) {
          selectedLabel = item.props.children;
        }
      });
    }
  });

  return (
    <div className="relative" ref={selectRef} {...props}>
      {/* Render the trigger */}
      {React.cloneElement(trigger, {
        onClick: () => setIsOpen(!isOpen),
        isOpen: isOpen,
        selectedLabel: selectedLabel
      })}

      {/* Render the dropdown content when open */}
      {isOpen && content && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {React.Children.map(content.props.children, (item) => {
            if (!item) return null;

            return React.cloneElement(item, {
              onClick: () => handleSelect(item.props.value),
              selected: item.props.value === value
            });
          })}
        </div>
      )}
    </div>
  );
};

const SelectTrigger = ({ children, onClick, isOpen, selectedLabel, className = '', ...props }) => {
  // Find SelectValue child and pass selectedLabel to it
  const updatedChildren = React.Children.map(children, (child) => {
    if (child && child.type === SelectValue) {
      return React.cloneElement(child, { selectedLabel });
    }
    return child;
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {updatedChildren}
      <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
};

const SelectValue = ({ placeholder, selectedLabel, className = '', ...props }) => (
  <span className={`block truncate ${!selectedLabel ? 'text-gray-500' : ''} ${className}`} {...props}>
    {selectedLabel || placeholder || 'Seleccionar...'}
  </span>
);

const SelectContent = ({ children, className = '', ...props }) => {
  // This component is just a wrapper - actual rendering happens in Select
  return null;
};

const SelectItem = ({ children, value, onClick, selected, className = '', ...props }) => (
  <div
    onClick={onClick}
    className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-2.5 px-3 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 ${selected ? 'bg-blue-100 text-blue-900 font-medium' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
