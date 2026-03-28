import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame, MODE_NAMES } from '../contexts/GameContext';
import type { GameMode, WordBankSummary } from '../contexts/GameContext';
import { AVATARS } from '../config';
import styles from './LobbyPage.module.css';

const ALL_MODES: { key: GameMode; name: string; icon: string; desc: string }[] = [
  { key: 'classic', name: 'Классика', icon: '🎨', desc: 'Один рисует, все угадывают' },
  { key: 'gallery', name: 'Оценка', icon: '🖼️', desc: 'Все рисуют, голосуют за лучший' },
  { key: 'spy', name: 'Шпион', icon: '🕵️', desc: 'Найдите кто не знает слово' },
  { key: 'telephone', name: 'Телефон', icon: '📞', desc: 'Испорченный телефон рисунками' },
  { key: 'speed', name: 'Быстрый', icon: '⚡', desc: 'Максимум слов за 2 минуты' },
  { key: 'reveal', name: 'По частям', icon: '🧩', desc: 'Картинка открывается постепенно' },
];

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
    fetchWordBanks,
  } = useGame();

  const [copied, setCopied] = useState(false);
  const [wordBanks, setWordBanks] = useState<WordBankSummary[]>([]);

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

  // Fetch word banks
  useEffect(() => {
    fetchWordBanks().then(setWordBanks);
  }, [fetchWordBanks]);

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
  const currentMode = gameState?.settings.mode || 'classic';
  const canUseSpyMode = players.length >= 3;
  const canStartGame =
    currentMode === 'reveal'
      ? players.length >= 1
      : currentMode === 'spy'
        ? players.length >= 3
        : players.length >= 2;
  const maxPlayersOptions =
    currentMode === 'spy' ? [3, 4, 5, 6, 8, 10] : [2, 3, 4, 5, 6, 8, 10];
  const maxSpyCount = Math.max(1, maxPlayers - 2);

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
            {Array.from({ length: Math.min(4, maxPlayers - players.length) }).map((_, i) => (
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

        {/* Mode Selection (host only) */}
        {isHost && (
          <div className={`card ${styles.modeSection}`}>
            <div className={styles.sectionTitle}>🎯 Режим игры</div>
            <div className={styles.modeGrid}>
              {ALL_MODES.map((mode) => (
                <button
                  key={mode.key}
                  className={`${styles.modeCard} ${currentMode === mode.key ? styles.modeActive : ''} ${mode.key === 'spy' && !canUseSpyMode ? styles.modeDisabled : ''}`}
                  onClick={() => {
                    if (mode.key === 'spy' && !canUseSpyMode) return;
                    updateSettings({ mode: mode.key });
                  }}
                  disabled={mode.key === 'spy' && !canUseSpyMode}
                  title={mode.key === 'spy' && !canUseSpyMode ? 'Режим "Шпион" доступен от 3 игроков' : undefined}
                >
                  <span className={styles.modeIcon}>{mode.icon}</span>
                  <span className={styles.modeName}>{mode.name}</span>
                  <span className={styles.modeDesc}>{mode.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Current mode display (non-host) */}
        {!isHost && (
          <div className={styles.currentModeDisplay}>
            <span className={styles.currentModeLabel}>Режим:</span>
            <span className={styles.currentModeName}>
              {ALL_MODES.find(m => m.key === currentMode)?.icon} {MODE_NAMES[currentMode]}
            </span>
          </div>
        )}

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
                  {maxPlayersOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              
              {currentMode === 'spy' && (
                <div className={styles.settingItem}>
                  <label className={styles.settingLabel}>🕵️‍♂️ Шпионов</label>
                  <select
                    className={styles.settingSelect}
                    value={gameState?.settings.spyCount || 1}
                    onChange={(e) =>
                      updateSettings({ spyCount: Number(e.target.value) })
                    }
                  >
                    {Array.from({ length: maxSpyCount }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Word Bank selection */}
            {wordBanks.length > 0 && (
              <div className={styles.wordBankSection}>
                <div className={styles.settingLabel}>📚 Банк слов</div>
                <div className={styles.wordBankList}>
                  <label className={styles.bankOption}>
                    <input
                      type="radio"
                      name="wordBank"
                      value="all"
                      checked={!gameState?.settings.wordBankIds || gameState?.settings.wordBankIds.includes('all')}
                      onChange={() => updateSettings({ wordBankIds: ['all'] })}
                    />
                    <span>🌐 Все слова</span>
                  </label>
                  {wordBanks.map((bank) => (
                    <label key={bank.id} className={styles.bankOption}>
                      <input
                        type="radio"
                        name="wordBank"
                        value={bank.id}
                        checked={gameState?.settings.wordBankIds?.includes(bank.id) && !gameState?.settings.wordBankIds?.includes('all')}
                        onChange={() => updateSettings({ wordBankIds: [bank.id] })}
                      />
                      <span>{bank.name} ({bank.wordCount} слов, {bank.categoryCount} кат.)</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          {isHost ? (
            <button
              id="start-game-btn"
              className={`btn btn-primary btn-lg ${styles.startBtn}`}
              onClick={startGame}
              disabled={!canStartGame}
            >
              🚀 Начать игру{' '}
              {!canStartGame
                ? currentMode === 'spy'
                  ? '(нужно 3+ игрока)'
                  : currentMode !== 'reveal'
                    ? '(нужно 2+ игрока)'
                    : ''
                : ''}
            </button>
          ) : (
            <p className={styles.waitingHint}>
              ⏳ Ожидаем, пока хост начнёт игру...
            </p>
          )}
        </div>

        {/* Hotkeys hint */}
        <div className={styles.hotkeysHint}>
          <details>
            <summary>⌨️ Горячие клавиши (для рисующего)</summary>
            <div className={styles.hotkeysList}>
              <span><kbd>B</kbd> / <kbd>P</kbd> — Кисть</span>
              <span><kbd>E</kbd> — Ластик</span>
              <span><kbd>G</kbd> / <kbd>F</kbd> — Заливка</span>
              <span><kbd>Ctrl+Z</kbd> — Отмена</span>
              <span><kbd>Del</kbd> — Очистить</span>
              <span><kbd>[</kbd> <kbd>]</kbd> — Размер кисти</span>
              <span><kbd>1-9</kbd> — Быстрый цвет</span>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
