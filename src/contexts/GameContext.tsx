import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSocket } from './SocketContext';

export interface Player {
  id: string;
  socketId: string;
  name: string;
  avatarIndex: number;
  score: number;
  hasGuessed: boolean;
  isDrawing: boolean;
  isHost: boolean;
  connected: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  type: 'message' | 'correct' | 'close' | 'system' | 'join' | 'leave';
  timestamp: number;
}

export interface DrawAction {
  type: 'start' | 'draw' | 'end' | 'clear' | 'fill';
  x?: number;
  y?: number;
  color?: string;
  lineWidth?: number;
  fillColor?: string;
}

export interface GameState {
  id: string;
  state: 'waiting' | 'choosing' | 'drawing' | 'roundEnd' | 'gameEnd';
  players: Player[];
  currentRound: number;
  totalRounds: number;
  drawerId: string;
  hint: string;
  currentWord?: string;
  timeLeft: number;
  settings: {
    maxPlayers: number;
    rounds: number;
    drawTime: number;
    chooseTime: number;
  };
  drawActions: DrawAction[];
}

interface GameContextType {
  gameState: GameState | null;
  messages: ChatMessage[];
  myPlayerId: string;
  myPlayerName: string;
  roomId: string;
  wordChoices: string[];
  isDrawer: boolean;
  setMyPlayerName: (name: string) => void;
  createRoom: (name: string) => Promise<{ success: boolean; roomId?: string; error?: string }>;
  joinRoom: (roomId: string, name: string) => Promise<{ success: boolean; error?: string }>;
  leaveRoom: () => void;
  startGame: () => void;
  chooseWord: (word: string) => void;
  sendGuess: (text: string) => void;
  sendDraw: (action: DrawAction) => void;
  clearCanvas: () => void;
  undoDraw: () => void;
  updateSettings: (settings: any) => void;
}

const GameContext = createContext<GameContextType>({
  gameState: null,
  messages: [],
  myPlayerId: '',
  myPlayerName: '',
  roomId: '',
  wordChoices: [],
  isDrawer: false,
  setMyPlayerName: () => {},
  createRoom: async () => ({ success: false }),
  joinRoom: async () => ({ success: false }),
  leaveRoom: () => {},
  startGame: () => {},
  chooseWord: () => {},
  sendGuess: () => {},
  sendDraw: () => {},
  clearCanvas: () => {},
  undoDraw: () => {},
  updateSettings: () => {},
});

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myPlayerId, setMyPlayerId] = useState('');
  const [myPlayerName, setMyPlayerName] = useState(() => {
    return localStorage.getItem('scribble-name') || '';
  });
  const [roomId, setRoomId] = useState('');
  const [wordChoices, setWordChoices] = useState<string[]>([]);

  const isDrawer = gameState?.drawerId === myPlayerId;

  // Save name to localStorage
  useEffect(() => {
    if (myPlayerName) {
      localStorage.setItem('scribble-name', myPlayerName);
    }
  }, [myPlayerName]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    setMyPlayerId(socket.id || '');

    socket.on('game-state', (state: GameState) => {
      setGameState(state);
    });

    socket.on('chat-message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-99), msg]);
    });

    socket.on('word-choices', (data: { words: string[]; timeLeft: number }) => {
      setWordChoices(data.words);
    });

    socket.on('round-end', () => {
      setWordChoices([]);
    });

    socket.on('game-end', () => {
      setWordChoices([]);
    });

    socket.on('connect', () => {
      setMyPlayerId(socket.id || '');
    });

    return () => {
      socket.off('game-state');
      socket.off('chat-message');
      socket.off('word-choices');
      socket.off('round-end');
      socket.off('game-end');
      socket.off('connect');
    };
  }, [socket]);

  const createRoom = useCallback(
    async (name: string): Promise<{ success: boolean; roomId?: string; error?: string }> => {
      if (!socket) return { success: false, error: 'Нет соединения' };

      return new Promise((resolve) => {
        socket.emit('create-room', { playerName: name }, (response: any) => {
          if (response.success) {
            setRoomId(response.roomId);
            setMyPlayerId(response.player.id);
            setMessages([]);
            resolve({ success: true, roomId: response.roomId });
          } else {
            resolve({ success: false, error: response.error });
          }
        });
      });
    },
    [socket]
  );

  const joinRoom = useCallback(
    async (
      targetRoomId: string,
      name: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!socket) return { success: false, error: 'Нет соединения' };

      return new Promise((resolve) => {
        socket.emit(
          'join-room',
          { roomId: targetRoomId, playerName: name },
          (response: any) => {
            if (response.success) {
              setRoomId(response.roomId);
              setMyPlayerId(response.player.id);
              setMessages([]);
              if (response.state) setGameState(response.state);
              resolve({ success: true });
            } else {
              resolve({ success: false, error: response.error });
            }
          }
        );
      });
    },
    [socket]
  );

  const leaveRoom = useCallback(() => {
    if (!socket) return;
    socket.emit('leave-room');
    setGameState(null);
    setMessages([]);
    setRoomId('');
    setWordChoices([]);
  }, [socket]);

  const startGame = useCallback(() => {
    if (!socket) return;
    socket.emit('start-game');
  }, [socket]);

  const chooseWord = useCallback(
    (word: string) => {
      if (!socket) return;
      socket.emit('choose-word', { word });
      setWordChoices([]);
    },
    [socket]
  );

  const sendGuess = useCallback(
    (text: string) => {
      if (!socket || !text.trim()) return;
      socket.emit('guess', { text: text.trim() });
    },
    [socket]
  );

  const sendDraw = useCallback(
    (action: DrawAction) => {
      if (!socket) return;
      socket.emit('draw', action);
    },
    [socket]
  );

  const clearCanvas = useCallback(() => {
    if (!socket) return;
    socket.emit('clear-canvas');
  }, [socket]);

  const undoDraw = useCallback(() => {
    if (!socket) return;
    socket.emit('undo-draw');
  }, [socket]);

  const updateSettings = useCallback(
    (settings: any) => {
      if (!socket) return;
      socket.emit('update-settings', { settings });
    },
    [socket]
  );

  return (
    <GameContext.Provider
      value={{
        gameState,
        messages,
        myPlayerId,
        myPlayerName,
        roomId,
        wordChoices,
        isDrawer,
        setMyPlayerName,
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        chooseWord,
        sendGuess,
        sendDraw,
        clearCanvas,
        undoDraw,
        updateSettings,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
