import OptionAutocomplete from './OptionAutocomplete';
import { ViewIcon } from '@shopify/polaris-icons';

export function SizeAutocomplete({
  value = "",
  onChange,
  onAdd,
  placeholder = "e.g., XS, Small, Medium, Large, XL",
  helpText = "Enter size options that customers will understand (Press Enter to add)",
  error,
  disabled = false,
  existingSizes = []
}) {
  // Common size suggestions for when no existing sizes match
  const commonSizes = [
    'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL',
    'Extra Small', 'Small', 'Medium', 'Large', 'Extra Large',
    '28', '30', '32', '34', '36', '38', '40', '42', '44', '46',
    '6', '7', '8', '9', '10', '11', '12', '13', '14', '15',
    'One Size', 'Free Size', 'Universal'
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
      existingOptions={existingSizes}
      commonSuggestions={commonSizes}
      optionType="size"
      icon={ViewIcon}
    />
  );
}