import { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useGame } from '../contexts/GameContext';
import type { Player } from '../contexts/GameContext';
import { useNavigate } from 'react-router-dom';
import { useYandexSDK } from '../contexts/YandexSDKContext';
import { AVATARS } from '../config';
import styles from './ScoreBoard.module.css';

interface RoundEndData {
  word: string;
  players: Player[];
}

interface GameEndData {
  players: Player[];
  winner: Player;
}

export default function ScoreBoard() {
  const { socket } = useSocket();
  const { gameState, roomId } = useGame();
  const { showInterstitialAd } = useYandexSDK();
  const navigate = useNavigate();

  const [roundEnd, setRoundEnd] = useState<RoundEndData | null>(null);
  const [gameEnd, setGameEnd] = useState<GameEndData | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleRoundEnd = (data: RoundEndData) => {
      setRoundEnd(data);
      // Show interstitial ad between rounds
      showInterstitialAd().catch(() => {});
    };

    const handleGameEnd = (data: GameEndData) => {
      setGameEnd(data);
      setRoundEnd(null);
    };

    const handleGameState = () => {
      if (gameState?.state === 'choosing' || gameState?.state === 'drawing') {
        setRoundEnd(null);
        setGameEnd(null);
      }
    };

    socket.on('round-end', handleRoundEnd);
    socket.on('game-end', handleGameEnd);
    socket.on('game-state', handleGameState);

    return () => {
      socket.off('round-end', handleRoundEnd);
      socket.off('game-end', handleGameEnd);
      socket.off('game-state', handleGameState);
    };
  }, [socket, showInterstitialAd, gameState?.state]);

  // Clear on state change to choosing
  useEffect(() => {
    if (gameState?.state === 'choosing' || gameState?.state === 'drawing') {
      setRoundEnd(null);
    }
  }, [gameState?.state]);

  // Navigate back to lobby on game end
  useEffect(() => {
    if (gameState?.state === 'waiting' && gameEnd) {
      const timer = setTimeout(() => {
        setGameEnd(null);
        navigate(`/lobby/${roomId}`);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [gameState?.state, gameEnd, navigate, roomId]);

  if (gameEnd) {
    const sorted = [...gameEnd.players].sort((a, b) => b.score - a.score);
    const rankEmoji = ['🥇', '🥈', '🥉'];

    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.trophy}>🏆</div>
          <h2 className={styles.title}>Игра окончена!</h2>
          <p className={styles.subtitle}>
            Победитель: {gameEnd.winner.name}!
          </p>

          <div className={styles.scores}>
            {sorted.map((player, i) => (
              <div
                key={player.id}
                className={styles.scoreItem}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <span className={styles.scoreRank}>
                  {rankEmoji[i] || `${i + 1}.`}
                </span>
                <span className={styles.scoreName}>
                  {AVATARS[player.avatarIndex] || '🎨'} {player.name}
                </span>
                <span className={styles.scoreValue}>{player.score}</span>
              </div>
            ))}
          </div>

          <p className={styles.hint}>⏳ Возвращение в лобби...</p>
        </div>
      </div>
    );
  }

  if (roundEnd) {
    const sorted = [...roundEnd.players].sort((a, b) => b.score - a.score);

    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <h2 className={styles.title}>Раунд окончен</h2>
          <div className={styles.word}>
            Слово: {roundEnd.word}
          </div>

          <div className={styles.scores}>
            {sorted.slice(0, 5).map((player, i) => (
              <div key={player.id} className={styles.scoreItem}>
                <span className={styles.scoreRank}>{i + 1}.</span>
                <span className={styles.scoreName}>
                  {AVATARS[player.avatarIndex] || '🎨'} {player.name}
                </span>
                <span className={styles.scoreValue}>{player.score}</span>
              </div>
            ))}
          </div>

          <p className={styles.hint}>⏳ Следующий раунд скоро...</p>
        </div>
      </div>
    );
  }

  return null;
}
