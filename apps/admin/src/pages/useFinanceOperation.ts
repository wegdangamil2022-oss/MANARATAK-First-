import {useEffect, useRef, useState} from 'react';
import {adminApiClient, createAdminIdempotencyKey} from '../api/client';

type Intent = {path: string; body: string; key: string};
export function useFinanceOperation(scope: string, onSuccess: () => void) {
  const [intent, setIntent] = useState<Intent | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const [reference, setReference] = useState('');
  const pending = useRef<Intent | null>(null), locked = useRef(false), generation = useRef(0);
  useEffect(() => {
    ++generation.current; pending.current = null; locked.current = false;
    setIntent(null); setBusy(false); setError(''); setSaved(false); setReference('');
    return () => {++generation.current;};
  }, [scope]);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (pending.current || locked.current) {event.preventDefault(); event.returnValue = '';}
    };
    window.addEventListener('beforeunload', unload);
    return () => window.removeEventListener('beforeunload', unload);
  }, []);
  const send = async (command: Intent) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(''); setSaved(false);
    const request = generation.current;
    try {
      const result = await adminApiClient.request<{publicId?: string}>(command.path, {method: 'POST', body: command.body, idempotencyKey: command.key});
      if (request !== generation.current) return;
      pending.current = null; setIntent(null); setSaved(true); setReference(typeof result?.publicId === 'string' ? result.publicId : ''); onSuccess();
    } catch (cause) {
      if (request === generation.current) setError(cause instanceof Error ? cause.message : 'FINANCE_COMMAND_UNCERTAIN');
    } finally {
      if (request === generation.current) {locked.current = false; setBusy(false);}
    }
  };
  return {intent, busy, error, saved, reference,
    submit: (path: string, body: Record<string, unknown>) => {
      if (pending.current || locked.current) return;
      const command = {path, body: JSON.stringify(body), key: createAdminIdempotencyKey()};
      pending.current = command; setIntent(command); void send(command);
    },
    retry: () => {if (pending.current) void send(pending.current);},
    discard: () => {if (!locked.current) {pending.current = null; setIntent(null); setError(''); onSuccess();}},
  };
}
