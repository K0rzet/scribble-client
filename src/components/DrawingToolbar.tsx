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

      {/* Brush size */}
      <div className={styles.sizeSlider}>
        <span className={styles.sizeLabel}>{lineWidth}</span>
        <input
          type="range"
          className={styles.slider}
          min={1}
          max={30}
          value={lineWidth}
          onChange={(e) => onLineWidthChange(Number(e.target.value))}
        />
      </div>

      <div className={styles.separator} />

      {/* Tools */}
      <button
        className={`${styles.toolBtn} ${tool === 'pen' ? styles.active : ''}`}
        onClick={() => onToolChange('pen')}
        title="Карандаш"
      >
        ✏️
      </button>
      <button
        className={`${styles.toolBtn} ${tool === 'eraser' ? styles.active : ''}`}
        onClick={() => onToolChange('eraser')}
        title="Ластик"
      >
        🧹
      </button>
      <button
        className={`${styles.toolBtn} ${tool === 'fill' ? styles.active : ''}`}
        onClick={() => onToolChange('fill')}
        title="Заливка"
      >
        🪣
      </button>

      <div className={styles.separator} />

      {/* Actions */}
      <button
        className={styles.actionBtn}
        onClick={undoDraw}
        title="Отменить"
      >
        ↩️
      </button>
      <button
        className={styles.actionBtn}
        onClick={clearCanvas}
        title="Очистить"
      >
        🗑️
      </button>
    </div>
  );
}
