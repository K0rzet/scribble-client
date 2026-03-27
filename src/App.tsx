import { HashRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import { GameProvider } from './contexts/GameContext';
import { YandexSDKProvider } from './contexts/YandexSDKContext';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';

export default function App() {
  return (
    <YandexSDKProvider>
      <SocketProvider>
        <GameProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/lobby/:id" element={<LobbyPage />} />
              <Route path="/game/:id" element={<GamePage />} />
            </Routes>
          </HashRouter>
        </GameProvider>
      </SocketProvider>
    </YandexSDKProvider>
  );
}
