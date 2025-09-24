import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  BlockStack,
  InlineStack,
  Text,
  Button,
  RangeSlider,
  ButtonGroup,
  Card,
  Divider,
  Box
} from '@shopify/polaris';
import { RefreshIcon, SelectIcon, ViewIcon } from '@shopify/polaris-icons';

export function ImageEditor({ 
  isOpen, 
  onClose, 
  imageUrl, 
  onSave,
  title = "Edit Image"
}) {
  const canvasRef = useRef(null);
  const [image, setImage] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [editMode, setEditMode] = useState('crop'); // 'crop', 'rotate', 'resize'

  // Load image when URL changes
  useEffect(() => {
    if (imageUrl && isOpen) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setImage(img);
        setCropArea({ x: 0, y: 0, width: img.width, height: img.height });
      };
      img.src = imageUrl;
    }
  }, [imageUrl, isOpen]);

  // Draw image on canvas
  const drawImage = useCallback(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 400;
    canvas.height = 400;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save context
    ctx.save();
    
    // Apply transformations
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    
    // Calculate image dimensions to fit canvas
    const aspectRatio = image.width / image.height;
    let drawWidth = canvas.width * 0.8;
    let drawHeight = drawWidth / aspectRatio;
    
    if (drawHeight > canvas.height * 0.8) {
      drawHeight = canvas.height * 0.8;
      drawWidth = drawHeight * aspectRatio;
    }
    
    // Draw image
    ctx.drawImage(
      image,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );
    
    // Restore context
    ctx.restore();
    
    // Draw crop overlay if in crop mode
    if (editMode === 'crop') {
      ctx.strokeStyle = '#007ace';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      const cropX = (cropArea.x / image.width) * drawWidth + (canvas.width - drawWidth) / 2;
      const cropY = (cropArea.y / image.height) * drawHeight + (canvas.height - drawHeight) / 2;
      const cropW = (cropArea.width / image.width) * drawWidth;
      const cropH = (cropArea.height / image.height) * drawHeight;
      
      ctx.strokeRect(cropX, cropY, cropW, cropH);
      
      // Darken areas outside crop
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, cropY);
      ctx.fillRect(0, cropY + cropH, canvas.width, canvas.height - cropY - cropH);
      ctx.fillRect(0, cropY, cropX, cropH);
      ctx.fillRect(cropX + cropW, cropY, canvas.width - cropX - cropW, cropH);
    }
  }, [image, rotation, scale, cropArea, editMode]);

  // Redraw when dependencies change
  useEffect(() => {
    drawImage();
  }, [drawImage]);

  // Handle mouse events for crop area
  const handleMouseDown = useCallback((e) => {
    if (editMode !== 'crop') return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDragging(true);
    setDragStart({ x, y });
  }, [editMode]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || editMode !== 'crop') return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;
    
    setCropArea(prev => ({
      ...prev,
      x: Math.max(0, Math.min(image.width - prev.width, prev.x + deltaX)),
      y: Math.max(0, Math.min(image.height - prev.height, prev.y + deltaY))
    }));
    
    setDragStart({ x, y });
  }, [isDragging, dragStart, editMode, image]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Reset transformations
  const handleReset = () => {
    setRotation(0);
    setScale(1);
    if (image) {
      setCropArea({ x: 0, y: 0, width: image.width, height: image.height });
    }
  };

  // Save edited image
  const handleSave = () => {
    if (!image || !canvasRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set output canvas size based on crop area
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;
    
    // Apply transformations and crop
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    
    ctx.drawImage(
      image,
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height,
      -canvas.width / 2,
      -canvas.height / 2,
      canvas.width,
      canvas.height
    );
    
    ctx.restore();
    
    // Convert to blob and call onSave
    canvas.toBlob((blob) => {
      const editedUrl = URL.createObjectURL(blob);
      onSave({
        blob,
        url: editedUrl,
        width: canvas.width,
        height: canvas.height
      });
      onClose();
    }, 'image/png');
  };

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={title}
      primaryAction={{
        content: 'Save Changes',
        onAction: handleSave,
        disabled: !image
      }}
      secondaryActions={[
        {
          content: 'Reset',
          onAction: handleReset
        },
        {
          content: 'Cancel',
          onAction: onClose
        }
      ]}
      large
    >
      <Modal.Section>
        <BlockStack gap="400">
          {/* Edit Mode Selector */}
          <Card>
            <BlockStack gap="300">
              <Text variant="headingSm">Edit Mode</Text>
              <ButtonGroup segmented>
                <Button
                  pressed={editMode === 'crop'}
                  onClick={() => setEditMode('crop')}
                  icon={SelectIcon}
                >
                  Crop
                </Button>
                <Button
                  pressed={editMode === 'rotate'}
                  onClick={() => setEditMode('rotate')}
                  icon={RefreshIcon}
                >
                  Rotate
                </Button>
                <Button
                  pressed={editMode === 'resize'}
                  onClick={() => setEditMode('resize')}
                  icon={ViewIcon}
                >
                  Scale
                </Button>
              </ButtonGroup>
            </BlockStack>
          </Card>

          {/* Canvas */}
          <Card>
            <BlockStack gap="300">
              <Text variant="headingSm">Preview</Text>
              <Box
                borderWidth="1"
                borderColor="subdued"
                borderRadius="200"
                padding="200"
                background="surface-neutral-subdued"
              >
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    height: 'auto',
                    cursor: editMode === 'crop' ? 'crosshair' : 'default',
                    display: 'block',
                    margin: '0 auto'
                  }}
                />
              </Box>
            </BlockStack>
          </Card>

          {/* Controls */}
          <Card>
            <BlockStack gap="400">
              <Text variant="headingSm">Controls</Text>
              
              {editMode === 'rotate' && (
                <BlockStack gap="200">
                  <Text variant="bodyMd">Rotation: {rotation}°</Text>
                  <RangeSlider
                    label="Rotation"
                    value={rotation}
                    onChange={setRotation}
                    min={-180}
                    max={180}
                    step={1}
                    output
                  />
                </BlockStack>
              )}

              {editMode === 'resize' && (
                <BlockStack gap="200">
                  <Text variant="bodyMd">Scale: {Math.round(scale * 100)}%</Text>
                  <RangeSlider
                    label="Scale"
                    value={scale}
                    onChange={setScale}
                    min={0.1}
                    max={3}
                    step={0.1}
                    output
                  />
                </BlockStack>
              )}

              {editMode === 'crop' && (
                <BlockStack gap="200">
                  <Text variant="bodyMd">Crop Area</Text>
                  <Text variant="bodySm" tone="subdued">
                    Click and drag on the preview to adjust the crop area
                  </Text>
                  <InlineStack gap="300">
                    <Text variant="bodySm">
                      Size: {cropArea.width} × {cropArea.height}px
                    </Text>
                    <Text variant="bodySm">
                      Position: ({cropArea.x}, {cropArea.y})
                    </Text>
                  </InlineStack>
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

export default ImageEditor;