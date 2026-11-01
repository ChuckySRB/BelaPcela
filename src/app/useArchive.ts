import { useCallback, useEffect, useRef, useState } from 'react';
import { demoArchive } from '../domain/fixtures';
import { DomainError } from '../domain/validation';
import { ArchiveRepository, type ArchiveSnapshot } from '../storage/ArchiveRepository';
import { CommandDispatcher } from '../services/CommandDispatcher';
import type { ArchiveCommand } from '../services/commands';

const repository = new ArchiveRepository();
export function useArchive() {
  const [snapshot, setSnapshot] = useState<ArchiveSnapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<CommandDispatcher | null>(null);
  const reload = useCallback(async () => {
    try {
      const loaded = await repository.initialize(demoArchive);
      controller.current = new CommandDispatcher(repository, loaded);
      setSnapshot(loaded); setStatus('saved'); setError(null);
    } catch {
      setStatus('error'); setError('Локална збирка није доступна. Проверите дозволе прегледача за чување података. Постојећи подаци нису преписани.');
    }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const run = useCallback(async <T extends ArchiveSnapshot>(operation: (dispatcher: CommandDispatcher) => Promise<T>): Promise<T> => {
    if (!controller.current) throw new Error('Local archive is not ready.');
    setStatus('saving'); setError(null);
    try {
      const result = await operation(controller.current);
      setSnapshot(result); setStatus('saved'); return result;
    } catch (cause) {
      const message = cause instanceof DomainError ? cause.message : 'Чување није успело. Проверите расположив простор и дозволе прегледача, па покушајте поново. Ваш унос је сачуван у отвореном обрасцу.';
      setStatus('error'); setError(message); throw new Error(message);
    }
  }, []);
  const execute = useCallback((command: ArchiveCommand) => run(dispatcher => dispatcher.execute(command)), [run]);
  const undo = useCallback(() => run(dispatcher => dispatcher.undo()), [run]);
  const redo = useCallback(() => run(dispatcher => dispatcher.redo()), [run]);
  return {
    archive: snapshot?.archive || null, status, error, reload, execute, undo, redo,
    canUndo: !!controller.current?.canUndo, canRedo: !!controller.current?.canRedo,
    undoLabel: controller.current?.undoLabel, redoLabel: controller.current?.redoLabel,
  };
}
export type ArchiveStore = ReturnType<typeof useArchive>;
