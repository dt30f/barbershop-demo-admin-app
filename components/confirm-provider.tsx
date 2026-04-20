'use client';

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type ConfirmTone = 'danger' | 'neutral';

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

type ConfirmState = ConfirmOptions & {
  open: boolean;
  resolver: ((value: boolean) => void) | null;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const initialState: ConfirmState = {
  open: false,
  title: '',
  description: '',
  confirmLabel: 'Potvrdi',
  cancelLabel: 'Odustani',
  tone: 'neutral',
  resolver: null,
};

export function ConfirmProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<ConfirmState>(initialState);

  const close = useCallback((value: boolean) => {
    setState((current) => {
      current.resolver?.(value);
      return initialState;
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel ?? 'Potvrdi',
        cancelLabel: options.cancelLabel ?? 'Odustani',
        tone: options.tone ?? 'neutral',
        resolver: resolve,
      });
    });
  }, []);

  const value = useMemo<ConfirmContextValue>(
    () => ({
      confirm,
    }),
    [confirm],
  );

  return (
    <ConfirmContext.Provider value={value}>
      {children}

      {state.open ? (
        <div className="modal-backdrop" role="presentation" onClick={() => close(false)}>
          <div
            className="modal-card"
            data-tone={state.tone}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="stack">
              <div>
                <div className="badge" data-tone={state.tone === 'danger' ? 'danger' : 'neutral'}>
                  Potvrda akcije
                </div>
                <h2 id="confirm-modal-title" style={{ margin: '12px 0 0' }}>
                  {state.title}
                </h2>
                <p className="page-subtitle">{state.description}</p>
              </div>

              <div className="toolbar-row" style={{ justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="control-button"
                  data-variant="ghost"
                  onClick={() => close(false)}
                >
                  {state.cancelLabel}
                </button>
                <button
                  type="button"
                  className="control-button"
                  data-variant={state.tone === 'danger' ? 'danger' : 'primary'}
                  onClick={() => close(true)}
                >
                  {state.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider.');
  }

  return context;
}
