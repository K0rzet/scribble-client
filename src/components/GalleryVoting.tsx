import { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';
import styles from './GalleryVoting.module.css';

export default function GalleryVoting() {
  const { gameState, myPlayerId, galleryDrawings, submitGalleryVote } = useGame();
  const { socket } = useSocket();
  
  // scores map: playerId -> rating (0 to 5)
  const [scores, setScores] = useState<Record<string, number>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(gameState?.timeLeft || 30);

  useEffect(() => {
    // Reset submission state when a new voting phase starts OR a new round starts
    if (gameState?.state === 'voting') {
      setHasSubmitted(false);
      setScores({});
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

  if (gameState?.state !== 'voting') return null;

  const handleStarClick = (targetPlayerId: string, rating: number) => {
    if (hasSubmitted || targetPlayerId === myPlayerId) return;
    setScores((prev) => ({
      ...prev,
      [targetPlayerId]: rating,
    }));
  };

  const handleSubmit = () => {
    if (hasSubmitted) return;
    setHasSubmitted(true);
    submitGalleryVote(scores);
  };

  // Check if all other players' drawings have at least 1 star
  const othersDrawings = galleryDrawings.filter(d => d.playerId !== myPlayerId);
  const allRated = othersDrawings.every(d => (scores[d.playerId] || 0) > 0);

  return (
    <div className={styles.votingContainer}>
      <h2 className={styles.title}>Оцените рисунки! (от 1 до 5 звезд)</h2>
      <div className={styles.timer}>Осталось времени: {timeLeft} сек.</div>
      
      <div className={styles.grid}>
        {galleryDrawings.map((drawing) => {
          const isMe = drawing.playerId === myPlayerId;
          const currentRating = scores[drawing.playerId] || 0;

          return (
            <div 
              key={drawing.playerId} 
              className={`${styles.card} ${isMe ? styles.myCard : ''} ${hasSubmitted ? styles.cardSubmitted : ''}`}
            >
              <div className={styles.imageWrapper}>
                <img src={drawing.dataUrl} alt={`Рисунок от ${drawing.playerName}`} className={styles.image} />
                {isMe && <div className={styles.myBadge}>Ваш рисунок 🎨</div>}
              </div>
              <div className={styles.authorName}>{drawing.playerName}</div>
              
              {!isMe ? (
                <div className={styles.starDisplay}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span 
                      key={star}
                      className={`${styles.star} ${star <= currentRating ? styles.starFilled : styles.starEmpty} ${hasSubmitted ? styles.starDisabled : ''}`}
                      onClick={() => handleStarClick(drawing.playerId, star)}
                    >
                      ★
                    </span>
                  ))}
                </div>
              ) : (
                <div className={styles.starDisplay}>
                  <span className={styles.starDisabledText}>Нельзя оценить себя</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.submitSection}>
        {!hasSubmitted ? (
          <>
            <button 
              className={`${styles.submitBtn} ${allRated ? styles.submitBtnReady : ''}`}
              onClick={handleSubmit}
            >
              Отправить оценки
            </button>
            {!allRated && <div className={styles.hintText}>Вы оценили не все рисунки, но можете отправить так.</div>}
          </>
        ) : (
          <div className={styles.waitingText}>
            ☑️ Оценки отправлены! Ожидаем остальных...
          </div>
        )}
      </div>
    </div>
  );
}
