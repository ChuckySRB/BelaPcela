import type { FamilyArchive } from '../domain/model';
import type { ArchiveSnapshot } from '../storage/ArchiveRepository';
import { ArchiveRepository } from '../storage/ArchiveRepository';
import { applyCommand, commandLabels, type ArchiveCommand } from './commands';
import type { MediaFileInput } from '../storage/mediaFiles';
import type { ImportPlan } from './archiveTransfer';

interface HistoryEntry { before: FamilyArchive; after: FamilyArchive; label: string }
export class CommandDispatcher {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  // Serializes double clicks and keyboard commands; one failed command never poisons the queue.
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private repository: ArchiveRepository, private snapshot: ArchiveSnapshot) {}
  get current() { return this.snapshot; }
  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
  get undoLabel() { return this.undoStack.at(-1)?.label; }
  get redoLabel() { return this.redoStack.at(-1)?.label; }
  private serial<T>(action: () => Promise<T>): Promise<T> {
    const result = this.queue.then(action);
    this.queue = result.catch(() => undefined);
    return result;
  }

  execute(command: ArchiveCommand, files: MediaFileInput[] = []) {
    return this.serial(async () => {
      let personId: string | undefined;
      let recordId: string | undefined;
      const result = await this.repository.commit(this.snapshot.revision, archive => {
        const applied = applyCommand(archive, command); personId = applied.personId; recordId = applied.recordId; return applied.archive;
      }, files, this.snapshot.archive.id);
      if (result.after.revision !== result.before.revision) {
        this.undoStack.push({ before: result.before.archive, after: result.after.archive, label: commandLabels[command.type] });
        if (this.undoStack.length > 50) this.undoStack.shift();
        this.redoStack = [];
      }
      this.snapshot = result.after;
      return { ...this.snapshot, personId, recordId };
    });
  }

  undo() { return this.moveHistory(this.undoStack, this.redoStack, 'before'); }
  redo() { return this.moveHistory(this.redoStack, this.undoStack, 'after'); }
  importArchive(plan: ImportPlan, mode: 'new' | 'replace') {
    return this.serial(async () => {
      this.snapshot = await this.repository.importArchive(plan, mode, this.snapshot);
      this.undoStack = []; this.redoStack = []; return this.snapshot;
    });
  }
  selectArchive(id: string) {
    return this.serial(async () => {
      this.snapshot = await this.repository.selectArchive(id, this.snapshot);
      this.undoStack = []; this.redoStack = []; return this.snapshot;
    });
  }
  createArchive(name: string) {
    return this.serial(async () => {
      this.snapshot = await this.repository.createArchive(name, this.snapshot);
      this.undoStack = []; this.redoStack = []; return this.snapshot;
    });
  }
  private moveHistory(from: HistoryEntry[], to: HistoryEntry[], side: 'before' | 'after') {
    return this.serial(async () => {
      const entry = from.at(-1);
      if (!entry) return this.snapshot;
      const result = await this.repository.commit(this.snapshot.revision, () => entry[side], [], this.snapshot.archive.id);
      from.pop(); to.push(entry); this.snapshot = result.after;
      return this.snapshot;
    });
  }
}
