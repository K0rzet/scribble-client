import { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';
import styles from './TelephoneGuess.module.css';

export default function TelephoneGuess() {
  const { gameState, myPlayerId, telephoneImage, submitTelephoneGuess } = useGame();
  const { socket } = useSocket();
  const [guess, setGuess] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(gameState?.timeLeft || 20);

  const isMyTurn = gameState?.state === 'chainGuess' && gameState?.drawerId === myPlayerId;

  // Reset state when turn changes
  useEffect(() => {
    setHasSubmitted(false);
    setGuess('');
    setTimeLeft(gameState?.timeLeft || 20);
  }, [gameState?.drawerId, gameState?.state]);

  // Handle timer
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

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft <= 0 && isMyTurn && !hasSubmitted) {
      handleSubmit();
    }
  }, [timeLeft, isMyTurn, hasSubmitted]);

  if (gameState?.state !== 'chainGuess') return null;

  // If it's chainGuess but not my turn, just show a waiting overlay
  if (!isMyTurn) {
    const activePlayer = gameState.players.find(p => p.id === gameState.drawerId)?.name || 'Аноним';
    return (
      <div className={styles.overlayTransparent}>
        <div className={styles.waitingBadge}>
          📞 Испорченный телефон: сейчас угадывает <strong>{activePlayer}</strong>
        </div>
      </div>
    );
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (hasSubmitted) return;
    setHasSubmitted(true);
    submitTelephoneGuess(guess.trim() || '???');
  };

  return (
    <div className={styles.overlaySolid}>
      <div className={styles.container}>
        <h2 className={styles.title}>📞 Что здесь нарисовано?</h2>
        <div className={styles.timer}>Осталось времени: {timeLeft} сек.</div>

        {telephoneImage ? (
          <img src={telephoneImage} alt="Предыдущий рисунок" className={styles.image} />
        ) : (
          <div className={styles.imagePlaceholder}>Загрузка рисунка...</div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            className={styles.input}
            placeholder="Введите ваше предположение..."
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            disabled={hasSubmitted}
            autoFocus
            maxLength={40}
          />
          <button type="submit" className={styles.btn} disabled={hasSubmitted}>
            Далее
          </button>
        </form>

        {hasSubmitted && (
          <div className={styles.submittedText}>Ответ отправлен! Ожидание...</div>
        )}
      </div>
    </div>
  );
}
