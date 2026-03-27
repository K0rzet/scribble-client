import { useGame } from '../contexts/GameContext';
import styles from './WordSelector.module.css';

export default function WordSelector() {
  const { wordChoices, chooseWord, gameState } = useGame();

  if (wordChoices.length === 0 || gameState?.state !== 'choosing') return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>🎯 Выберите слово</h2>
        <p className={styles.subtitle}>Выберите слово, которое вы будете рисовать</p>
        <div className={styles.words}>
          {wordChoices.map((word) => (
            <button
              key={word}
              className={styles.wordBtn}
              onClick={() => chooseWord(word)}
            >
              {word}
            </button>
          ))}
        </div>
        <div className={styles.timer}>
          ⏰ Автовыбор через {gameState.timeLeft} сек
        </div>
      </div>
    </div>
  );
}
