import { useEffect, useRef, useState } from 'react';
import { useGame } from '../contexts/GameContext';
import styles from './ChatPanel.module.css';

export default function ChatPanel() {
  const { messages, sendGuess, isDrawer, gameState, myPlayerId } = useGame();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendGuess(input);
    setInput('');
  };

  const me = gameState?.players.find((p) => p.id === myPlayerId);
  const canType =
    gameState?.state === 'drawing' && !isDrawer && !me?.hasGuessed;

  return (
    <div className={styles.chatPanel}>
      <div className={styles.title}>💬 Чат</div>

      <div className={styles.messages}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.message} ${
              msg.type === 'system'
                ? styles.system
                : msg.type === 'correct'
                  ? styles.correct
                  : msg.type === 'close'
                    ? styles.close
                    : ''
            }`}
          >
            {msg.type === 'system' ? (
              <span>📢 {msg.text}</span>
            ) : msg.type === 'correct' ? (
              <span>
                🎉 <strong>{msg.playerName}</strong> угадал слово!
              </span>
            ) : msg.type === 'close' ? (
              <span>
                <span className={styles.msgAuthor}>{msg.playerName}:</span>
                {msg.text} — <em>Близко!</em>
              </span>
            ) : (
              <span>
                <span className={styles.msgAuthor}>{msg.playerName}:</span>
                {msg.text}
              </span>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputRow}>
        <input
          id="chat-input"
          type="text"
          className={styles.chatInput}
          placeholder={
            isDrawer
              ? 'Вы рисуете...'
              : me?.hasGuessed
                ? 'Вы уже угадали!'
                : gameState?.state === 'drawing'
                  ? 'Введите ответ...'
                  : 'Сообщение...'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={!canType && gameState?.state === 'drawing'}
          maxLength={100}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!canType && gameState?.state === 'drawing'}
        >
          →
        </button>
      </div>
    </div>
  );
}
