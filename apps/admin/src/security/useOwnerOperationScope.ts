import { useEffect, useMemo, useRef } from 'react';

/** A scope gets a new identity even when navigation returns to the same owner. */
export function useOwnerOperationScope(key: string) {
  const mounted = useRef(true);
  const current = useRef({ key, epoch: 0 });
  if (current.current.key !== key) current.current = { key, epoch: current.current.epoch + 1 };
  const owner = current.current;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return useMemo(
    () => ({
      epoch: owner.epoch,
      isCurrent: () => mounted.current && current.current === owner,
    }),
    [owner],
  );
}
