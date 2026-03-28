import { useEffect, useRef } from 'react';
import { useGame } from '../contexts/GameContext';
import styles from './ChatPanel.module.css';

export default function ChatPanel() {
  const { messages } = useGame();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={styles.chatPanel}>
      <div className={styles.title}>💬 Чат</div>

      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.emptyHint}>
            Сообщения появятся здесь...
          </div>
        )}
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
                <em>Близко!</em>
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
    </div>
  );
}
