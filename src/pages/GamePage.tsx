import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import type { ChatMessage } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';
import { useSound } from '../hooks/useSound';
import Canvas from '../components/Canvas';
import DrawingToolbar from '../components/DrawingToolbar';
import PlayerList from '../components/PlayerList';
import ChatPanel from '../components/ChatPanel';
import HintDisplay from '../components/HintDisplay';
import Timer from '../components/Timer';
import WordSelector from '../components/WordSelector';
import ScoreBoard from '../components/ScoreBoard';
import GalleryVoting from '../components/GalleryVoting';
import SpyVoting from '../components/SpyVoting';
import TelephoneGuess from '../components/TelephoneGuess';
import GameNotification from '../components/GameNotification';
import type { NotificationData } from '../components/GameNotification';
import RevealCanvas from '../components/RevealCanvas';
import styles from './GamePage.module.css';

const COLORS = [
  '#000000', '#ffffff', '#808080', '#c0c0c0',
  '#ff0000', '#ff6b00', '#ffb347', '#ffff00',
  '#4ade80', '#00c853', '#00bcd4', '#2196f3',
  '#3f51b5', '#7c5cfc', '#9c27b0', '#ff6bcb',
  '#795548', '#ff8a80', '#ffd54f', '#a5d6a7',
];

export default function GamePage() {
  const navigate = useNavigate();
  const { id: paramRoomId } = useParams<{ id: string }>();
  const {
    gameState,
    leaveRoom,
    roomId,
    sendGuess,
    isDrawer,
    undoDraw,
    clearCanvas,
    myPlayerId,
    spyRole,
    spyWord,
    spyCategory,
    revealImageUrl,
    revealedTiles,
  } = useGame();
  const { socket } = useSocket();
  const { enabled: soundEnabled, toggle: toggleSound, playSound } = useSound();

  // Drawing state
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(4);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'fill'>('pen');
  const [guessInput, setGuessInput] = useState('');
  const guessInputRef = useRef<HTMLInputElement>(null);

  // Notification state
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const notifIdRef = useRef(0);

  // Keep ref to gameState.state for use inside socket callbacks
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Redirect if no game state
  useEffect(() => {
    if (!gameState && !roomId) {
      const timer = setTimeout(() => navigate('/'), 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState, roomId, navigate]);

  // Redirect to lobby if game goes back to waiting
  useEffect(() => {
    if (gameState?.state === 'waiting') {
      navigate(`/lobby/${roomId || paramRoomId}`);
    }
  }, [gameState?.state, navigate, roomId, paramRoomId]);

  // ─── Sound: round transitions ────────────────────────────────
  const prevStateRef = useRef('');
  useEffect(() => {
    const state = gameState?.state;
    if (!state) return;
    const prev = prevStateRef.current;

    if (state === 'drawing' && prev === 'choosing') {
      playSound('roundStart');
    }
    if (state === 'spyDrawing' && prev !== 'spyDrawing') {
      playSound('roundStart');
    }
    prevStateRef.current = state;
  }, [gameState?.state, playSound]);

  // ─── Sound: socket events ────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (msg: ChatMessage) => {
      const state = gameStateRef.current?.state;
      if (msg.type === 'correct') {
        // In speed mode the speedWord sound already plays — use it for others too
        if (state === 'speedDrawing') return;
        playSound('correct');
      } else if (msg.type === 'close') {
        playSound('close');
      }
    };

    const handleGuessResult = (data: { result: string }) => {
      if (data.result === 'correct') {
        playSound('myCorrect');
      }
    };

    const handleSpeedWordGuessed = (data: { word: string; guesserName: string }) => {
      playSound('speedWord');
      setNotification({
        id: ++notifIdRef.current,
        emoji: '⚡',
        title: 'Слово угадано!',
        subtitle: `"${data.word}" — первым угадал(а) ${data.guesserName}`,
        color: 'yellow',
        duration: 1800,
      });
    };

    const handleRoundEnd = () => {
      playSound('roundEnd');
    };

    const handleGameEnd = () => {
      playSound('gameEnd');
    };

    const handleTimerUpdate = (data: { timeLeft: number }) => {
      const state = gameStateRef.current?.state;
      const activeStates = ['drawing', 'speedDrawing', 'allDrawing', 'spyDrawing', 'chainDraw', 'revealing', 'voting', 'spyVoting'];
      if (activeStates.includes(state ?? '') && data.timeLeft > 0 && data.timeLeft <= 10) {
        playSound('tick');
      }
    };

    socket.on('chat-message', handleChatMessage);
    socket.on('guess-result', handleGuessResult);
    socket.on('speed-word-guessed', handleSpeedWordGuessed);
    socket.on('round-end', handleRoundEnd);
    socket.on('game-end', handleGameEnd);
    socket.on('timer-update', handleTimerUpdate);

    return () => {
      socket.off('chat-message', handleChatMessage);
      socket.off('guess-result', handleGuessResult);
      socket.off('speed-word-guessed', handleSpeedWordGuessed);
      socket.off('round-end', handleRoundEnd);
      socket.off('game-end', handleGameEnd);
      socket.off('timer-update', handleTimerUpdate);
    };
  }, [socket, playSound]);

  // Reset tool to black pen at the start of every drawing phase
  useEffect(() => {
    if (
      gameState?.state === 'drawing' ||
      gameState?.state === 'allDrawing' ||
      gameState?.state === 'speedDrawing'
    ) {
      setColor('#000000');
      setTool('pen');
    }
  }, [gameState?.state, gameState?.currentRound, gameState?.speedWordsGuessed]);

  // ─── Hotkeys ─────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't handle hotkeys when typing in input
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

    if (!isDrawer) return;

    switch (e.code) {
      case 'KeyB':
      case 'KeyP':
        setTool('pen');
        break;
      case 'KeyE':
        setTool('eraser');
        break;
      case 'KeyG':
      case 'KeyF':
        setTool('fill');
        break;
      case 'KeyZ':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          undoDraw();
        }
        break;
      case 'Delete':
        clearCanvas();
        break;
      case 'BracketLeft':
        setLineWidth((prev) => Math.max(1, prev - 2));
        break;
      case 'BracketRight':
        setLineWidth((prev) => Math.min(60, prev + 2));
        break;
      default:
        // Number keys 1-9 for quick color pick
        if (!e.ctrlKey && !e.metaKey && !e.altKey && e.code.startsWith('Digit')) {
          const num = parseInt(e.code.replace('Digit', ''));
          if (num >= 1 && num <= 9 && COLORS[num - 1]) {
            setColor(COLORS[num - 1]);
            if (tool === 'eraser') setTool('pen');
          }
        }
        break;
    }
  }, [isDrawer, tool, clearCanvas, undoDraw]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleLeave = () => {
    leaveRoom();
    navigate('/');
  };

  const handleGuessSubmit = () => {
    if (!guessInput.trim()) return;
    sendGuess(guessInput);
    setGuessInput('');
  };

  const myPlayer = gameState?.players.find((p) => p.id === myPlayerId);
  const canType = (gameState?.state === 'drawing' || gameState?.state === 'speedDrawing' || gameState?.state === 'spyGuess' || gameState?.state === 'revealing') && !isDrawer && !myPlayer?.hasGuessed;

  const hideInput =
    gameState?.state === 'allDrawing' ||
    gameState?.state === 'spyDrawing' ||
    gameState?.state === 'spyVoting' ||
    gameState?.state === 'chainDraw' ||
    gameState?.state === 'chainGuess' ||
    (gameState?.state === 'spyGuess' && spyRole !== 'spy');

  const { telephoneWord } = useGame();

  const isRevealing   = gameState?.state === 'revealing';
  const revealProgress = gameState?.revealProgress ?? 0;
  const revealHint    = gameState?.hint ?? '';
  const revealCategory = gameState?.currentCategory ?? '';

  // Clear guess input whenever round/state changes
  useEffect(() => {
    setGuessInput('');
  }, [gameState?.currentRound, gameState?.state, gameState?.drawerId]);

  // Keep input focused for fast gameplay (after round transitions too)
  useEffect(() => {
    const shouldFocus =
      (gameState?.state === 'drawing' ||
        gameState?.state === 'speedDrawing' ||
        gameState?.state === 'revealing' ||
        gameState?.state === 'spyGuess') &&
      !isDrawer &&
      !myPlayer?.hasGuessed;

    if (!shouldFocus) return;
    const t = setTimeout(() => guessInputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [gameState?.state, gameState?.currentRound, gameState?.drawerId, isDrawer, myPlayer?.hasGuessed]);

  if (!gameState) {
    return (
      <div className={styles.gamePage}>
        <div className={styles.waitingOverlay}>
          <div className={styles.waitingContent}>
            <div className={styles.waitingEmoji}>🔌</div>
            <div className={styles.waitingText}>Подключение к игре...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gamePage}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <button className={styles.leaveBtn} onClick={handleLeave}>
            ← Выйти
          </button>
        </div>
        <div className={styles.topBarCenter}>
          {(gameState.state === 'allDrawing' || gameState.state === 'voting') ? (
            <div className={styles.galleryWordDisplay}>
              Тема:{' '}
              <span className={styles.galleryWordHighlight}>
                {(gameState as any).currentWord || 'Ожидание...'}
              </span>
            </div>
          ) : gameState.state === 'spyDrawing' || gameState.state === 'spyVoting' || gameState.state === 'spyGuess' ? (
            <div className={styles.galleryWordDisplay}>
              {spyRole === 'spy' ? (
                <>
                  <span className={styles.galleryWordHighlight} style={{ color: '#ff4d4f' }}>
                    ВЫ ШПИОН
                  </span>
                  {spyCategory ? (
                    <>
                      {' '}Тема:{' '}
                      <span className={styles.galleryWordHighlight}>{spyCategory}</span>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  Слово:{' '}
                  <span className={styles.galleryWordHighlight}>
                    {spyWord || '...'}
                  </span>
                </>
              )}
            </div>
          ) : gameState.state === 'chainDraw' ? (
            <div className={styles.galleryWordDisplay}>
              {isDrawer ? (
                <>Нарисуйте: <span className={styles.galleryWordHighlight}>{telephoneWord}</span></>
              ) : (
                <>Испорченный телефон: цепочка рисует</>
              )}
            </div>
          ) : gameState.state === 'chainGuess' ? (
            <div className={styles.galleryWordDisplay}>
              {isDrawer ? (
                <>Угадайте слово!</>
              ) : (
                <>Испорченный телефон: цепочка угадывает</>
              )}
            </div>
          ) : gameState.state === 'revealing' ? (
            <div className={styles.galleryWordDisplay}>
              🧩 Угадай по частям
            </div>
          ) : (
            <HintDisplay />
          )}
        </div>
        <div className={styles.topBarRight}>
          <Timer />
          <button
            className={`${styles.soundBtn} ${soundEnabled ? '' : styles.soundBtnOff}`}
            onClick={toggleSound}
            title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className={styles.mainLayout}>
        {/* Left Sidebar — Players */}
        <div className={styles.sidebar}>
          <PlayerList />
        </div>

        {/* Center — Canvas + Toolbar + Input */}
        <div className={styles.center}>
          {/* ── Reveal mode: tile-based image reveal ─────────── */}
          {isRevealing ? (
            <RevealCanvas
              imageUrl={revealImageUrl}
              revealedTiles={revealedTiles}
              progress={revealProgress}
              hint={revealHint}
              category={revealCategory}
            />
          ) : (
            /* ── All other modes: regular canvas ─────────────── */
            <Canvas color={color} lineWidth={lineWidth} tool={tool} />
          )}

          {/* Toolbar: only for drawing phases */}
          {isDrawer && !isRevealing && (
            <div className={styles.toolbarWrapper}>
              <DrawingToolbar
                color={color}
                lineWidth={lineWidth}
                tool={tool}
                onColorChange={setColor}
                onLineWidthChange={setLineWidth}
                onToolChange={setTool}
              />
              <div className={styles.hotkeysBar}>
                <span><kbd>B</kbd> Кисть</span>
                <span><kbd>E</kbd> Ластик</span>
                <span><kbd>G</kbd> Заливка</span>
                <span><kbd>Ctrl+Z</kbd> Отмена</span>
                <span><kbd>Del</kbd> Очистить</span>
                <span><kbd>[ ]</kbd> Размер</span>
                <span><kbd>1-9</kbd> Цвет</span>
              </div>
            </div>
          )}
          {/* Guess input at bottom — also shown during revealing for non-drawers
              and for single-player mode (no drawer) */}
          {(isRevealing ? !myPlayer?.hasGuessed : !isDrawer && !hideInput) && (
            <div className={styles.guessInputWrapper}>
              <input
                id="guess-input"
                ref={guessInputRef}
                type="text"
                className={styles.guessInput}
                placeholder={
                  myPlayer?.hasGuessed
                    ? '✅ Вы уже угадали!'
                    : gameState?.state === 'drawing' || gameState?.state === 'speedDrawing' || gameState?.state === 'revealing' || gameState?.state === 'spyGuess'
                      ? '💡 Введите ваш ответ...'
                      : '💬 Сообщение...'
                }
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGuessSubmit()}
                disabled={
                  isRevealing
                    ? (myPlayer?.hasGuessed ?? false)
                    : !canType && (gameState?.state === 'drawing' || gameState?.state === 'speedDrawing' || gameState.state === 'spyGuess')
                }
                maxLength={100}
                autoComplete="off"
              />
              <button
                className={styles.guessBtn}
                onClick={handleGuessSubmit}
                disabled={
                  isRevealing
                    ? (myPlayer?.hasGuessed ?? false)
                    : !canType && (gameState?.state === 'drawing' || gameState?.state === 'speedDrawing' || gameState.state === 'spyGuess')
                }
              >
                Отправить
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar — Chat */}
        <div className={styles.chatSidebar}>
          <ChatPanel />
        </div>
      </div>

      {/* Overlays */}
      <WordSelector />
      <ScoreBoard />
      <GalleryVoting />
      <SpyVoting />
      <TelephoneGuess />
      <GameNotification notification={notification} />
    </div>
  );
}
