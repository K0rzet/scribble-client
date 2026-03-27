import { useGame } from '../contexts/GameContext';
import { AVATARS } from '../config';
import styles from './PlayerList.module.css';

export default function PlayerList() {
  const { gameState, myPlayerId } = useGame();
  if (!gameState) return null;

  const sorted = [...gameState.players].sort((a, b) => b.score - a.score);

  return (
    <div className={styles.playerList}>
      <div className={styles.title}>👥 Игроки</div>
      {sorted.map((player, index) => {
        const rankClass =
          index === 0
            ? styles.first
            : index === 1
              ? styles.second
              : index === 2
                ? styles.third
                : '';

        return (
          <div
            key={player.id}
            className={`${styles.playerItem} ${
              player.isDrawing ? styles.isDrawing : ''
            } ${player.hasGuessed ? styles.hasGuessed : ''} ${
              player.id === myPlayerId ? styles.isMe : ''
            }`}
          >
            <span className={`${styles.rank} ${rankClass}`}>
              {index + 1}
            </span>
            <span className={styles.avatar}>
              {AVATARS[player.avatarIndex] || '🎨'}
            </span>
            <div className={styles.info}>
              <div className={styles.name}>
                {player.name}
                {player.id === myPlayerId ? ' (Вы)' : ''}
              </div>
              <div
                className={`${styles.status} ${
                  player.isDrawing
                    ? styles.drawing
                    : player.hasGuessed
                      ? styles.guessed
                      : ''
                }`}
              >
                {player.isDrawing
                  ? '🎨 Рисует'
                  : player.hasGuessed
                    ? '✅ Угадал'
                    : ''}
              </div>
            </div>
            <span className={styles.score}>{player.score}</span>
          </div>
        );
      })}
    </div>
  );
}
