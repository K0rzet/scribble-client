import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useSocket } from './SocketContext';
import { SERVER_URL } from '../config';

export type GameMode = 'classic' | 'gallery' | 'spy' | 'telephone' | 'speed' | 'reveal';

export const MODE_NAMES: Record<GameMode, string> = {
  classic: 'Классика',
  gallery: 'Оценка',
  spy: 'Шпион',
  telephone: 'Телефон',
  speed: 'Быстрый раунд',
  reveal: 'Угадай по частям',
};

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
  guessedAt: number;
  isEliminated?: boolean;
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

export interface WordEntry {
  word: string;
  category: string;
}

export interface GuessOrderEntry {
  playerId: string;
  playerName: string;
  position: number;
  score: number;
  timeElapsed: number;
}

export interface RoundEndData {
  word: string;
  category?: string;
  players: Player[];
  scoreDeltas?: Record<string, number>;
  guessOrder?: GuessOrderEntry[];
  mode?: GameMode;
  // Gallery
  voteCounts?: Record<string, number>;
  // Spy
  spyId?: string;
  spyIds?: string[];
  spyName?: string;
  spyCaught?: boolean;
  spiesWin?: boolean;
  isGuessingPhase?: boolean;
  isMatchEnd?: boolean;
  // Telephone
  telephoneChain?: Array<{
    playerId: string;
    playerName: string;
    type: 'draw' | 'guess';
    dataUrl?: string;
    text?: string;
  }>;
  // Speed
  speedWordsGuessed?: number;
  speedDrawerName?: string;
  speedPlayerStats?: Record<string, { wordsGuessed: number; playerName: string }>;
}

export interface GameState {
  id: string;
  state: string;
  mode: GameMode;
  players: Player[];
  currentRound: number;
  totalRounds: number;
  drawerId: string;
  hint: string;
  currentWord?: string;
  currentCategory?: string;
  timeLeft: number;
  settings: {
    maxPlayers: number;
    rounds: number;
    drawTime: number;
    chooseTime: number;
    mode: GameMode;
    wordBankIds: string[];
    spyCount?: number;
  };
  drawActions: DrawAction[];
  speedWordsGuessed?: number;
  revealProgress?: number;
  revealedTiles?: number[];
  revealImageUrl?: string;
  galleryReadyIds?: string[];
  galleryVotedIds?: string[];
}

export interface GalleryDrawing {
  playerId: string;
  playerName: string;
  dataUrl: string;
}

export interface WordBankSummary {
  id: string;
  name: string;
  wordCount: number;
  categoryCount: number;
}

interface GameContextType {
  gameState: GameState | null;
  messages: ChatMessage[];
  myPlayerId: string;
  myPlayerName: string;
  roomId: string;
  wordChoices: WordEntry[];
  isDrawer: boolean;
  roundEndData: RoundEndData | null;
  setMyPlayerName: (name: string) => void;
  createRoom: (name: string, settings?: any) => Promise<{ success: boolean; roomId?: string; error?: string }>;
  joinRoom: (roomId: string, name: string) => Promise<{ success: boolean; error?: string }>;
  leaveRoom: () => void;
  startGame: () => void;
  chooseWord: (word: string) => void;
  sendGuess: (text: string) => void;
  sendDraw: (action: DrawAction) => void;
  sendDrawBatch: (actions: DrawAction[]) => void;
  clearCanvas: () => void;
  undoDraw: () => void;
  updateSettings: (settings: any) => void;
  fetchWordBanks: () => Promise<WordBankSummary[]>;
  galleryDrawings: GalleryDrawing[];
  submitGalleryDrawing: (dataUrl: string) => void;
  submitGalleryVote: (scores: Record<string, number>) => void;
  // Spy Mode
  spyRole?: 'spy' | 'player';
  spyWord?: string;
  spyCategory?: string;
  submitSpyVote: (suspectId: string) => void;
  // Telephone Mode
  telephoneWord?: string;
  telephoneImage?: string;
  submitTelephoneDrawing: (dataUrl: string) => void;
  submitTelephoneGuess: (text: string) => void;
  // Reveal Mode
  revealImageUrl: string;
  revealedTiles: number[];
}

