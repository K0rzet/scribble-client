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

const BATCH_INTERVAL = 50; // Send batches every 50ms (20fps)

export default function Canvas({ color, lineWidth, tool }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const { isDrawer, gameState, submitGalleryDrawing, submitTelephoneDrawing } = useGame();
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState(gameState?.timeLeft || 0);

  useEffect(() => {
    if (!socket) return;
    const handleTimer = (data: { timeLeft: number }) => {
      setTimeLeft(data.timeLeft);
    };
    socket.on('timer-update', handleTimer);
    return () => {
      socket.off('timer-update', handleTimer);
    };
  }, [socket]);

  // Keep local timer in sync with server state to avoid stale zero
  useEffect(() => {
    if (typeof gameState?.timeLeft === 'number') {
      setTimeLeft(gameState.timeLeft);
    }
  }, [gameState?.timeLeft, gameState?.state, gameState?.currentRound]);

  const isGalleryMode = gameState?.state === 'allDrawing';
  const isTelephoneDraw = gameState?.state === 'chainDraw' && isDrawer;
  
  const showReadyButton = (isGalleryMode || isTelephoneDraw) && !isReady;
  const showReadyOverlay = (isGalleryMode || isTelephoneDraw) && isReady;

  useEffect(() => {
    if (
      gameState?.state !== 'allDrawing' &&
      gameState?.state !== 'chainDraw'
    ) {
      setIsReady(false);
    }
  }, [gameState?.state]);

  const handleSubmitDrawing = useCallback(() => {
    if (isReady || !canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
    if (isGalleryMode) {
      submitGalleryDrawing(dataUrl);
    } else if (isTelephoneDraw) {
      submitTelephoneDrawing(dataUrl);
    }
    setIsReady(true);
  }, [isReady, isGalleryMode, isTelephoneDraw, submitGalleryDrawing, submitTelephoneDrawing]);

  // Auto-submit when time runs out for modes that require a picture snapshot
  useEffect(() => {
    if (timeLeft <= 0 && (isGalleryMode || isTelephoneDraw) && !isReady) {
      handleSubmitDrawing();
    }
  }, [timeLeft, isGalleryMode, isTelephoneDraw, isReady, handleSubmitDrawing]);

  // Batching state
  const drawBatchRef = useRef<DrawAction[]>([]);
  const batchTimerRef = useRef<number | null>(null);

  // Canvas size
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Store all received draw actions locally for replay on resize
  const allActionsRef = useRef<DrawAction[]>([]);

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

  // ─── Batch sender ────────────────────────────────────────────
  const flushBatch = useCallback(() => {
    if (drawBatchRef.current.length > 0 && socket) {
      socket.emit('draw-batch', drawBatchRef.current);
      drawBatchRef.current = [];
    }
  }, [socket]);

  const queueDrawAction = useCallback((action: DrawAction) => {
    // Also store locally for replay on resize (drawer's own strokes)
    allActionsRef.current.push(action);
    drawBatchRef.current.push(action);
    // 'start' and 'end' events flush immediately for responsiveness
    if (action.type === 'start' || action.type === 'end' || action.type === 'fill') {
      flushBatch();
    }
  }, [flushBatch]);

  // Start/stop batch interval
  useEffect(() => {
    if (isDrawer) {
      batchTimerRef.current = window.setInterval(flushBatch, BATCH_INTERVAL);
    }
    return () => {
      if (batchTimerRef.current) {
        window.clearInterval(batchTimerRef.current);
        batchTimerRef.current = null;
      }
      flushBatch(); // flush remaining
    };
  }, [isDrawer, flushBatch]);

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

  // Flood fill — optimized scanline algorithm with Uint8Array
  const floodFill = useCallback(
    (x: number, y: number, fillColor: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const px = Math.floor(x * w);
      const py = Math.floor(y * h);
      if (px < 0 || px >= w || py < 0 || py >= h) return;

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      const targetColor = getPixelColor(data, px, py, w);
      const fillRgb = hexToRgb(fillColor);
      if (!fillRgb) return;

      // Same color — no-op
      if (
        Math.abs(targetColor[0] - fillRgb.r) <= 2 &&
        Math.abs(targetColor[1] - fillRgb.g) <= 2 &&
        Math.abs(targetColor[2] - fillRgb.b) <= 2
      ) return;

      const visited = new Uint8Array(w * h);
      const tolerance = 30;

      const matchTarget = (idx: number): boolean => {
        const i = idx * 4;
        return (
          Math.abs(data[i] - targetColor[0]) <= tolerance &&
          Math.abs(data[i + 1] - targetColor[1]) <= tolerance &&
          Math.abs(data[i + 2] - targetColor[2]) <= tolerance
        );
      };

      const setPixel = (idx: number) => {
        const i = idx * 4;
        data[i] = fillRgb.r;
        data[i + 1] = fillRgb.g;
        data[i + 2] = fillRgb.b;
        data[i + 3] = 255;
      };

      // Scanline flood fill — much faster than per-pixel stack
      const stack: number[] = [py * w + px];
      visited[py * w + px] = 1;

      while (stack.length > 0) {
        const idx = stack.pop()!;
        const cy = (idx / w) | 0;
        const cx = idx % w;

        // Scan left
        let lx = cx;
        while (lx > 0 && !visited[cy * w + lx - 1] && matchTarget(cy * w + lx - 1)) {
          lx--;
          visited[cy * w + lx] = 1;
        }

        // Scan right
        let rx = cx;
        while (rx < w - 1 && !visited[cy * w + rx + 1] && matchTarget(cy * w + rx + 1)) {
          rx++;
          visited[cy * w + rx] = 1;
        }

        // Fill the entire scanline
        for (let sx = lx; sx <= rx; sx++) {
          const sIdx = cy * w + sx;
          visited[sIdx] = 1;
          setPixel(sIdx);

          // Check above
          if (cy > 0) {
            const aboveIdx = (cy - 1) * w + sx;
            if (!visited[aboveIdx] && matchTarget(aboveIdx)) {
              visited[aboveIdx] = 1;
              stack.push(aboveIdx);
            }
          }
          // Check below
          if (cy < h - 1) {
            const belowIdx = (cy + 1) * w + sx;
            if (!visited[belowIdx] && matchTarget(belowIdx)) {
              visited[belowIdx] = 1;
              stack.push(belowIdx);
            }
          }
        }
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
      if (!isDrawer || isReady) return;
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
        queueDrawAction(action);
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
      queueDrawAction(action);
    },
    [isDrawer, getPos, tool, color, lineWidth, drawDot, floodFill, queueDrawAction]
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
      queueDrawAction(action);
    },
    [isDrawer, getPos, tool, color, lineWidth, drawLine, queueDrawAction]
  );

  const handleEnd = useCallback(() => {
    if (!isDrawer || !isDrawing.current) return;
    isDrawing.current = false;
    lastPos.current = null;

    const action: DrawAction = { type: 'end' };
    queueDrawAction(action);
  }, [isDrawer, queueDrawAction]);

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

  // Replay a list of draw actions onto the canvas
  const replayActions = useCallback(
    (actions: DrawAction[]) => {
      let rp: { x: number; y: number } | null = null;
      let rc = '#000000';
      let rw = 3;
      for (const a of actions) {
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
    },
    [drawLine, drawDot, floodFill]
  );

  // Receive draw actions from other players
  useEffect(() => {
    if (!socket) return;

    let remoteLastPos: { x: number; y: number } | null = null;
    let remoteColor = '#000000';
    let remoteWidth = 3;

    const processAction = (action: DrawAction) => {
      // Store locally for replay on resize
      allActionsRef.current.push(action);

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

    const handleDrawAction = (action: DrawAction) => {
      processAction(action);
    };

    const handleDrawBatch = (actions: DrawAction[]) => {
      for (const action of actions) {
        processAction(action);
      }
    };

    const handleClear = () => {
      allActionsRef.current = [];
      clearCanvas();
    };

    const handleFullState = (data: { actions: DrawAction[] }) => {
      allActionsRef.current = [...data.actions];
      clearCanvas();
      replayActions(data.actions);
    };

    const handleClearCanvasEvent = () => {
      allActionsRef.current = [];
      clearCanvas();
    };

    socket.on('draw-action', handleDrawAction);
    socket.on('draw-batch', handleDrawBatch);
    socket.on('canvas-cleared', handleClear);
    socket.on('clear-canvas', handleClearCanvasEvent);
    socket.on('full-draw-state', handleFullState);

    return () => {
      socket.off('draw-action', handleDrawAction);
      socket.off('draw-batch', handleDrawBatch);
      socket.off('canvas-cleared', handleClear);
      socket.off('clear-canvas', handleClearCanvasEvent);
      socket.off('full-draw-state', handleFullState);
    };
  }, [socket, drawLine, drawDot, clearCanvas, floodFill, replayActions]);

  // Local undo/clear logic for modes where the server doesn't track drawing (e.g. Gallery, Telephone)
  useEffect(() => {
    const handleLocalUndo = () => {
      const actions = allActionsRef.current;
      const lastStartIdx = actions.map(a => a.type).lastIndexOf('start');
      if (lastStartIdx >= 0) {
        allActionsRef.current = actions.slice(0, lastStartIdx);
        clearCanvas();
        replayActions(allActionsRef.current);
      }
    };

    const handleLocalClear = () => {
      allActionsRef.current = [];
      clearCanvas();
    };

    window.addEventListener('local-undo', handleLocalUndo);
    window.addEventListener('local-clear', handleLocalClear);

    return () => {
      window.removeEventListener('local-undo', handleLocalUndo);
      window.removeEventListener('local-clear', handleLocalClear);
    };
  }, [clearCanvas, replayActions]);

  // Clear local snapshot canvas between rounds/steps for local-only modes
  useEffect(() => {
    if (
      gameState?.state === 'chainDraw' ||
      gameState?.state === 'allDrawing' ||
      gameState?.state === 'roundEnd' ||
      gameState?.state === 'choosing' ||
      gameState?.state === 'waiting'
    ) {
      allActionsRef.current = [];
      clearCanvas();
    }
  }, [gameState?.state, gameState?.drawerId, gameState?.currentRound, clearCanvas]);

  // On resize: replay all stored actions so canvas stays in sync
  useEffect(() => {
    clearCanvas();
    // Use requestAnimationFrame to ensure canvas is ready after size change
    const raf = requestAnimationFrame(() => {
      if (allActionsRef.current.length > 0) {
        replayActions(allActionsRef.current);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [canvasSize, clearCanvas, replayActions]);

  // On first mount or reconnect: request full draw state from server
  useEffect(() => {
    if (!socket) return;
    socket.emit('request-draw-state');
  }, [socket]);

  // ─── Custom cursor state ─────────────────────────────────────
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [cursorVisible, setCursorVisible] = useState(false);

  // Track mouse position over canvas for custom cursor
  // Position relative to canvasWrapper (containerRef), not canvas itself
  useEffect(() => {
    const wrapper = containerRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas || !isDrawer) return;

    const handleMouseMove = (e: MouseEvent) => {
      const wrapperRect = wrapper.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      // Offset from wrapper to canvas
      const offsetX = canvasRect.left - wrapperRect.left;
      const offsetY = canvasRect.top - wrapperRect.top;
      setCursorPos({
        x: (e.clientX - canvasRect.left) + offsetX,
        y: (e.clientY - canvasRect.top) + offsetY,
      });
    };
    const handleMouseEnter = () => setCursorVisible(true);
    const handleMouseLeave = () => setCursorVisible(false);

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseenter', handleMouseEnter);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseenter', handleMouseEnter);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isDrawer]);

  // Compute cursor size in screen pixels based on canvas scale
  const cursorScreenSize = (() => {
    if (!canvasRef.current) return lineWidth;
    const canvas = canvasRef.current;
    const scaleRatio = canvas.getBoundingClientRect().width / canvas.width;
    return Math.max(6, lineWidth * scaleRatio);
  })();

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
      {/* Custom brush cursor */}
      {isDrawer && !isReady && cursorVisible && cursorPos && (
        <div
          className={`${styles.customCursor} ${
            tool === 'eraser'
              ? styles.cursorEraser
              : tool === 'fill'
                ? styles.cursorFill
                : styles.cursorPen
          }`}
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            width: tool === 'fill' ? 24 : cursorScreenSize,
            height: tool === 'fill' ? 24 : cursorScreenSize,
            borderColor:
              tool === 'eraser'
                ? 'rgba(0,0,0,0.5)'
                : tool === 'fill'
                  ? 'rgba(0,0,0,0.6)'
                  : color === '#ffffff' || color === '#ffff00'
                    ? 'rgba(0,0,0,0.5)'
                    : color,
          }}
        />
      )}
      {showReadyButton && (
        <button 
          className={styles.galleryReadyBtn}
          onClick={handleSubmitDrawing}
        >
          Готов!
        </button>
      )}
      
      {showReadyOverlay && (
        <div className={styles.galleryReadyOverlay}>
          ☑️ Рисунок отправлен. Ожидаем...
        </div>
      )}

      <div className={styles.watermark}>Scribble Yandex</div>
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
