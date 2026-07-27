import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';

interface SignaturePadProps {
  onSave: (blob: Blob) => void | Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 200;

/**
 * Freehand signature capture. Draws on a fixed-resolution white canvas (so the exported PNG
 * reads like ink on paper regardless of the app's dark theme) and exports via canvas.toBlob.
 */
const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onCancel, saving }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    lastPointRef.current = getPoint(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !lastPointRef.current) return;

    const point = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, 'image/png');
  };

  return (
    <VStack align="stretch" spacing={3}>
      <Box borderRadius="md" overflow="hidden" border="1px solid" borderColor="whiteAlpha.300">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none', cursor: 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
        />
      </Box>
      <Text fontSize="xs" color="whiteAlpha.600">
        Draw your signature above using your mouse, trackpad, or touchscreen.
      </Text>
      <HStack justify="space-between">
        <Button size="sm" variant="ghost" onClick={handleClear} isDisabled={!hasDrawn || saving}>
          Clear
        </Button>
        <HStack>
          {onCancel && (
            <Button size="sm" variant="ghost" onClick={onCancel} color="white" isDisabled={saving}>
              Cancel
            </Button>
          )}
          <Button size="sm" variant="gradient" onClick={handleSave} isDisabled={!hasDrawn} isLoading={saving}>
            Save Signature
          </Button>
        </HStack>
      </HStack>
    </VStack>
  );
};

export default SignaturePad;
