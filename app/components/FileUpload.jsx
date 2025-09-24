import { useState, useRef, useCallback, useEffect } from 'react';
import {
  BlockStack,
  InlineStack,
  Text,
  Button,
  Thumbnail,
  Banner,
  ProgressBar,
  Icon,
  Box
} from '@shopify/polaris';
import { UploadIcon, DeleteIcon, ImageIcon, EditIcon } from '@shopify/polaris-icons';
import ImageEditor from './ImageEditor';

// Custom hook for responsive design
function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on mount
    checkIsMobile();

    // Add event listener
    window.addEventListener('resize', checkIsMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return { isMobile };
}

export function FileUpload({
  label,
  accept = "image/jpeg,image/png,image/webp",
  maxSize = 10 * 1024 * 1024, // 10MB
  onFileSelect,
  onFileRemove,
  error,
  helpText,
  required = false,
  multiple = false,
  showPreview = true,
  value = null
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationError, setValidationError] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const fileInputRef = useRef(null);
  const { isMobile } = useResponsive();

  // File validation
  const validateFile = useCallback((file) => {
    const errors = [];

    // Check file type
    const acceptedTypes = accept.split(',').map(type => type.trim());
    const fileType = file.type;
    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return fileType.match(type.replace('*', '.*'));
    });

    if (!isValidType) {
      errors.push(`File type not supported. Accepted types: ${accept}`);
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      errors.push(`File size too large. Maximum size: ${maxSizeMB}MB`);
    }

    // Check image dimensions (for images)
    if (file.type.startsWith('image/')) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          if (img.width < 300 || img.height < 300) {
            errors.push('Image dimensions too small. Minimum: 300x300px');
          }
          if (img.width > 5000 || img.height > 5000) {
            errors.push('Image dimensions too large. Maximum: 5000x5000px');
          }
          resolve(errors);
        };
        img.onerror = () => {
          errors.push('Invalid image file');
          resolve(errors);
        };
        img.src = URL.createObjectURL(file);
      });
    }

    return Promise.resolve(errors);
  }, [accept, maxSize]);

  // Handle file selection
  const handleFileSelect = useCallback(async (files) => {
    const fileList = Array.from(files);
    
    if (!multiple && fileList.length > 1) {
      setValidationError('Only one file can be selected');
      return;
    }

    const file = fileList[0];
    if (!file) return;

    setIsUploading(true);
    setValidationError(null);

    try {
      const validationErrors = await validateFile(file);
      
      if (validationErrors.length > 0) {
        setValidationError(validationErrors[0]);
        setIsUploading(false);
        return;
      }

      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        setUploadProgress(progress);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      
      onFileSelect?.({
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        type: file.type
      });

    } catch (error) {
      setValidationError('Error processing file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [multiple, validateFile, onFileSelect]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [handleFileSelect]);

  // Click handler
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // File input change handler
  const handleInputChange = useCallback((e) => {
    const files = e.target.files;
    handleFileSelect(files);
  }, [handleFileSelect]);

  // Remove file handler
  const handleRemove = useCallback(() => {
    if (value?.previewUrl) {
      URL.revokeObjectURL(value.previewUrl);
    }
    onFileRemove?.();
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [value, onFileRemove]);

  // Image editor handlers
  const handleEditClick = useCallback((e) => {
    e.stopPropagation();
    setShowEditor(true);
  }, []);

  const handleEditorSave = useCallback((editedData) => {
    // Create a new file object with edited data
    const editedFile = {
      ...value,
      previewUrl: editedData.url,
      file: new File([editedData.blob], value.name, { type: 'image/png' }),
      size: editedData.blob.size,
      edited: true
    };
    
    onFileSelect?.(editedFile);
    setShowEditor(false);
  }, [value, onFileSelect]);

  const displayError = error || validationError;

  return (
    <BlockStack gap="200">
      <Text variant="bodyMd" fontWeight="medium">
        {label} {required && <Text as="span" tone="critical">*</Text>}
      </Text>
      
      {helpText && (
        <Text variant="bodySm" tone="subdued">
          {helpText}
        </Text>
      )}

      {/* Upload Area */}
      <Box
        padding={isMobile ? "300" : "400"}
        borderWidth="1"
        borderStyle="dashed"
        borderColor={isDragOver ? "primary" : (displayError ? "critical" : "subdued")}
        borderRadius="200"
        background={isDragOver ? "surface-selected" : "surface"}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{ 
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          minHeight: isMobile ? '100px' : '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />

        {isUploading ? (
          <BlockStack gap="200" align="center">
            <Icon source={UploadIcon} tone="subdued" />
            <Text variant="bodyMd" alignment="center">
              Uploading... {uploadProgress}%
            </Text>
            <ProgressBar progress={uploadProgress} size="small" />
          </BlockStack>
        ) : value ? (
          <BlockStack gap={isMobile ? "200" : "300"} align="center">
            {showPreview && value.previewUrl && (
              <Thumbnail
                source={value.previewUrl}
                alt={value.name}
                size={isMobile ? "medium" : "large"}
              />
            )}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center',
              gap: isMobile ? '8px' : '12px',
              width: '100%'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flex: 1,
                minWidth: 0
              }}>
                <Icon source={ImageIcon} tone="subdued" />
                <Text variant={isMobile ? "bodySm" : "bodyMd"} truncate>
                  {value.name} {value.edited && <Text as="span" tone="success">(Edited)</Text>}
                </Text>
              </div>
              <div style={{
                display: 'flex',
                gap: '8px',
                flexShrink: 0
              }}>
                <Button
                  icon={EditIcon}
                  variant="plain"
                  size={isMobile ? "slim" : "medium"}
                  onClick={handleEditClick}
                  accessibilityLabel="Edit image"
                />
                <Button
                  icon={DeleteIcon}
                  variant="plain"
                  tone="critical"
                  size={isMobile ? "slim" : "medium"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  accessibilityLabel="Remove file"
                />
              </div>
            </div>
            <Text variant="bodySm" tone="subdued">
              {(value.size / 1024 / 1024).toFixed(2)} MB
            </Text>
          </BlockStack>
        ) : (
          <BlockStack gap="200" align="center">
            <Icon source={UploadIcon} tone="subdued" />
            <Text variant="bodyMd" alignment="center">
              Drag and drop your file here, or click to browse
            </Text>
            <Text variant="bodySm" tone="subdued" alignment="center">
              {accept.replace(/image\//g, '').toUpperCase()} • Max {(maxSize / 1024 / 1024).toFixed(0)}MB
            </Text>
          </BlockStack>
        )}
      </Box>

      {/* Error Display */}
      {displayError && (
        <Banner tone="critical">
          <Text>{displayError}</Text>
        </Banner>
      )}

      {/* Image Editor */}
      <ImageEditor
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        imageUrl={value?.previewUrl}
        onSave={handleEditorSave}
        title={`Edit ${label}`}
      />
    </BlockStack>
  );
}

export default FileUpload;