import { useEffect, useMemo, useRef, useState } from 'react';
import type { Customer } from '../types';
import { formatCustomerPosDisplay } from '../utils/customerPos';

type CustomerPosOption = {
  id: string;
  customerName: string;
  customerPersonName: string;
  address: string;
};

type CustomerPosComboboxProps = {
  customers: Customer[];
  selectedPosId: string;
  filterText: string;
  onFilterTextChange: (value: string) => void;
  onSelectPos: (posId: string, displayText: string) => void;
};

export function CustomerPosCombobox({
  customers,
  selectedPosId,
  filterText,
  onFilterTextChange,
  onSelectPos,
}: CustomerPosComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const options = useMemo(() => {
    return customers.flatMap((customer) => (customer.pos || [])
      .filter((pos) => Boolean(pos.id))
      .map((pos) => ({
        id: pos.id as string,
        customerName: customer.name,
        customerPersonName: customer.personName || '',
        address: pos.address,
      })));
  }, [customers]);

  const filteredOptions = useMemo(() => {
    const normalized = filterText.trim().toLowerCase();
    if (!normalized) return options;

    return options.filter((option) =>
      option.customerName.toLowerCase().includes(normalized)
      || option.customerPersonName.toLowerCase().includes(normalized)
      || option.address.toLowerCase().includes(normalized)
    );
  }, [options, filterText]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getOptionDisplay = (option: CustomerPosOption) =>
    formatCustomerPosDisplay(option.customerName, option.address);

  const handleSelectOption = (option: CustomerPosOption) => {
    onSelectPos(option.id, getOptionDisplay(option));
    setIsOpen(false);
  };

  const normalizedActiveIndex = isOpen && filteredOptions.length > 0
    ? (activeIndex >= 0 && activeIndex < filteredOptions.length ? activeIndex : 0)
    : -1;
  const activeDescendantId = isOpen && normalizedActiveIndex >= 0 && filteredOptions[normalizedActiveIndex]
    ? `customer-pos-option-${filteredOptions[normalizedActiveIndex].id}`
    : undefined;

  return (
    <div className="position-relative" ref={containerRef}>
      <input
        type="text"
        className="form-control"
        placeholder="Search and select customer/POS..."
        value={filterText}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          onFilterTextChange(e.target.value);
          setIsOpen(true);
          setActiveIndex(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (filteredOptions.length === 0) return;
            setIsOpen(true);
            setActiveIndex((current) => (current + 1) % filteredOptions.length);
            return;
          }

          if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filteredOptions.length === 0) return;
            setIsOpen(true);
            setActiveIndex((current) => (current <= 0 ? filteredOptions.length - 1 : current - 1));
            return;
          }

          if (e.key === 'Enter' && isOpen && normalizedActiveIndex >= 0 && filteredOptions[normalizedActiveIndex]) {
            e.preventDefault();
            handleSelectOption(filteredOptions[normalizedActiveIndex]);
            return;
          }

          if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls="customer-pos-combobox-options"
        aria-activedescendant={activeDescendantId}
      />
      {isOpen && (
        <div
          id="customer-pos-combobox-options"
          role="listbox"
          className="list-group position-absolute w-100 mt-1"
          style={{ zIndex: 1060, maxHeight: '260px', overflowY: 'auto' }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              const isSelected = selectedPosId === option.id;
              const isFocused = normalizedActiveIndex === index;
              return (
              <button
                key={option.id}
                id={`customer-pos-option-${option.id}`}
                type="button"
                className={`list-group-item list-group-item-action text-start ${isSelected ? 'active' : ''}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  handleSelectOption(option);
                }}
                style={isFocused && !isSelected ? { backgroundColor: 'rgba(13, 110, 253, 0.2)' } : undefined}
              >
                <div className="fw-semibold">{option.customerName}</div>
                <div className="small text-secondary">{option.address}</div>
              </button>
              );
            })
          ) : (
            <div className="list-group-item text-secondary">No matches found.</div>
          )}
        </div>
      )}
    </div>
  );
}
