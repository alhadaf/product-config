import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  Card,
  Box,
  Icon,
  Spinner
} from '@shopify/polaris';
import { SearchIcon, PlusIcon, ColorIcon } from '@shopify/polaris-icons';

export function OptionAutocomplete({
  value = "",
  onChange,
  onAdd,
  placeholder = "Enter option value",
  helpText = "Enter values that customers will understand",
  error,
  disabled = false,
  existingOptions = [],
  commonSuggestions = [],
  optionType = "option",
  icon = ColorIcon
}) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  
  const listRef = useRef(null);
  const containerRef = useRef(null);

  // Filter options based on input
  const filterOptions = useCallback((input) => {
    if (!input.trim()) {
      return [];
    }

    const searchTerm = input.toLowerCase().trim();
    const filtered = [];

    // First, add matching existing options
    const matchingExisting = existingOptions.filter(option =>
      option.toLowerCase().includes(searchTerm) && 
      option.toLowerCase() !== searchTerm
    );
    
    filtered.push(...matchingExisting.map(option => ({
      type: 'existing',
      value: option,
      label: option
    })));

    // Then, add matching common suggestions that aren't already in existing options
    const matchingCommon = commonSuggestions.filter(option =>
      option.toLowerCase().includes(searchTerm) && 
      option.toLowerCase() !== searchTerm &&
      !existingOptions.some(existing => existing.toLowerCase() === option.toLowerCase())
    );
    
    filtered.push(...matchingCommon.map(option => ({
      type: 'suggestion',
      value: option,
      label: option
    })));

    // Always add "Add new" option if the input doesn't exactly match any existing option
    const exactMatch = existingOptions.some(option => 
      option.toLowerCase() === searchTerm
    );
    
    if (!exactMatch && input.trim()) {
      filtered.push({
        type: 'new',
        value: input.trim(),
        label: `Add "${input.trim()}" as new ${optionType}`
      });
    }

    return filtered.slice(0, 8); // Limit to 8 suggestions
  }, [existingOptions, commonSuggestions, optionType]);

  // Update filtered options when input changes
  useEffect(() => {
    const filtered = filterOptions(inputValue);
    setFilteredOptions(filtered);
    setHighlightedIndex(-1);
  }, [inputValue, filterOptions]);

  // Handle input change
  const handleInputChange = useCallback((newValue) => {
    setInputValue(newValue);
    onChange?.(newValue);
    setIsOpen(true);
  }, [onChange]);

  // Handle option selection
  const handleOptionSelect = useCallback((option) => {
    setInputValue(option.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
    
    if (option.type === 'new') {
      onAdd?.(option.value);
    } else {
      onChange?.(option.value);
    }
  }, [onChange, onAdd]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    console.log('handleKeyDown:', { key: e.key, inputValue: inputValue.trim(), isOpen, filteredOptionsLength: filteredOptions.length, highlightedIndex });
    switch (e.key) {
      case 'ArrowDown':
        if (isOpen && filteredOptions.length > 0) {
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        if (isOpen && filteredOptions.length > 0) {
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
        }
        break;
      case 'Enter':
        e.preventDefault();
        // If dropdown is open and an option is highlighted, select it
        if (isOpen && filteredOptions.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        } 
        // Otherwise, if there's input text, add it as a new option
        else if (inputValue.trim()) {
          // Check if the input value already exists in existingOptions
          const exactMatch = existingOptions.some(option => 
            option.toLowerCase() === inputValue.trim().toLowerCase()
          );
          
          // If it exists, just call onChange, otherwise call onAdd to create new
          if (exactMatch) {
            const matchingOption = existingOptions.find(option => 
              option.toLowerCase() === inputValue.trim().toLowerCase()
            );
            onChange?.(matchingOption);
            setInputValue('');
            setIsOpen(false);
            setHighlightedIndex(-1);
          } else {
            onAdd?.(inputValue.trim());
            setInputValue('');
            setIsOpen(false);
            setHighlightedIndex(-1);
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  }, [isOpen, filteredOptions, highlightedIndex, handleOptionSelect, inputValue, onAdd, onChange, existingOptions]);

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Handle blur
  const handleBlur = useCallback((e) => {
    // Delay closing to allow for option clicks
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }, 150);
  }, []);

  // Handle clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <TextField
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        helpText={helpText}
        error={error}
        disabled={disabled}
        autoComplete="off"
        prefix={<Icon source={SearchIcon} />}
      />
      
      {isOpen && filteredOptions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            marginTop: '4px'
          }}
        >
          <Card>
            <Box padding="0">
              <div
                ref={listRef}
                style={{
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}
              >
                {filteredOptions.map((option, index) => (
                  <div
                    key={`${option.type}-${option.value}`}
                    onClick={() => handleOptionSelect(option)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      backgroundColor: index === highlightedIndex ? '#f6f6f7' : 'transparent',
                      borderBottom: index < filteredOptions.length - 1 ? '1px solid #e1e3e5' : 'none',
                      transition: 'background-color 0.1s ease'
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <InlineStack gap="300" align="space-between">
                      <InlineStack gap="200" align="center">
                        <Icon 
                          source={option.type === 'new' ? PlusIcon : icon} 
                          tone={option.type === 'new' ? 'success' : 'subdued'}
                        />
                        <Text variant="bodyMd">
                          {option.label}
                        </Text>
                      </InlineStack>
                      {option.type === 'existing' && (
                        <Text variant="bodySm" tone="subdued">
                          Existing
                        </Text>
                      )}
                      {option.type === 'suggestion' && (
                        <Text variant="bodySm" tone="subdued">
                          Suggested
                        </Text>
                      )}
                      {option.type === 'new' && (
                        <Text variant="bodySm" tone="success">
                          New
                        </Text>
                      )}
                    </InlineStack>
                  </div>
                ))}
              </div>
            </Box>
          </Card>
        </div>
      )}
      
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            marginTop: '4px'
          }}
        >
          <Card>
            <Box padding="400">
              <InlineStack gap="200" align="center">
                <Spinner size="small" />
                <Text variant="bodyMd" tone="subdued">
                  Loading {optionType} options...
                </Text>
              </InlineStack>
            </Box>
          </Card>
        </div>
      )}
    </div>
  );
}

export default OptionAutocomplete;