import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { version } from '../../package.json';
import type { ArchiveStore } from '../app/useArchive';
import { demoArchive } from '../domain/fixtures';
import { createEmptyArchive } from '../domain/archive';
import { EmptyCollection } from '../features/tree/EmptyCollection';
import { AboutDialog } from '../features/settings/AboutDialog';
import SettingsPage from '../features/settings/SettingsPage';
import { AppErrorBoundary } from '../components/AppErrorBoundary';

function store(): ArchiveStore {
  return {
    archive: demoArchive, status: 'saved', error: null, session: 0,
    reload: vi.fn(), execute: vi.fn(), undo: vi.fn(), redo: vi.fn(), uploadFiles: vi.fn(), loadMedia: vi.fn(),
    importArchive: vi.fn(), selectArchive: vi.fn(), createArchive: vi.fn(), transferSnapshot: vi.fn(),
    listArchives: vi.fn().mockResolvedValue([{ id: demoArchive.id, name: demoArchive.name }]),
    canUndo: false, canRedo: false, undoLabel: undefined, redoLabel: undefined,
  };
}

describe('first-use guidance', () => {
  it('offers recovery after a rendering error without exposing the error details', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const reload = vi.fn();
    function Broken(): never { throw new Error('Internal details'); }
    try {
      render(<AppErrorBoundary onReload={reload}><Broken /></AppErrorBoundary>);
      expect(screen.getByRole('alert')).toHaveTextContent('Приказ апликације није успео');
      expect(screen.queryByText('Internal details')).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Поново учитај апликацију' }));
      expect(reload).toHaveBeenCalledOnce();
    } finally { logged.mockRestore(); }
  });
  it('offers a first person and import instead of an empty graph', async () => {
    const create = vi.fn(); const backup = vi.fn();
    render(<EmptyCollection onCreate={create} onBackup={backup} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Почните своју породичну причу');
    await userEvent.click(screen.getByRole('button', { name: 'Додај прву особу' }));
    await userEvent.click(screen.getByRole('button', { name: 'Увези постојећу збирку' }));
    expect(create).toHaveBeenCalledOnce(); expect(backup).toHaveBeenCalledOnce();
  });

  it('explains local storage and backups and opens settings from the About dialog', async () => {
    const settings = vi.fn();
    render(<AboutDialog onClose={vi.fn()} onSettings={settings} onBackup={vi.fn()} />);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('О БелаПчели');
    expect(screen.getByText(`ВЕРЗИЈА ${version}`)).toBeInTheDocument();
    expect(screen.getByText(/Други уређај или прегледач има своју збирку/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Отвори подешавања' }));
    expect(settings).toHaveBeenCalledOnce();
  });

  it('retains the new-collection draft on failure and lets the user retry', async () => {
    const current = store(); current.createArchive = vi.fn().mockRejectedValueOnce(new Error('Нема простора')).mockResolvedValueOnce(undefined);
    window.location.hash = '/settings';
    render(<SettingsPage store={current} onBackup={vi.fn()} onAbout={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: 'Назив нове збирке' });
    const create = screen.getByRole('button', { name: 'Направи празну збирку' });
    expect(create).toBeDisabled();
    await userEvent.type(input, 'Наша породица'); await userEvent.click(create);
    expect(await screen.findByRole('alert')).toHaveTextContent('Нема простора');
    expect(input).toHaveValue('Наша породица'); expect(window.location.hash).toBe('#/settings');
    await userEvent.click(create);
    await waitFor(() => expect(window.location.hash).toBe('#/tree'));
    expect(current.createArchive).toHaveBeenCalledTimes(2);
  });

  it('updates the name after undo and locks collection creation while saving', async () => {
    const current = store();
    const about = vi.fn();
    const { rerender } = render(<SettingsPage store={current} onBackup={vi.fn()} onAbout={about} />);
    await userEvent.click(screen.getByRole('button', { name: 'О БелаПчели' })); expect(about).toHaveBeenCalledOnce();
    await userEvent.type(screen.getByRole('textbox', { name: 'Назив нове збирке' }), 'Будућа збирка');
    rerender(<SettingsPage store={{ ...current, status: 'saving', archive: createEmptyArchive('Промењен назив') }} onBackup={vi.fn()} onAbout={about} />);
    expect(screen.getByRole('textbox', { name: 'Назив збирке' })).toHaveValue('Промењен назив');
    expect(screen.getByRole('textbox', { name: 'Назив нове збирке' })).toHaveValue('Будућа збирка');
    expect(screen.getByRole('button', { name: 'Направи празну збирку' })).toBeDisabled();
  });
});
