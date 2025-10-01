import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = ({ value, onValueChange, children, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const selectRef = useRef(null);

  useEffect(() => {
    // Find the selected item's display text
    const selectedChild = React.Children.toArray(children).find(child =>
      child.props && child.props.value === value
    );
    setDisplayValue(selectedChild ? selectedChild.props.children : '');
  }, [value, children]);

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

  return (
    <div className="relative" ref={selectRef} {...props}>
      <SelectTrigger onClick={() => setIsOpen(!isOpen)} isOpen={isOpen}>
        <SelectValue placeholder={displayValue} />
      </SelectTrigger>
      {isOpen && (
        <SelectContent>
          {React.Children.map(children, (child) => {
            if (child.type === SelectItem) {
              return React.cloneElement(child, {
                onClick: () => handleSelect(child.props.value),
                selected: child.props.value === value
              });
            }
            return child;
          })}
        </SelectContent>
      )}
    </div>
  );
};

const SelectTrigger = ({ children, onClick, isOpen, className = '', ...props }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  >
    {children}
    <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
  </button>
);

const SelectValue = ({ placeholder, className = '', ...props }) => (
  <span className={`block truncate ${!placeholder ? 'text-gray-500' : ''} ${className}`} {...props}>
    {placeholder || 'Seleccionar...'}
  </span>
);

const SelectContent = ({ children, className = '', ...props }) => (
  <div
    className={`absolute top-full left-0 right-0 z-50 max-h-60 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg ${className}`}
    {...props}
  >
    {children}
  </div>
);

const SelectItem = ({ children, value, onClick, selected, className = '', ...props }) => (
  <div
    onClick={onClick}
    className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 ${selected ? 'bg-blue-100 text-blue-900' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };