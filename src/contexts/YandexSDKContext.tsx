import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    YaGames?: {
      init: (options?: { signed?: boolean }) => Promise<YandexSDK>;
    };
  }
}

interface YandexSDK {
  features: {
    LoadingAPI?: {
      ready: () => void;
    };
    GameplayAPI?: {
      start: () => void;
      stop: () => void;
    };
  };
  adv: {
    showFullscreenAdv: (params: {
      callbacks: {
        onClose: (wasShown: boolean) => void;
        onError: (error: Error) => void;
      };
    }) => void;
    showRewardedVideo: (params: {
      callbacks: {
        onOpen: () => void;
        onRewarded: () => void;
        onClose: () => void;
        onError: (error: Error) => void;
      };
    }) => void;
  };
  getPlayer: (options?: { signed?: boolean; scopes?: boolean }) => Promise<any>;
  getLeaderboards: () => Promise<any>;
  environment: {
    i18n: { lang: string; tld: string };
  };
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler: () => void) => void;
}

interface YandexSDKContextType {
  ysdk: YandexSDK | null;
  isReady: boolean;
  showInterstitialAd: () => Promise<void>;
  signalReady: () => void;
}

const YandexSDKContext = createContext<YandexSDKContextType>({
  ysdk: null,
  isReady: false,
  showInterstitialAd: async () => {},
  signalReady: () => {},
});

export function YandexSDKProvider({ children }: { children: React.ReactNode }) {
  const [ysdk, setYsdk] = useState<YandexSDK | null>(null);
  const [isReady, setIsReady] = useState(false);
  const readySignalled = useRef(false);

  useEffect(() => {
    async function initSDK() {
      try {
        if (window.YaGames) {
          const sdk = await window.YaGames.init();
          setYsdk(sdk);
          console.log('Yandex Games SDK initialized');
        } else {
          console.log('YaGames not available — running locally');
        }
      } catch (err) {
        console.warn('Failed to init Yandex Games SDK:', err);
      }
      setIsReady(true);
    }

    // Wait a bit for SDK script to load
    if (window.YaGames) {
      initSDK();
    } else {
      const timer = setTimeout(initSDK, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const signalReady = () => {
    if (readySignalled.current) return;
    readySignalled.current = true;
    if (ysdk?.features?.LoadingAPI) {
      ysdk.features.LoadingAPI.ready();
      console.log('LoadingAPI.ready() called');
    }
  };

  const showInterstitialAd = async (): Promise<void> => {
    if (!ysdk) return;
    return new Promise((resolve) => {
      ysdk.adv.showFullscreenAdv({
        callbacks: {
          onClose: () => resolve(),
          onError: () => resolve(),
        },
      });
    });
  };

  // Pause audio when tab is hidden (Yandex requirement)
  useEffect(() => {
    const handleVisibility = () => {
      // Game should handle this — mute audio when hidden
      document.dispatchEvent(
        new CustomEvent('game-visibility', {
          detail: { hidden: document.hidden },
        })
      );
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <YandexSDKContext.Provider
      value={{ ysdk, isReady, showInterstitialAd, signalReady }}
    >
      {children}
    </YandexSDKContext.Provider>
  );
}

export function useYandexSDK() {
  return useContext(YandexSDKContext);
}
