import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import Canvas from '../components/Canvas';
import DrawingToolbar from '../components/DrawingToolbar';
import PlayerList from '../components/PlayerList';
import ChatPanel from '../components/ChatPanel';
import HintDisplay from '../components/HintDisplay';
import Timer from '../components/Timer';
import WordSelector from '../components/WordSelector';
import ScoreBoard from '../components/ScoreBoard';
import styles from './GamePage.module.css';

export default function GamePage() {
  const navigate = useNavigate();
  const { id: paramRoomId } = useParams<{ id: string }>();
  const { gameState, leaveRoom, roomId } = useGame();

  // Drawing state
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(4);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'fill'>('pen');

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

  const handleLeave = () => {
    leaveRoom();
    navigate('/');
  };

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
          <HintDisplay />
        </div>
        <div className={styles.topBarRight}>
          <Timer />
        </div>
      </div>

      {/* Main Layout */}
      <div className={styles.mainLayout}>
        {/* Left Sidebar — Players */}
        <div className={styles.sidebar}>
          <PlayerList />
        </div>

        {/* Center — Canvas + Toolbar */}
        <div className={styles.center}>
          <Canvas color={color} lineWidth={lineWidth} tool={tool} />
          <div className={styles.toolbarWrapper}>
            <DrawingToolbar
              color={color}
              lineWidth={lineWidth}
              tool={tool}
              onColorChange={setColor}
              onLineWidthChange={setLineWidth}
              onToolChange={setTool}
            />
          </div>
        </div>

        {/* Right Sidebar — Chat */}
        <div className={styles.chatSidebar}>
          <ChatPanel />
        </div>
      </div>

      {/* Overlays */}
      <WordSelector />
      <ScoreBoard />
    </div>
  );
}
