import { useState } from 'react';
import styles from './RevealCanvas.module.css';

const GRID = 8; // 8×8 = 64 tiles
const TOTAL = GRID * GRID;

interface Props {
  imageUrl: string;
  revealedTiles: number[]; // indices 0..63 of revealed tiles
  hint: string;
  category: string;
  progress: number; // 0..100
}

export default function RevealCanvas({ imageUrl, revealedTiles, hint, category, progress }: Props) {
  const [imgError, setImgError] = useState(false);

  const hiddenCount = TOTAL - revealedTiles.length;
  const revealSet   = new Set(revealedTiles);

  const statusLabel =
    progress === 0    ? '🎲 Угадайте что на картинке!' :
    progress < 20     ? '👁️ Присматривайтесь...' :
    progress < 45     ? '🔍 Кое-что видно...' :
    progress < 70     ? '🧐 Картинка проясняется!' :
    progress < 90     ? '👀 Почти видно!' :
                        '🖼️ Картинка открыта полностью!';

  return (
    <div className={styles.wrapper}>
      {/* Category */}
      <div className={styles.topRow}>
        <span className={styles.categoryBadge}>📁 {category}</span>
        <span className={styles.statusLabel}>{statusLabel}</span>
        <span className={styles.tileCount}>{hiddenCount} плиток скрыто</span>
      </div>

      {/* Image with tile overlay */}
      <div className={styles.imageWrap}>
        {!imgError ? (
          <img
            src={imageUrl}
            alt="Угадайте"
            className={styles.image}
            onError={() => setImgError(true)}
            draggable={false}
          />
        ) : (
          <div className={styles.imgFallback}>
            <span>🖼️</span>
            <span>Картинка не загрузилась</span>
          </div>
        )}

        {/* Tile grid overlay */}
        <div
          className={styles.tileGrid}
          style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)`, gridTemplateRows: `repeat(${GRID}, 1fr)` }}
        >
          {Array.from({ length: TOTAL }, (_, i) => {
            const revealed = revealSet.has(i);
            return (
              <div
                key={i}
                className={`${styles.tile} ${revealed ? styles.tileRevealed : styles.tileHidden}`}
              />
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.progressWrap}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <span className={styles.progressPct}>{progress}%</span>
      </div>

      {/* Letter hint */}
      {hint && (
        <div className={styles.hintRow}>
          <span className={styles.hintLabel}>Буквы:</span>
          <span className={styles.hintLetters}>{hint}</span>
        </div>
      )}
    </div>
  );
}
