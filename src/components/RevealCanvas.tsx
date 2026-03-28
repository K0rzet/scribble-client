import styles from './RevealCanvas.module.css';

interface Props {
  imageUrl: string;    // empty → single-player (no image, hint only)
  progress: number;    // 0..100
  hint: string;        // progressive letter hint
  category: string;
  isMyDrawing: boolean; // I was the drawer — show unblurred
}

export default function RevealCanvas({ imageUrl, progress, hint, category, isMyDrawing }: Props) {
  // Blur decreases as progress increases
  const blurPx = Math.max(0, Math.round(26 * (1 - progress / 100)));
  const darkOverlay = Math.max(0, 0.7 * (1 - progress / 100));

  const progressLabel =
    progress < 15  ? '👁️ Присматривайтесь...' :
    progress < 40  ? '🔍 Картинка проясняется...' :
    progress < 70  ? '🧐 Почти видно!' :
    progress < 100 ? '👀 Видно отчётливо!' :
                     '🖼️ Полностью открыто!';

  // ── Drawer: see their own drawing clearly ─────────────────
  if (isMyDrawing && imageUrl) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.drawerBanner}>
          🎨 Ваш рисунок угадывают другие игроки
        </div>

        <div className={styles.progressBarWrap}>
          <div className={styles.progressBarFill} style={{ width: `${progress}%` }} />
          <span className={styles.progressPct}>{progress}% открыто</span>
        </div>

        <div className={styles.imageContainer}>
          <img src={imageUrl} alt="Мой рисунок" className={styles.imageClear} />
        </div>

        <div className={styles.hintRow}>
          <span className={styles.hintLabel}>Подсказка для других:</span>
          <span className={styles.hintLetters}>{hint}</span>
        </div>
      </div>
    );
  }

  // ── Single player: no image, only letter hints ─────────────
  if (!imageUrl) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.categoryBadge}>📁 {category}</div>

        <div className={styles.progressBarWrap}>
          <div className={styles.progressBarFill} style={{ width: `${progress}%` }} />
          <span className={styles.progressPct}>{progress}% подсказок</span>
        </div>

        <div className={styles.soloHintBlock}>
          <div className={styles.soloHintTitle}>Угадайте слово</div>
          <div className={styles.soloHintLetters}>{hint}</div>
          <div className={styles.soloHintSub}>
            Буквы открываются каждые 3 секунды
          </div>
        </div>
      </div>
    );
  }

  // ── Multiplayer guesser: progressively un-blurred image ───
  return (
    <div className={styles.wrapper}>
      <div className={styles.categoryBadge}>📁 {category}</div>

      <div className={styles.imageContainer}>
        <img
          src={imageUrl}
          alt="Угадайте что нарисовано"
          className={styles.imageBlurred}
          style={{ filter: `blur(${blurPx}px)` }}
        />
        {/* Dark overlay fades away as image reveals */}
        <div className={styles.darkOverlay} style={{ opacity: darkOverlay }} />
        <div className={styles.progressLabel}>{progressLabel}</div>
      </div>

      <div className={styles.progressBarWrap}>
        <div className={styles.progressBarFill} style={{ width: `${progress}%` }} />
        <span className={styles.progressPct}>{progress}% открыто</span>
      </div>

      <div className={styles.hintRow}>
        <span className={styles.hintLabel}>Подсказка:</span>
        <span className={styles.hintLetters}>{hint}</span>
      </div>
    </div>
  );
}
