import { useGame } from '../contexts/GameContext';
import styles from './WordSelector.module.css';

export default function WordSelector() {
  const { wordChoices, chooseWord, gameState } = useGame();

  if (wordChoices.length === 0 || gameState?.state !== 'choosing') return null;

  const chooseTime = gameState?.settings.chooseTime || 15;
  const timeLeft = gameState?.timeLeft ?? chooseTime;
  const progress = (timeLeft / chooseTime) * 100;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>✏️ Выберите слово</h2>
        <p className={styles.subtitle}>Нажмите на слово, которое будете рисовать</p>
        <div className={styles.words}>
          {wordChoices.map((entry) => (
            <button
              key={entry.word}
              className={styles.wordBtn}
              onClick={() => chooseWord(entry.word)}
            >
              {entry.word}
              <span className={styles.wordCategory}>📁 {entry.category}</span>
            </button>
          ))}
        </div>
        <div className={styles.timerSection}>
          <div className={styles.timerText}>
            ⏰ Автовыбор через {timeLeft} сек
          </div>
          <div className={styles.timerBar}>
            <div
              className={styles.timerBarFill}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
