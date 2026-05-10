import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchRemoteVocab } from '../lib/remoteVocab';
import { saveVocab } from '../lib/vocab';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string };

export default function RemoteLoader({ url }: { url: string }) {
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const vocab = await fetchRemoteVocab(url);
        if (cancelled) return;
        saveVocab(localStorage, vocab);
        navigate('/', { replace: true });
      } catch (e) {
        if (cancelled) return;
        setState({ kind: 'error', message: (e as Error).message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, attempt, navigate]);

  return (
    <main className="min-h-dvh p-6 flex items-center justify-center bg-sky-50 text-slate-900">
      <div className="max-w-md w-full text-center space-y-4">
        {state.kind === 'loading' && (
          <>
            <h1 className="text-2xl font-bold">Loading vocabulary…</h1>
            <p className="text-sm text-slate-600 break-all">{url}</p>
          </>
        )}
        {state.kind === 'error' && (
          <>
            <h1 className="text-2xl font-bold text-rose-700">Could not load vocabulary</h1>
            <p className="text-sm text-slate-600 break-all">{url}</p>
            <p className="text-sm bg-rose-50 border border-rose-200 rounded p-3 text-left">
              {state.message}
            </p>
            <p className="text-xs text-slate-500">
              The host must allow cross-origin requests (CORS). GitHub Gist raw URLs and most JSON-paste
              services work; Google Drive direct links and some pastebins do not.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setState({ kind: 'loading' });
                  setAttempt((a) => a + 1);
                }}
                className="flex-1 min-h-11 py-2 rounded-lg bg-sky-600 text-white font-semibold"
              >
                Retry
              </button>
              <Link
                to="/import"
                className="flex-1 min-h-11 py-2 rounded-lg bg-white border border-slate-300 font-semibold text-sky-700 flex items-center justify-center"
              >
                Import manually
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
