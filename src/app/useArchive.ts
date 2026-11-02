import { useCallback, useEffect, useRef, useState } from 'react';
import { demoArchive } from '../domain/fixtures';
import { DomainError } from '../domain/validation';
import { ArchiveRepository, type ArchiveSnapshot } from '../storage/ArchiveRepository';
import { CommandDispatcher } from '../services/CommandDispatcher';
import type { ArchiveCommand } from '../services/commands';
import type { MediaLink } from '../domain/model';
import { prepareMediaFiles } from '../services/mediaImport';
import type { ImportPlan } from '../services/archiveTransfer';

const repository = new ArchiveRepository();
export function useArchive() {
  const [snapshot, setSnapshot] = useState<ArchiveSnapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState(0);
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
  const uploadFiles = useCallback((files: File[], links: MediaLink[]) => run(async dispatcher => {
    const prepared = await prepareMediaFiles(files, links);
    return dispatcher.execute({ type: 'addMedia', items: prepared.items }, prepared.files);
  }), [run]);
  const archiveId = snapshot?.archive.id;
  const loadMedia = useCallback((id: string, variant: 'original' | 'thumbnail') => archiveId ? repository.getMediaBlob(archiveId, id, variant) : Promise.resolve(undefined), [archiveId]);
  const importArchive = useCallback(async (plan: ImportPlan, mode: 'new' | 'replace') => {
    await run(dispatcher => dispatcher.importArchive(plan, mode)); setSession(value => value + 1);
  }, [run]);
  const selectArchive = useCallback(async (id: string) => {
    await run(dispatcher => dispatcher.selectArchive(id)); setSession(value => value + 1);
  }, [run]);
  return {
    archive: snapshot?.archive || null, status, error, reload, execute, undo, redo, uploadFiles, loadMedia, session, importArchive, selectArchive,
    transferSnapshot: () => repository.transferSnapshot(), listArchives: () => repository.listArchives(),
    canUndo: !!controller.current?.canUndo, canRedo: !!controller.current?.canRedo,
    undoLabel: controller.current?.undoLabel, redoLabel: controller.current?.redoLabel,
  };
}
export type ArchiveStore = ReturnType<typeof useArchive>;
