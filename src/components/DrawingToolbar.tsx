import styles from './DrawingToolbar.module.css';
import { useGame } from '../contexts/GameContext';

const COLORS = [
  '#000000', '#ffffff', '#808080', '#c0c0c0',
  '#ff0000', '#ff6b00', '#ffb347', '#ffff00',
  '#4ade80', '#00c853', '#00bcd4', '#2196f3',
  '#3f51b5', '#7c5cfc', '#9c27b0', '#ff6bcb',
  '#795548', '#ff8a80', '#ffd54f', '#a5d6a7',
];

interface DrawingToolbarProps {
  color: string;
  lineWidth: number;
  tool: 'pen' | 'eraser' | 'fill';
  onColorChange: (color: string) => void;
  onLineWidthChange: (width: number) => void;
  onToolChange: (tool: 'pen' | 'eraser' | 'fill') => void;
}

export default function DrawingToolbar({
  color,
  lineWidth,
  tool,
  onColorChange,
  onLineWidthChange,
  onToolChange,
}: DrawingToolbarProps) {
  const { clearCanvas, undoDraw, isDrawer } = useGame();

  if (!isDrawer) return null;

  const previewColor = tool === 'eraser' ? '#ffffff' : color;
  const previewSize = Math.max(4, Math.min(lineWidth, 32));

  return (
    <div className={styles.toolbar}>
      {/* Color palette */}
      <div className={styles.colorPalette}>
        {COLORS.map((c) => (
          <button
            key={c}
            className={`${styles.colorBtn} ${color === c && tool !== 'eraser' ? styles.active : ''}`}
            style={{ background: c }}
            onClick={() => {
              onColorChange(c);
              if (tool === 'eraser') onToolChange('pen');
            }}
          />
        ))}
      </div>

      <div className={styles.separator} />

      {/* Brush preview + size slider */}
      <div className={styles.sizeSection}>
        <div className={styles.brushPreview} title={`Размер: ${lineWidth}px`}>
          <div
            className={styles.brushDot}
            style={{
              width: previewSize,
              height: previewSize,
              backgroundColor: previewColor,
              borderRadius: '50%',
              border: previewColor === '#ffffff' ? '1.5px solid rgba(0,0,0,0.3)' : 'none',
            }}
          />
        </div>
        <div className={styles.sizeSlider}>
          <span className={styles.sizeLabel}>{lineWidth}px</span>
          <input
            type="range"
            className={styles.slider}
            min={1}
            max={60}
            value={lineWidth}
            onChange={(e) => onLineWidthChange(Number(e.target.value))}
          />
        </div>
      </div>

      <div className={styles.separator} />

      {/* Tools */}
      <div className={styles.toolGroup}>
        <button
          className={`${styles.toolBtn} ${tool === 'pen' ? styles.active : ''}`}
          onClick={() => onToolChange('pen')}
          title="Карандаш (B)"
        >
          <span className={styles.toolIcon}>✏️</span>
          <span className={styles.toolLabel}>Кисть</span>
        </button>
        <button
          className={`${styles.toolBtn} ${tool === 'eraser' ? styles.active : ''}`}
          onClick={() => onToolChange('eraser')}
          title="Ластик (E)"
        >
          <span className={styles.toolIcon}>🧹</span>
          <span className={styles.toolLabel}>Ластик</span>
        </button>
        <button
          className={`${styles.toolBtn} ${tool === 'fill' ? styles.active : ''}`}
          onClick={() => onToolChange('fill')}
          title="Заливка (G)"
        >
          <span className={styles.toolIcon}>🪣</span>
          <span className={styles.toolLabel}>Заливка</span>
        </button>
      </div>

      <div className={styles.separator} />

      {/* Actions */}
      <div className={styles.actionGroup}>
        <button
          className={styles.actionBtn}
          onClick={undoDraw}
          title="Отменить (Ctrl+Z)"
        >
          ↩️
        </button>
        <button
          className={styles.actionBtn}
          onClick={clearCanvas}
          title="Очистить (Delete)"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