const GameContext = createContext<GameContextType>({
  gameState: null,
  messages: [],
  myPlayerId: '',
  myPlayerName: '',
  roomId: '',
  wordChoices: [],
  isDrawer: false,
  roundEndData: null,
  setMyPlayerName: () => {},
  createRoom: async () => ({ success: false }),
  joinRoom: async () => ({ success: false }),
  leaveRoom: () => {},
  startGame: () => {},
  chooseWord: () => {},
  sendGuess: () => {},
  sendDraw: () => {},
  sendDrawBatch: () => {},
  clearCanvas: () => {},
  undoDraw: () => {},
  updateSettings: () => {},
  fetchWordBanks: async () => [],
  galleryDrawings: [],
  submitGalleryDrawing: () => {},
  submitGalleryVote: () => {},
  submitSpyVote: () => {},
  spyCategory: undefined,
  submitTelephoneDrawing: () => {},
  submitTelephoneGuess: () => {},
  revealImageUrl: '',
  revealedTiles: [],
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
  const [wordChoices, setWordChoices] = useState<WordEntry[]>([]);
  const [roundEndData, setRoundEndData] = useState<RoundEndData | null>(null);
  const [galleryDrawings, setGalleryDrawings] = useState<GalleryDrawing[]>([]);

  // Spy Mode State
  const [spyRole, setSpyRole] = useState<'spy' | 'player'>();
  const [spyWord, setSpyWord] = useState<string>();
  const [spyCategory, setSpyCategory] = useState<string>();

  // Telephone Mode State
  const [telephoneWord, setTelephoneWord] = useState<string>();
  const [telephoneImage, setTelephoneImage] = useState<string>();

  // Reveal Mode State
  const [revealImageUrl, setRevealImageUrl] = useState<string>('');
  const [revealedTiles, setRevealedTiles] = useState<number[]>([]);

  const toRevealImageUrl = useCallback((url: string): string => {
    if (!url) return '';
    // Room can send either direct URL or server endpoint path.
    if (url.startsWith('/api/reveal-image')) return `${SERVER_URL}${url}`;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return `${SERVER_URL}/api/reveal-image?src=${encodeURIComponent(url)}`;
    }
    return url;
  }, []);

  const myPlayer = gameState?.players.find((p) => p.id === myPlayerId);
  const isDrawer = gameState?.drawerId === 'all'
    ? Boolean(myPlayer?.isDrawing)
    : gameState?.drawerId === myPlayerId;

  useEffect(() => {
    if (myPlayerName) {
      localStorage.setItem('scribble-name', myPlayerName);
    }
  }, [myPlayerName]);

  useEffect(() => {
    if (!socket) return;

    setMyPlayerId(socket.id || '');

    socket.on('game-state', (state: GameState) => {
      setGameState(state);
      // Clear round-end data whenever we leave result screens
      if (state.state !== 'roundEnd' && state.state !== 'gameEnd') {
        setRoundEndData(null);
      }

      // Keep voting drawings only while actually voting
      if (state.state !== 'voting' && state.state !== 'spyVoting') {
        setGalleryDrawings([]);
      }

      // Sync reveal tiles from server state (for reconnect)
      if (state.state === 'revealing') {
        if (state.revealImageUrl) setRevealImageUrl(toRevealImageUrl(state.revealImageUrl));
        if (state.revealedTiles)  setRevealedTiles(state.revealedTiles);
      } else {
        setRevealImageUrl('');
        setRevealedTiles([]);
      }
    });

    socket.on('chat-message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-99), msg]);
    });

    socket.on('chat-cleared', () => {
      setMessages([]);
    });

    socket.on('word-choices', (data: { words: WordEntry[]; timeLeft: number }) => {
      setWordChoices(data.words);
    });

    socket.on('round-end', (data: RoundEndData) => {
      setWordChoices([]);
      setRoundEndData(data);
    });

    socket.on('game-end', () => {
      setWordChoices([]);
      setGalleryDrawings([]);
    });

    socket.on('gallery-vote-start', (data: { drawings: GalleryDrawing[]; timeLeft: number }) => {
      setGalleryDrawings(data.drawings);
    });

    socket.on('spy-role', (data: { role: 'spy' | 'player'; word: string | null; category?: string }) => {
      setSpyRole(data.role);
      setSpyWord(data.word || undefined);
      setSpyCategory(data.category || undefined);
    });

    socket.on('spy-vote-start', (data: { timeLeft: number; drawings: GalleryDrawing[] }) => {
      setGalleryDrawings(data.drawings);
    });

    socket.on('telephone-draw', (data: { word: string; timeLeft: number }) => {
      setTelephoneWord(data.word);
    });

    socket.on('telephone-guess', (data: { dataUrl: string; timeLeft: number }) => {
      setTelephoneImage(data.dataUrl);
    });

    socket.on('reveal-start', (data: { imageUrl: string; revealedTiles: number[]; totalTiles: number }) => {
      setRevealImageUrl(toRevealImageUrl(data.imageUrl || ''));
      setRevealedTiles(data.revealedTiles || []);
    });

    socket.on('reveal-tile', (data: { revealedTiles: number[]; progress: number; hint: string }) => {
      setRevealedTiles([...data.revealedTiles]);
    });

    socket.on('connect', () => {
      setMyPlayerId(socket.id || '');
    });

    return () => {
      socket.off('game-state');
      socket.off('chat-message');
      socket.off('chat-cleared');
      socket.off('word-choices');
      socket.off('round-end');
      socket.off('game-end');
      socket.off('gallery-vote-start');
      socket.off('spy-role');
      socket.off('spy-vote-start');
      socket.off('telephone-draw');
      socket.off('telephone-guess');
      socket.off('reveal-start');
      socket.off('reveal-tile');
      socket.off('connect');
    };
  }, [socket, toRevealImageUrl]);

  const createRoom = useCallback(
    async (name: string, settings?: any): Promise<{ success: boolean; roomId?: string; error?: string }> => {
      if (!socket) return { success: false, error: 'Нет соединения' };

      return new Promise((resolve) => {
        socket.emit('create-room', { playerName: name, settings }, (response: any) => {
          if (response.success) {
            setRoomId(response.roomId);
            setMyPlayerId(response.player.id);
            setMessages([]);
            setRoundEndData(null);
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
              setRoundEndData(null);
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
    setRoundEndData(null);
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

  const sendDrawBatch = useCallback(
    (actions: DrawAction[]) => {
      if (!socket || actions.length === 0) return;
      socket.emit('draw-batch', actions);
    },
    [socket]
  );

  const clearCanvas = useCallback(() => {
    if (!socket) return;
    if (gameState?.state === 'allDrawing' || gameState?.state === 'chainDraw') {
      window.dispatchEvent(new Event('local-clear'));
    } else {
      socket.emit('clear-canvas');
    }
  }, [socket, gameState?.state]);

  const undoDraw = useCallback(() => {
    if (!socket) return;
    if (gameState?.state === 'allDrawing' || gameState?.state === 'chainDraw') {
      window.dispatchEvent(new Event('local-undo'));
    } else {
      socket.emit('undo-draw');
    }
  }, [socket, gameState?.state]);

  const updateSettings = useCallback(
    (settings: any) => {
      if (!socket) return;
      socket.emit('update-settings', { settings });
    },
    [socket]
  );

  const fetchWordBanks = useCallback(
    async (): Promise<WordBankSummary[]> => {
      if (!socket) return [];
      return new Promise((resolve) => {
        socket.emit('get-word-banks', (response: { banks: WordBankSummary[] }) => {
          resolve(response.banks);
        });
      });
    },
    [socket]
  );

  const submitGalleryDrawing = useCallback((dataUrl: string) => {
    if (!socket) return;
    socket.emit('gallery-submit', { dataUrl });
  }, [socket]);

  const submitGalleryVote = useCallback(
    (scores: Record<string, number>) => {
      if (!socket) return;
      socket.emit('gallery-vote', { scores });
    },
    [socket]
  );

  const submitSpyVote = useCallback(
    (suspectId: string) => {
      if (!socket) return;
      socket.emit('spy-vote', { suspectId });
    },
    [socket]
  );

  const submitTelephoneDrawing = useCallback(
    (dataUrl: string) => {
      if (!socket) return;
      socket.emit('telephone-submit-drawing', { dataUrl });
    },
    [socket]
  );

  const submitTelephoneGuess = useCallback(
    (text: string) => {
      if (!socket) return;
      socket.emit('telephone-submit-guess', { text });
    },
    [socket]
  );

  return (
    <GameContext.Provider
      value={useMemo(() => ({
        gameState,
        messages,
        myPlayerId,
        myPlayerName,
        roomId,
        wordChoices,
        isDrawer,
        roundEndData,
        setMyPlayerName,
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        chooseWord,
        sendGuess,
        sendDraw,
        sendDrawBatch,
        clearCanvas,
        undoDraw,
        updateSettings,
        fetchWordBanks,
        galleryDrawings,
        submitGalleryDrawing,
        submitGalleryVote,
        spyRole,
        spyWord,
        spyCategory,
        submitSpyVote,
        telephoneWord,
        telephoneImage,
        submitTelephoneDrawing,
        submitTelephoneGuess,
        revealImageUrl,
        revealedTiles,
      }), [
        gameState,
        messages,
        myPlayerId,
        myPlayerName,
        roomId,
        wordChoices,
        isDrawer,
        roundEndData,
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        chooseWord,
        sendGuess,
        sendDraw,
        sendDrawBatch,
        clearCanvas,
        undoDraw,
        updateSettings,
        fetchWordBanks,
        galleryDrawings,
        submitGalleryDrawing,
        submitGalleryVote,
        spyRole,
        spyWord,
        spyCategory,
        submitSpyVote,
        telephoneWord,
        telephoneImage,
        submitTelephoneDrawing,
        submitTelephoneGuess,
        revealImageUrl,
        revealedTiles,
      ])}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
