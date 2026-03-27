import { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useGame } from '../contexts/GameContext';
import styles from './Timer.module.css';

export default function Timer() {
  const { socket } = useSocket();
  const { gameState } = useGame();
  const [timeLeft, setTimeLeft] = useState(0);

  const totalTime = gameState?.settings.drawTime || 90;

  useEffect(() => {
    if (gameState) {
      setTimeLeft(gameState.timeLeft);
    }
  }, [gameState?.timeLeft]);

  useEffect(() => {
    if (!socket) return;
    const handleTimer = (data: { timeLeft: number }) => {
      setTimeLeft(data.timeLeft);
    };
    socket.on('timer-update', handleTimer);
    return () => { socket.off('timer-update', handleTimer); };
  }, [socket]);

  if (
    gameState?.state !== 'drawing' &&
    gameState?.state !== 'choosing'
  )
    return null;

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / totalTime;
  const dashOffset = circumference * (1 - progress);

  const colorClass =
    timeLeft > totalTime * 0.5
      ? 'safe'
      : timeLeft > totalTime * 0.2
        ? 'warning'
        : 'danger';

  return (
    <div className={styles.timerWrapper}>
      <div className={styles.timerCircle}>
        <svg className={styles.timerSvg} viewBox="0 0 52 52">
          <circle
            className={styles.timerBg}
            cx="26"
            cy="26"
            r={radius}
          />
          <circle
            className={`${styles.timerProgress} ${styles[colorClass]}`}
            cx="26"
            cy="26"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className={`${styles.timerText} ${styles[colorClass]}`}>
          {timeLeft}
        </div>
      </div>
    </div>
  );
}
