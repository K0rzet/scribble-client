import { useGame } from '../contexts/GameContext';
import styles from './HintDisplay.module.css';

export default function HintDisplay() {
  const { gameState, isDrawer } = useGame();
  if (!gameState) return null;

  const { state, hint, currentWord } = gameState;

  return (
    <div className={styles.hintDisplay}>
      <span className={styles.roundInfo}>
        Раунд {gameState.currentRound + 1}/{gameState.totalRounds}
      </span>

      {state === 'drawing' && (
        <>
          {isDrawer ? (
            <span className={styles.wordText}>
              🎨 Рисуйте: {currentWord}
            </span>
          ) : (
            <span className={styles.hintText}>{hint || '...'}</span>
          )}
        </>
      )}

      {state === 'choosing' && (
        <span className={styles.stateText}>
          {isDrawer ? '🎯 Выберите слово...' : '⏳ Рисующий выбирает слово...'}
        </span>
      )}

      {state === 'roundEnd' && (
        <span className={styles.stateText}>
          📊 Результаты раунда...
        </span>
      )}

      {state === 'gameEnd' && (
        <span className={styles.stateText}>
          🏆 Игра окончена!
        </span>
      )}
    </div>
  );
}
