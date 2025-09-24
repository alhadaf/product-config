import OptionAutocomplete from './OptionAutocomplete';
import { ColorIcon } from '@shopify/polaris-icons';

export function ColorAutocomplete({
  value = "",
  onChange,
  onAdd,
  placeholder = "e.g., Red, Navy Blue, Forest Green",
  helpText = "Enter color names that customers will understand (Press Enter to add)",
  error,
  disabled = false,
  existingColors = []
}) {
  // Common color suggestions for when no existing colors match
  const commonColors = [
    'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink', 'Brown',
    'Black', 'White', 'Gray', 'Navy', 'Maroon', 'Teal', 'Lime', 'Olive',
    'Silver', 'Gold', 'Beige', 'Tan', 'Coral', 'Salmon', 'Turquoise', 'Violet'
  ];

  return (
    <OptionAutocomplete
      value={value}
      onChange={onChange}
      onAdd={onAdd}
      placeholder={placeholder}
      helpText={helpText}
      error={error}
      disabled={disabled}
      existingOptions={existingColors}
      commonSuggestions={commonColors}
      optionType="color"
      icon={ColorIcon}
    />
  );
}

export default ColorAutocomplete;