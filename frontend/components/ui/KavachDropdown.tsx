'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface KavachDropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  count?: number;
  description?: string;
}

export interface KavachDropdownProps {
  options: KavachDropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  multiple?: boolean;
  values?: string[];
  onChangeMultiple?: (values: string[]) => void;
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  width?: string | number;
  fullWidth?: boolean;
  minWidth?: string | number;
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right';
  disabled?: boolean;
  searchable?: boolean;
  ariaLabel?: string;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}

const sans = "var(--font-sans, 'Plus Jakarta Sans', Inter, -apple-system, sans-serif)";

export function KavachDropdown({
  options,
  value,
  onChange,
  multiple = false,
  values = [],
  onChangeMultiple,
  placeholder = 'Select option...',
  label,
  icon,
  width,
  fullWidth = false,
  minWidth = '180px',
  size = 'md',
  align = 'left',
  disabled = false,
  searchable = false,
  ariaLabel,
  id,
  className = '',
  style = {},
}: KavachDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const dropdownId = id || generatedId;

  // Height and font sizing
  const sizeStyles = {
    sm: { height: '32px', fontSize: '12px', padding: '0 10px' },
    md: { height: '38px', fontSize: '13px', padding: '0 12px' },
    lg: { height: '44px', fontSize: '14px', padding: '0 16px' },
  }[size];

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opening if searchable
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, searchable]);

  // Filter options if searchable
  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      opt.label.toLowerCase().includes(q) ||
      opt.value.toLowerCase().includes(q) ||
      (opt.description && opt.description.toLowerCase().includes(q))
    );
  });

  // Selected item display text
  const selectedDisplay = React.useMemo(() => {
    if (multiple) {
      if (values.length === 0) return placeholder;
      if (values.includes('ALL')) return 'All';
      if (values.length === 1) {
        const found = options.find((o) => o.value === values[0]);
        return found ? found.label : values[0];
      }
      return `${values.length} selected`;
    }
    const found = options.find((o) => o.value === value);
    return found ? found.label : placeholder;
  }, [multiple, values, value, options, placeholder]);

  const handleSelect = (optValue: string) => {
    if (multiple) {
      if (!onChangeMultiple) return;
      if (optValue === 'ALL') {
        onChangeMultiple(['ALL']);
      } else {
        const cleaned = values.filter((v) => v !== 'ALL');
        if (cleaned.includes(optValue)) {
          const next = cleaned.filter((v) => v !== optValue);
          onChangeMultiple(next.length === 0 ? ['ALL'] : next);
        } else {
          onChangeMultiple([...cleaned, optValue]);
        }
      }
    } else {
      onChange?.(optValue);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
      setFocusedIndex(-1);
      return;
    }

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[focusedIndex].value);
      }
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={`kavach-dropdown-wrapper ${className}`}
      style={{
        position: 'relative',
        display: fullWidth ? 'block' : 'inline-block',
        width: fullWidth ? '100%' : (width || 'auto'),
        minWidth: fullWidth ? '100%' : minWidth,
        fontFamily: sans,
        ...style,
      }}
    >
      {label && (
        <label
          htmlFor={dropdownId}
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 500,
            color: '#4B5563',
            marginBottom: '4px',
          }}
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={dropdownId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || label || placeholder}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          height: sizeStyles.height,
          padding: sizeStyles.padding,
          borderRadius: '8px',
          border: isOpen ? '1px solid #0F172A' : '1px solid #E5E7EB',
          background: disabled ? '#F3F4F6' : '#FFFFFF',
          fontSize: sizeStyles.fontSize,
          fontWeight: 500,
          color: disabled ? '#9CA3AF' : '#0F172A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: isOpen
            ? '0 0 0 2px rgba(15, 23, 42, 0.08)'
            : '0 1px 2px rgba(0, 0, 0, 0.03)',
          transition: 'all 0.15s ease',
          outline: 'none',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {icon && (
            <span style={{ display: 'inline-flex', flexShrink: 0, color: '#64748B' }}>
              {icon}
            </span>
          )}
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: (multiple ? values.length === 0 : !value) ? '#9CA3AF' : '#0F172A',
            }}
          >
            {selectedDisplay}
          </span>
        </div>

        <ChevronDown
          size={14}
          color="#64748B"
          style={{
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </button>

      {/* Floating Menu Popover */}
      {isOpen && (
        <div
          ref={listboxRef}
          role="listbox"
          aria-multiselectable={multiple}
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            [align]: 0,
            minWidth: '100%',
            width: 'max-content',
            maxWidth: '360px',
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.12), 0 6px 12px -4px rgba(0, 0, 0, 0.06)',
            zIndex: 100,
            padding: '6px',
            animation: 'fadeInScale 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Optional Search Input */}
          {searchable && (
            <div style={{ padding: '4px', marginBottom: '4px', position: 'relative' }}>
              <Search
                size={13}
                color="#94A3B8"
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusedIndex(0);
                }}
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '0 8px 0 28px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  fontSize: '12px',
                  color: '#0F172A',
                  outline: 'none',
                  fontFamily: sans,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Options List */}
          <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '2px' }}>
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '12px 14px',
                  fontSize: '12.5px',
                  color: '#94A3B8',
                  textAlign: 'center',
                }}
              >
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = multiple
                  ? values.includes(opt.value)
                  : value === opt.value;
                const isFocused = idx === focusedIndex;

                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: isSelected ? '#0F172A' : '#334155',
                      fontWeight: isSelected ? 600 : 400,
                      background: isSelected
                        ? '#F1F5F9'
                        : isFocused
                        ? '#F8FAFC'
                        : 'transparent',
                      transition: 'background 0.12s ease',
                      userSelect: 'none',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      {multiple ? (
                        <div
                          style={{
                            width: '15px',
                            height: '15px',
                            borderRadius: '3px',
                            background: isSelected ? '#0F172A' : '#FFFFFF',
                            border: isSelected ? '1px solid #0F172A' : '1px solid #CBD5E1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.12s ease',
                          }}
                        >
                          {isSelected && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                        </div>
                      ) : (
                        opt.icon && (
                          <span style={{ display: 'inline-flex', flexShrink: 0, color: '#64748B' }}>
                            {opt.icon}
                          </span>
                        )
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {opt.label}
                        </span>
                        {opt.description && (
                          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>
                            {opt.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {opt.badge && (
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: opt.badgeColor ? `${opt.badgeColor}15` : '#F1F5F9',
                            color: opt.badgeColor || '#475569',
                            fontWeight: 500,
                          }}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {opt.count !== undefined && (
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            background: '#F1F5F9',
                            color: '#64748B',
                            fontWeight: 600,
                          }}
                        >
                          {opt.count}
                        </span>
                      )}
                      {!multiple && isSelected && (
                        <Check size={14} color="#0F172A" strokeWidth={2.5} style={{ marginLeft: '4px' }} />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Multi-Select Footer */}
          {multiple && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid #F1F5F9',
                paddingTop: '6px',
                marginTop: '4px',
                paddingRight: '4px',
                paddingLeft: '4px',
              }}
            >
              <button
                type="button"
                onClick={() => onChangeMultiple?.(['ALL'])}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '11.5px',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: '4px',
                }}
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: '#0F172A',
                  border: 'none',
                  fontSize: '11.5px',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: '6px',
                }}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
