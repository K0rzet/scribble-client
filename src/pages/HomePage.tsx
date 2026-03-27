import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useGame } from '../contexts/GameContext';
import { useYandexSDK } from '../contexts/YandexSDKContext';
import styles from './HomePage.module.css';

interface RoomInfo {
  id: string;
  playerCount: number;
  maxPlayers: number;
  state: string;
  hostName: string;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const { myPlayerName, setMyPlayerName, createRoom, joinRoom } = useGame();
  const { signalReady } = useYandexSDK();

  const [name, setName] = useState(myPlayerName || '');
  const [roomCode, setRoomCode] = useState('');
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Signal ready to Yandex SDK
  useEffect(() => {
    signalReady();
  }, [signalReady]);

  // Fetch available rooms
  useEffect(() => {
    if (!socket || !isConnected) return;

    const fetchRooms = () => {
      socket.emit('get-rooms', (response: { rooms: RoomInfo[] }) => {
        setRooms(response.rooms);
      });
    };

    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [socket, isConnected]);

  const handleCreateRoom = async () => {
    if (!name.trim()) {
      setError('Введите ваше имя');
      return;
    }
    setError('');
    setLoading(true);
    setMyPlayerName(name.trim());

    const result = await createRoom(name.trim());
    setLoading(false);

    if (result.success && result.roomId) {
      navigate(`/lobby/${result.roomId}`);
    } else {
      setError(result.error || 'Не удалось создать комнату');
    }
  };

  const handleJoinRoom = async (targetRoomId?: string) => {
    const code = targetRoomId || roomCode.trim().toUpperCase();
    if (!name.trim()) {
      setError('Введите ваше имя');
      return;
    }
    if (!code) {
      setError('Введите код комнаты');
      return;
    }
    setError('');
    setLoading(true);
    setMyPlayerName(name.trim());

    const result = await joinRoom(code, name.trim());
    setLoading(false);

    if (result.success) {
      navigate(`/lobby/${code}`);
    } else {
      setError(result.error || 'Не удалось войти в комнату');
    }
  };

  return (
    <div className={styles.homePage}>
      {/* Animated background orbs */}
      <div className={`${styles.bgOrb} ${styles.bgOrb1}`} />
      <div className={`${styles.bgOrb} ${styles.bgOrb2}`} />
      <div className={`${styles.bgOrb} ${styles.bgOrb3}`} />

      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🎨</div>
          <h1 className={styles.logoTitle}>Scribble</h1>
          <p className={styles.logoSubtitle}>Нарисуй и Угадай</p>
        </div>

        {/* Form */}
        <div className={`card ${styles.formCard}`}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Ваше имя</label>
            <input
              id="player-name-input"
              type="text"
              className={`input ${styles.nameInput}`}
              placeholder="Введите имя..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
            />
          </div>

          <div className={styles.buttons}>
            <button
              id="create-room-btn"
              className="btn btn-primary btn-lg"
              onClick={handleCreateRoom}
              disabled={loading || !isConnected}
            >
              {loading ? '⏳' : '✨'} Создать комнату
            </button>

            <div className={styles.divider}>или</div>

            <div className={styles.joinRow}>
              <input
                id="room-code-input"
                type="text"
                className={`input ${styles.roomCodeInput}`}
                placeholder="КОД"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              />
              <button
                id="join-room-btn"
                className={`btn btn-secondary ${styles.joinBtn}`}
                onClick={() => handleJoinRoom()}
                disabled={loading || !isConnected}
              >
                Войти
              </button>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        {/* Room List */}
        {rooms.length > 0 && (
          <div className={styles.roomList}>
            <div className={styles.roomListTitle}>
              🎮 Открытые комнаты ({rooms.length})
            </div>
            {rooms.map((room) => (
              <div
                key={room.id}
                className={styles.roomItem}
                onClick={() => handleJoinRoom(room.id)}
              >
                <div className={styles.roomInfo}>
                  <span className={styles.roomHost}>
                    {room.hostName}
                  </span>
                  <span className={styles.roomPlayers}>
                    {room.playerCount}/{room.maxPlayers} игроков
                  </span>
                </div>
                <button className={styles.roomJoinBtn}>Войти</button>
              </div>
            ))}
          </div>
        )}

        {/* Connection Status */}
        <div className={styles.connectionStatus}>
          <span
            className={`${styles.statusDot} ${
              isConnected ? styles.connected : styles.disconnected
            }`}
          />
          {isConnected ? 'Подключено к серверу' : 'Нет соединения...'}
        </div>
      </div>
    </div>
  );
}
