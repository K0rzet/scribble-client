import { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useGame } from '../contexts/GameContext';
import type { Player, RoundEndData } from '../contexts/GameContext';
import { useNavigate } from 'react-router-dom';
import { useYandexSDK } from '../contexts/YandexSDKContext';
import { AVATARS } from '../config';
import styles from './ScoreBoard.module.css';

interface GameEndData {
  players: Player[];
  winner: Player;
  mode?: string;
}

export default function ScoreBoard() {
  const { socket } = useSocket();
  const { gameState, roomId, roundEndData } = useGame();
  const { showInterstitialAd } = useYandexSDK();
  const navigate = useNavigate();

  const [gameEnd, setGameEnd] = useState<GameEndData | null>(null);
  const [countdown, setCountdown] = useState(8);
  const roundEndDuration = (() => {
    if (!roundEndData) return 8;
    if (roundEndData.mode === 'gallery') return 4;
    if (roundEndData.mode === 'spy') return 5;
    if (roundEndData.mode === 'telephone') return 12;
    return 8;
  })();

  useEffect(() => {
    if (!socket) return;

    const handleRoundEnd = () => {
      showInterstitialAd().catch(() => {});
      setCountdown(8);
    };

    const handleGameEnd = (data: GameEndData) => {
      setGameEnd(data);
    };

    socket.on('round-end', handleRoundEnd);
    socket.on('game-end', handleGameEnd);

    return () => {
      socket.off('round-end', handleRoundEnd);
      socket.off('game-end', handleGameEnd);
    };
  }, [socket, showInterstitialAd]);

  // Countdown timer
  useEffect(() => {
    if (!roundEndData && !gameEnd) return;
    setCountdown(gameEnd ? 10 : roundEndDuration);
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [roundEndData, gameEnd, roundEndDuration]);

  // Clear game end when going back to waiting
  useEffect(() => {
    if (gameState?.state === 'waiting' && gameEnd) {
      const timer = setTimeout(() => {
        setGameEnd(null);
        navigate(`/lobby/${roomId}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState?.state, gameEnd, navigate, roomId]);

  // Clear round end when game resumes
  useEffect(() => {
    if (
      gameState?.state === 'choosing' ||
      gameState?.state === 'drawing' ||
      gameState?.state === 'allDrawing' ||
      gameState?.state === 'speedDrawing'
    ) {
      setGameEnd(null);
    }
  }, [gameState?.state]);

  if (gameEnd) {
    const sorted = [...gameEnd.players].sort((a, b) => b.score - a.score);
    const rankEmoji = ['🥇', '🥈', '🥉'];

    return (
      <div className={styles.overlay}>
        <div className={`${styles.modal} ${styles.gameEndModal}`}>
          {/* Confetti particles */}
          <div className={styles.confettiContainer}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={styles.confetti}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                  backgroundColor: ['#ffd866', '#ff8fa3', '#7ec8e3', '#77dd77', '#ffb347', '#b39ddb'][i % 6],
                }}
              />
            ))}
          </div>

          <div className={styles.trophy}>🏆</div>
          <h2 className={styles.title}>Игра окончена!</h2>
          <p className={styles.subtitle}>
            Победитель: <span className={styles.winnerName}>{gameEnd.winner.name}</span>
          </p>

          <div className={styles.scores}>
            {sorted.map((player, i) => (
              <div
                key={player.id}
                className={`${styles.scoreItem} ${i === 0 ? styles.winner : ''}`}
                style={{ animationDelay: `${i * 0.12}s` }}
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

          <div className={styles.countdownBar}>
            <div className={styles.countdownText}>⏳ Возвращение в лобби через {countdown}...</div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${(countdown / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (roundEndData && gameState?.state === 'roundEnd') {
    return <RoundEndModal data={roundEndData} countdown={countdown} totalCountdown={roundEndDuration} />;
  }

  return null;
}

// ─── Round End Modal Component ──────────────────────────────────
function RoundEndModal({
  data,
  countdown,
  totalCountdown,
}: {
  data: RoundEndData;
  countdown: number;
  totalCountdown: number;
}) {
  const guessOrder = data.guessOrder || [];
  const rankEmoji = ['🥇', '🥈', '🥉'];

  return (
    <div className={styles.overlay}>
      <div className={`${styles.modal} ${styles.roundEndModal} ${data.mode === 'telephone' ? styles.telephoneRoundModal : ''}`}>
        {/* Sparkle effect */}
        <div className={styles.sparkleContainer}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={styles.sparkle}
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
                animationDelay: `${Math.random() * 1.5}s`,
              }}
            />
          ))}
        </div>

        <h2 className={styles.roundEndTitle}>
          {data.mode === 'spy' ? '🕵️ Раунд окончен' :
           data.mode === 'gallery' ? '🎨 Голосование завершено' :
           data.mode === 'telephone' ? '📞 Цепочка завершена' :
           data.mode === 'speed' ? '⚡ Быстрый раунд окончен' :
           '📊 Раунд окончен'}
        </h2>

        {/* Word reveal with animation */}
        <div className={styles.wordReveal}>
          <span className={styles.wordLabel}>Слово:</span>
          <span className={styles.wordValue}>{data.word}</span>
        </div>
        {data.category && (
          <div className={styles.categoryTag}>📁 {data.category}</div>
        )}

        {/* Spy mode result */}
        {data.mode === 'spy' && (
          <div className={styles.spyResult}>
            <div className={data.spyCaught ? styles.spyCaught : styles.spyWon}>
              {data.spyCaught
                ? `🎯 Шпион ${data.spyName} был раскрыт!`
                : `🕵️ Шпион ${data.spyName} победил!`}
            </div>
          </div>
        )}

        {/* Speed mode result */}
        {data.mode === 'speed' && (
          <div className={styles.speedBlock}>
            {/* Total words guessed */}
            <div className={styles.speedResult}>
              <span className={styles.speedCount}>⚡ {data.speedWordsGuessed ?? 0}</span>
              <span className={styles.speedLabel}>
                {data.speedWordsGuessed === 1 ? 'слово угадано' :
                 (data.speedWordsGuessed ?? 0) >= 2 && (data.speedWordsGuessed ?? 0) <= 4
                   ? 'слова угадано'
                   : 'слов угадано'}
              </span>
            </div>

            {/* Drawer info */}
            {data.speedDrawerName && (
              <div className={styles.speedDrawerRow}>
                🎨 Рисовал(а): <strong>{data.speedDrawerName}</strong>
              </div>
            )}

            {/* Per-player breakdown */}
            {data.speedPlayerStats && Object.keys(data.speedPlayerStats).length > 0 && (
              <div className={styles.speedStatsBlock}>
                <div className={styles.speedStatsTitle}>Кто угадывал</div>
                {Object.entries(data.speedPlayerStats)
                  .sort((a, b) => b[1].wordsGuessed - a[1].wordsGuessed)
                  .map(([pid, stat]) => (
                    <div key={pid} className={styles.speedStatRow}>
                      <span className={styles.speedStatName}>{stat.playerName}</span>
                      <span className={styles.speedStatWords}>
                        {stat.wordsGuessed} {stat.wordsGuessed === 1 ? 'слово' : stat.wordsGuessed <= 4 ? 'слова' : 'слов'}
                      </span>
                      <span className={styles.speedStatPts}>
                        +{data.scoreDeltas?.[pid] ?? 0} очк.
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Telephone mode chain */}
        {data.mode === 'telephone' && data.telephoneChain && (
          <div className={styles.telephoneChainScroll}>
            <div className={styles.telephoneChainList}>
              <div className={styles.chainNode}>
                <div className={styles.chainNodeHeader}>
                  <span className={styles.chainStepBadge}>Старт</span>
                </div>
                <div className={styles.chainNodeAuthor}>Исходное слово</div>
                <div className={styles.chainNodeContentWord}>{data.word}</div>
              </div>
              {data.telephoneChain.map((node, i) => (
                <div key={i} className={styles.chainNodeWrapper}>
                  <div className={styles.chainArrow}>➔</div>
                  <div className={styles.chainNode}>
                    <div className={styles.chainNodeHeader}>
                      <span className={styles.chainStepBadge}>#{i + 1}</span>
                      <span className={styles.chainNodeType}>
                        {node.type === 'draw' ? '🎨 Рисунок' : '💬 Догадка'}
                      </span>
                    </div>
                    <div className={styles.chainNodeAuthor}>{node.playerName}</div>
                    {node.type === 'draw' ? (
                      <div className={styles.chainNodeContentImg}>
                        {node.dataUrl ? (
                          <img src={node.dataUrl} alt={`Рисунок от ${node.playerName}`} className={styles.chainImage} />
                        ) : (
                          <span className={styles.emptyDraw}>Рисунок не отправлен</span>
                        )}
                      </div>
                    ) : (
                      <div className={styles.chainNodeContentWord}>{node.text?.trim() || '???'}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guess Order — who guessed first */}
        {guessOrder.length > 0 && (
          <div className={styles.guessOrderSection}>
            <div className={styles.guessOrderTitle}>🏅 Порядок угадывания</div>
            <div className={styles.guessOrderList}>
              {guessOrder.map((entry, i) => (
                <div
                  key={entry.playerId}
                  className={styles.guessOrderItem}
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <span className={styles.guessPosition}>
                    {rankEmoji[i] || `${i + 1}.`}
                  </span>
                  <span className={styles.guessName}>{entry.playerName}</span>
                  <span className={styles.guessTime}>
                    {entry.timeElapsed}с
                  </span>
                  <span className={styles.guessScore}>+{entry.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Score summary */}
        {data.scoreDeltas && Object.keys(data.scoreDeltas).length > 0 && (
          <div className={styles.scoreDeltaSection}>
            <div className={styles.scoreDeltaTitle}>📈 Очки за раунд</div>
            {data.players
              .filter(p => data.scoreDeltas?.[p.id])
              .sort((a, b) => (data.scoreDeltas?.[b.id] || 0) - (data.scoreDeltas?.[a.id] || 0))
              .slice(0, 6)
              .map((player, i) => (
                <div key={player.id} className={styles.deltaPill} style={{ animationDelay: `${i * 0.1}s` }}>
                  <span>{AVATARS[player.avatarIndex] || '🎨'} {player.name}</span>
                  <span className={styles.deltaValue}>+{data.scoreDeltas?.[player.id]}</span>
                </div>
              ))}
          </div>
        )}

        <div className={styles.countdownBar}>
          <div className={styles.countdownText}>⏳ Следующий раунд через {countdown}...</div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
                style={{ width: `${(countdown / totalCountdown) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
