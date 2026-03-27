import { useRef, useEffect, useCallback, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useGame } from '../contexts/GameContext';
import type { DrawAction } from '../contexts/GameContext';
import styles from './Canvas.module.css';

interface CanvasProps {
  color: string;
  lineWidth: number;
  tool: 'pen' | 'eraser' | 'fill';
}

export default function Canvas({ color, lineWidth, tool }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const { isDrawer, gameState } = useGame();
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Canvas size
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Resize canvas to fit container
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const aspectRatio = 4 / 3;
      let w = rect.width - 4;
      let h = rect.height - 4;

      if (w / h > aspectRatio) {
        w = h * aspectRatio;
      } else {
        h = w / aspectRatio;
      }

      setCanvasSize({ width: Math.floor(w), height: Math.floor(h) });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Get position relative to canvas (normalized 0..1)
  const getPos = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const clientX =
        'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY =
        'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY;

      return {
        x: (clientX - rect.left) / rect.width,
        y: (clientY - rect.top) / rect.height,
      };
    },
    []
  );

  // Draw a line segment on canvas
  const drawLine = useCallback(
    (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      strokeColor: string,
      strokeWidth: number
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(x1 * canvas.width, y1 * canvas.height);
      ctx.lineTo(x2 * canvas.width, y2 * canvas.height);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    },
    []
  );

  // Draw a dot
  const drawDot = useCallback(
    (x: number, y: number, dotColor: string, dotWidth: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.beginPath();
      ctx.arc(
        x * canvas.width,
        y * canvas.height,
        dotWidth / 2,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = dotColor;
      ctx.fill();
    },
    []
  );

  // Flood fill
  const floodFill = useCallback(
    (x: number, y: number, fillColor: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const px = Math.floor(x * canvas.width);
      const py = Math.floor(y * canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const targetColor = getPixelColor(data, px, py, canvas.width);

      // Parse fill color
      const fillRgb = hexToRgb(fillColor);
      if (!fillRgb) return;

      if (
        targetColor[0] === fillRgb.r &&
        targetColor[1] === fillRgb.g &&
        targetColor[2] === fillRgb.b
      )
        return;

      const stack: [number, number][] = [[px, py]];
      const visited = new Set<string>();

      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        const key = `${cx},${cy}`;
        if (visited.has(key)) continue;
        if (cx < 0 || cx >= canvas.width || cy < 0 || cy >= canvas.height)
          continue;

        const currentColor = getPixelColor(data, cx, cy, canvas.width);
        if (!colorsMatch(currentColor, targetColor, 30)) continue;

        visited.add(key);
        const idx = (cy * canvas.width + cx) * 4;
        data[idx] = fillRgb.r;
        data[idx + 1] = fillRgb.g;
        data[idx + 2] = fillRgb.b;
        data[idx + 3] = 255;

        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }

      ctx.putImageData(imageData, 0, 0);
    },
    []
  );

  // Clear canvas to white
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Draw start (mouse/touch)
  const handleStart = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDrawer) return;
      e.preventDefault();

      const pos = getPos(e);

      if (tool === 'fill') {
        floodFill(pos.x, pos.y, color);
        const action: DrawAction = {
          type: 'fill',
          x: pos.x,
          y: pos.y,
          fillColor: color,
        };
        socket?.emit('draw', action);
        return;
      }

      isDrawing.current = true;
      lastPos.current = pos;

      const strokeColor = tool === 'eraser' ? '#ffffff' : color;
      drawDot(pos.x, pos.y, strokeColor, lineWidth);

      const action: DrawAction = {
        type: 'start',
        x: pos.x,
        y: pos.y,
        color: strokeColor,
        lineWidth,
      };
      socket?.emit('draw', action);
    },
    [isDrawer, getPos, tool, color, lineWidth, drawDot, floodFill, socket]
  );

  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDrawer || !isDrawing.current) return;
      e.preventDefault();

      const pos = getPos(e);
      const last = lastPos.current;
      if (!last) return;

      const strokeColor = tool === 'eraser' ? '#ffffff' : color;
      drawLine(last.x, last.y, pos.x, pos.y, strokeColor, lineWidth);
      lastPos.current = pos;

      const action: DrawAction = {
        type: 'draw',
        x: pos.x,
        y: pos.y,
        color: strokeColor,
        lineWidth,
      };
      socket?.emit('draw', action);
    },
    [isDrawer, getPos, tool, color, lineWidth, drawLine, socket]
  );

  const handleEnd = useCallback(() => {
    if (!isDrawer || !isDrawing.current) return;
    isDrawing.current = false;
    lastPos.current = null;

    const action: DrawAction = { type: 'end' };
    socket?.emit('draw', action);
  }, [isDrawer, socket]);

  // Attach mouse/touch events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleEnd);
    canvas.addEventListener('touchcancel', handleEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseup', handleEnd);
      canvas.removeEventListener('mouseleave', handleEnd);
      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('touchend', handleEnd);
      canvas.removeEventListener('touchcancel', handleEnd);
    };
  }, [handleStart, handleMove, handleEnd]);

  // Receive draw actions from other players
  useEffect(() => {
    if (!socket) return;

    let remoteLastPos: { x: number; y: number } | null = null;
    let remoteColor = '#000000';
    let remoteWidth = 3;

    const handleDrawAction = (action: DrawAction) => {
      if (action.type === 'start') {
        remoteLastPos = { x: action.x!, y: action.y! };
        remoteColor = action.color || '#000000';
        remoteWidth = action.lineWidth || 3;
        drawDot(action.x!, action.y!, remoteColor, remoteWidth);
      } else if (action.type === 'draw' && remoteLastPos) {
        drawLine(
          remoteLastPos.x,
          remoteLastPos.y,
          action.x!,
          action.y!,
          action.color || remoteColor,
          action.lineWidth || remoteWidth
        );
        remoteLastPos = { x: action.x!, y: action.y! };
      } else if (action.type === 'end') {
        remoteLastPos = null;
      } else if (action.type === 'fill') {
        floodFill(action.x!, action.y!, action.fillColor || '#000000');
      }
    };

    const handleClear = () => {
      clearCanvas();
    };

    const handleFullState = (data: { actions: DrawAction[] }) => {
      clearCanvas();
      // Replay all actions
      let rp: { x: number; y: number } | null = null;
      let rc = '#000000';
      let rw = 3;
      for (const a of data.actions) {
        if (a.type === 'start') {
          rp = { x: a.x!, y: a.y! };
          rc = a.color || '#000000';
          rw = a.lineWidth || 3;
          drawDot(a.x!, a.y!, rc, rw);
        } else if (a.type === 'draw' && rp) {
          drawLine(rp.x, rp.y, a.x!, a.y!, a.color || rc, a.lineWidth || rw);
          rp = { x: a.x!, y: a.y! };
        } else if (a.type === 'end') {
          rp = null;
        } else if (a.type === 'fill') {
          floodFill(a.x!, a.y!, a.fillColor || '#000000');
        }
      }
    };

    socket.on('draw-action', handleDrawAction);
    socket.on('canvas-cleared', handleClear);
    socket.on('full-draw-state', handleFullState);

    return () => {
      socket.off('draw-action', handleDrawAction);
      socket.off('canvas-cleared', handleClear);
      socket.off('full-draw-state', handleFullState);
    };
  }, [socket, drawLine, drawDot, clearCanvas, floodFill]);

  // Clear canvas on new round/state change
  useEffect(() => {
    if (gameState?.state === 'choosing' || gameState?.state === 'waiting') {
      clearCanvas();
    }
  }, [gameState?.state, clearCanvas]);

  // Initialize white canvas
  useEffect(() => {
    clearCanvas();
  }, [canvasSize, clearCanvas]);

  return (
    <div
      ref={containerRef}
      className={`${styles.canvasWrapper} ${isDrawer ? styles.isDrawer : ''}`}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ width: canvasSize.width, height: canvasSize.height }}
      />
      <div className={styles.watermark}>Scribble</div>
    </div>
  );
}

// ─── Utility functions ────────────────────────────────────────
function getPixelColor(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number
): [number, number, number, number] {
  const idx = (y * width + x) * 4;
  return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
}

function colorsMatch(
  a: [number, number, number, number],
  b: [number, number, number, number],
  tolerance: number
): boolean {
  return (
    Math.abs(a[0] - b[0]) <= tolerance &&
    Math.abs(a[1] - b[1]) <= tolerance &&
    Math.abs(a[2] - b[2]) <= tolerance
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
