import OptionAutocomplete from './OptionAutocomplete';
import { EditIcon } from '@shopify/polaris-icons';

export function DecorationAutocomplete({
  value = "",
  onChange,
  onAdd,
  placeholder = "e.g., Embroidery, Screen Print, Heat Transfer",
  helpText = "Enter decoration methods available for this product (Press Enter to add)",
  error,
  disabled = false,
  existingDecorations = []
}) {
  // Common decoration suggestions for when no existing decorations match
  const commonDecorations = [
    'Embroidery', 'Screen Print', 'Heat Transfer', 'Digital Print', 'Vinyl',
    'Sublimation', 'Laser Engraving', 'Debossing', 'Embossing', 'Foil Stamping',
    'Pad Print', 'Direct to Garment', 'Applique', 'Patches', 'Rhinestones',
    'Sequins', 'Beading', 'Tie Dye', 'Distressing', 'Stone Wash'
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
      existingOptions={existingDecorations}
      commonSuggestions={commonDecorations}
      optionType="decoration"
      icon={EditIcon}
    />
  );
}