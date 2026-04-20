'use client';

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type FeedbackTone = 'success' | 'danger' | 'neutral';

type FeedbackItem = {
  id: string;
  title: string;
  description?: string;
  tone: FeedbackTone;
};

type FeedbackContextValue = {
  pushFeedback: (input: Omit<FeedbackItem, 'id'>) => void;
  dismissFeedback: (id: string) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

function createFeedbackId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function FeedbackProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<FeedbackItem[]>([]);

  const dismissFeedback = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const pushFeedback = useCallback(
    (input: Omit<FeedbackItem, 'id'>) => {
      const id = createFeedbackId();

      setItems((current) => [...current.slice(-2), { ...input, id }]);

      window.setTimeout(() => {
        dismissFeedback(id);
      }, 4500);
    },
    [dismissFeedback],
  );

  const value = useMemo<FeedbackContextValue>(
    () => ({
      pushFeedback,
      dismissFeedback,
    }),
    [dismissFeedback, pushFeedback],
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {items.length ? (
        <div className="toast-rail" aria-live="polite" aria-atomic="true">
          {items.map((item) => (
            <div key={item.id} className="toast-card" data-tone={item.tone}>
              <div>
                <strong>{item.title}</strong>
                {item.description ? (
                  <div className="muted" style={{ marginTop: 6 }}>
                    {item.description}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="toast-dismiss"
                aria-label="Zatvori poruku"
                onClick={() => dismissFeedback(item.id)}
              >
                X
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider.');
  }

  return context;
}
