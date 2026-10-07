import { createContext, useContext, useEffect, useId, useRef } from 'react';
import type { FormEvent, RefObject } from 'react';

export interface TestEditorEntry { dirty: boolean; save: () => Promise<boolean>; }
export interface TestEditorRegistry {
  entries: Map<string, TestEditorEntry>;
  changed: () => void;
}
export const TestEditorSaveContext = createContext<TestEditorRegistry | null>(null);

/** Registers only changed forms; untouched add-item forms must never create records. */
export function useTestEditorForm(submit: (event: FormEvent) => Promise<boolean | undefined>) {
  const registry = useContext(TestEditorSaveContext);
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const revision = useRef(0);
  const saving = useRef<Promise<boolean> | null>(null);
  const entry = useRef<TestEditorEntry>({ dirty: false, save: async () => false });
  entry.current.save = () => {
    if (saving.current) return saving.current;
    if (!formRef.current?.reportValidity()) return Promise.resolve(false);
    const savedRevision = revision.current;
    const request = (async () => {
      const result = await submitRef.current({ preventDefault() {} } as FormEvent);
      if (result === true && revision.current === savedRevision) {
        entry.current.dirty = false;
        registry?.changed();
      }
      return result === true;
    })();
    saving.current = request;
    void request.finally(() => { saving.current = null; }).catch(() => {});
    return request;
  };
  useEffect(() => {
    registry?.entries.set(id, entry.current);
    return () => { registry?.entries.delete(id); registry?.changed(); };
  }, [registry, id]);
  return {
    ref: formRef as RefObject<HTMLFormElement>,
    onChangeCapture: () => { revision.current += 1; entry.current.dirty = true; registry?.changed(); },
    onSubmit: async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await entry.current.save();
    },
  };
}
