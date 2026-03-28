import { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';
import styles from './SpyVoting.module.css';

export default function SpyVoting() {
  const { gameState, myPlayerId, submitSpyVote, galleryDrawings } = useGame();
  const { socket } = useSocket();
  
  const [suspectId, setSuspectId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(gameState?.timeLeft || 30);

  useEffect(() => {
    if (gameState?.state === 'spyVoting') {
      setHasSubmitted(false);
      setSuspectId(null);
      setTimeLeft(gameState.timeLeft);
    }
  }, [gameState?.state, gameState?.currentRound, gameState?.timeLeft]);

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

  if (gameState?.state !== 'spyVoting') return null;

  const handleSelectSuspect = (playerId: string) => {
    if (hasSubmitted || playerId === myPlayerId) return;
    setSuspectId(playerId);
    setHasSubmitted(true);
    submitSpyVote(playerId);
  };

  const myPlayer = gameState.players.find(p => p.id === myPlayerId);
  const amIEliminated = myPlayer?.isEliminated;

  return (
    <div className={styles.votingContainer}>
      <h2 className={styles.title}>🤔 Кто шпион? Чей рисунок самый странный?</h2>
      <div className={styles.timer}>Осталось времени: {timeLeft} сек.</div>
      
      {amIEliminated ? (
        <div className={styles.eliminatedText}>
          Вы выбыли и не можете голосовать. Наблюдайте за интригой!
        </div>
      ) : hasSubmitted ? (
        <div className={styles.submittedText}>
          Ваш голос учтен! Ожидаем остальных...
        </div>
      ) : (
        <div className={styles.submittedText}>
          Выберите один подозрительный рисунок:
        </div>
      )}

      <div className={styles.grid}>
        {galleryDrawings.map((drawing) => {
          const isMe = drawing.playerId === myPlayerId;
          const isSelected = suspectId === drawing.playerId;

          return (
            <div
              key={drawing.playerId}
              className={`
                ${styles.card} 
                ${isSelected ? styles.cardSelected : ''} 
                ${isMe || amIEliminated || hasSubmitted ? styles.cardDisabled : ''}
              `}
              onClick={() => {
                if (!isMe && !amIEliminated && !hasSubmitted) {
                  handleSelectSuspect(drawing.playerId);
                }
              }}
            >
              <div className={styles.imageWrapper}>
                {drawing.dataUrl ? (
                  <img src={drawing.dataUrl} alt={`Рисунок от ${drawing.playerName}`} className={styles.image} />
                ) : (
                  <div className={styles.noImage}>Не нарисовал(а)</div>
                )}
              </div>
              <div className={styles.playerName}>
                {drawing.playerName} {isMe ? '(Вы)' : ''}
              </div>
              
              {!isMe && !amIEliminated && !hasSubmitted && (
                <button
                  className={styles.voteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectSuspect(drawing.playerId);
                  }}
                >
                  Голосовать
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
