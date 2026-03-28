import { useEffect, useRef, useState } from 'react';
import styles from './GameNotification.module.css';

export interface NotificationData {
  id: number;
  emoji: string;
  title: string;
  subtitle?: string;
  color?: 'green' | 'yellow' | 'blue' | 'red' | 'purple';
  /** Display duration in ms, default 2000 */
  duration?: number;
}

interface Props {
  notification: NotificationData | null;
}

export default function GameNotification({ notification }: Props) {
  const [current, setCurrent] = useState<NotificationData | null>(null);
  const [fading, setFading] = useState(false);
  const fadeTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!notification) return;

    // Cancel existing timers
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);

    setFading(false);
    setCurrent(notification);

    const dur = notification.duration ?? 2000;
    const FADE = 350; // must match CSS animation duration

    // Start fade-out slightly before hiding
    fadeTimer.current = window.setTimeout(() => {
      setFading(true);
    }, dur - FADE);

    hideTimer.current = window.setTimeout(() => {
      setCurrent(null);
      setFading(false);
    }, dur);

    return () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [notification]);

  if (!current) return null;

  return (
    <div
      className={`${styles.notification} ${styles[current.color ?? 'green']} ${fading ? styles.fading : ''}`}
      key={current.id}
    >
      <span className={styles.emoji}>{current.emoji}</span>
      <div className={styles.text}>
        <div className={styles.title}>{current.title}</div>
        {current.subtitle && (
          <div className={styles.subtitle}>{current.subtitle}</div>
        )}
      </div>
    </div>
  );
}
