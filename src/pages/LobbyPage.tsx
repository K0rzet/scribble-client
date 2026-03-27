import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import { AVATARS } from '../config';
import styles from './LobbyPage.module.css';

export default function LobbyPage() {
  const navigate = useNavigate();
  const { id: paramRoomId } = useParams<{ id: string }>();
  const {
    gameState,
    myPlayerId,
    roomId,
    leaveRoom,
    startGame,
    updateSettings,
  } = useGame();

  const [copied, setCopied] = useState(false);

  // Redirect to game when it starts
  useEffect(() => {
    if (gameState && gameState.state !== 'waiting') {
      navigate(`/game/${roomId || paramRoomId}`);
    }
  }, [gameState?.state, navigate, roomId, paramRoomId]);

  // Redirect home if no game state
  useEffect(() => {
    if (!roomId && !gameState) {
      const timer = setTimeout(() => {
        if (!gameState) navigate('/');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [roomId, gameState, navigate]);

  const handleCopyCode = () => {
    const code = roomId || paramRoomId || '';
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLeave = () => {
    leaveRoom();
    navigate('/');
  };

  const players = gameState?.players || [];
  const me = players.find((p) => p.id === myPlayerId);
  const isHost = me?.isHost || false;
  const maxPlayers = gameState?.settings.maxPlayers || 10;

  return (
    <div className={styles.lobbyPage}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={handleLeave}>
          ← Выйти
        </button>
        <div className={styles.roomCode}>
          <span className={styles.codeLabel}>Код:</span>
          <span className={styles.codeValue} onClick={handleCopyCode}>
            {roomId || paramRoomId}
          </span>
          {copied && <span className={styles.copyHint}>Скопировано!</span>}
        </div>
      </div>

      <div className={styles.content}>
        <h2 className={styles.title}>🎮 Лобби</h2>

        {/* Players */}
        <div className={styles.playersSection}>
          <div className={styles.sectionTitle}>
            👥 Игроки ({players.length}/{maxPlayers})
          </div>
          <div className={styles.playersGrid}>
            {players.map((player) => (
              <div
                key={player.id}
                className={`${styles.playerCard} ${
                  player.isHost ? styles.isHost : ''
                }`}
              >
                {player.isHost && (
                  <span className={styles.hostBadge}>👑 Хост</span>
                )}
                <span className={styles.playerAvatar}>
                  {AVATARS[player.avatarIndex] || '🎨'}
                </span>
                <span className={styles.playerName}>
                  {player.name}
                  {player.id === myPlayerId ? ' (Вы)' : ''}
                </span>
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: maxPlayers - players.length })
              .slice(0, 4)
              .map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className={`${styles.playerCard} ${styles.emptySlot}`}
                >
                  <span className={styles.playerAvatar}>❓</span>
                  <span className={styles.emptySlotText}>Пусто</span>
                </div>
              ))}
          </div>
        </div>

        {/* Settings (host only) */}
        {isHost && (
          <div className={`card ${styles.settingsSection}`}>
            <div className={styles.sectionTitle}>⚙️ Настройки</div>
            <div className={styles.settingsGrid}>
              <div className={styles.settingItem}>
                <label className={styles.settingLabel}>Раунды</label>
                <select
                  className={styles.settingSelect}
                  value={gameState?.settings.rounds || 3}
                  onChange={(e) =>
                    updateSettings({ rounds: Number(e.target.value) })
                  }
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.settingItem}>
                <label className={styles.settingLabel}>Время (сек)</label>
                <select
                  className={styles.settingSelect}
                  value={gameState?.settings.drawTime || 90}
                  onChange={(e) =>
                    updateSettings({ drawTime: Number(e.target.value) })
                  }
                >
                  {[30, 45, 60, 75, 90, 120, 150].map((n) => (
                    <option key={n} value={n}>
                      {n} сек
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.settingItem}>
                <label className={styles.settingLabel}>Макс. игроков</label>
                <select
                  className={styles.settingSelect}
                  value={gameState?.settings.maxPlayers || 10}
                  onChange={(e) =>
                    updateSettings({ maxPlayers: Number(e.target.value) })
                  }
                >
                  {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          {isHost ? (
            <button
              id="start-game-btn"
              className={`btn btn-primary btn-lg ${styles.startBtn}`}
              onClick={startGame}
              disabled={players.length < 2}
            >
              🚀 Начать игру{' '}
              {players.length < 2 ? '(нужно 2+ игрока)' : ''}
            </button>
          ) : (
            <p className={styles.waitingHint}>
              ⏳ Ожидаем, пока хост начнёт игру...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
