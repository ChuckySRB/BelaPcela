import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { demoArchive } from '../domain/fixtures';
import { RelationshipDialog } from '../features/relationships/RelationshipDialog';

describe('reviewed relationship changes', () => {
  it('previews only changed fields and retains the review after a failed save', async () => {
    const save = vi.fn().mockRejectedValue(new Error('Чување није успело.'));
    render(<RelationshipDialog target={{ type: 'parentChild', id: 'n-l' }} initialMode="edit" archive={demoArchive} onSave={save} onClose={vi.fn()} onReload={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText('Врста родитељства'), 'adoptive');
    await userEvent.click(screen.getByRole('button', { name: 'Прегледај измене' }));
    expect(save).not.toHaveBeenCalled(); expect(screen.getByText('Усвојитељско родитељство', { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Потврди и сачувај везу' }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ type: 'updateRelationship', relationship: { type: 'parentChild', id: 'n-l', changes: { kind: 'adoptive' } } }));
    expect(screen.getByRole('alert')).toHaveTextContent('Чување није успело.');
    expect(screen.getByRole('button', { name: 'Назад на измене' })).toBeEnabled();
  });
  it('requires a new delete confirmation when the reviewed relationship changes', async () => {
    const close = vi.fn(); const save = vi.fn(); const props = { target: { type: 'partnership' as const, id: 'nikola-ana' }, initialMode: 'delete' as const, onSave: save, onClose: close, onReload: vi.fn() };
    const view = render(<RelationshipDialog {...props} archive={demoArchive} />);
    const confirm = screen.getByRole('button', { name: 'Потврди брисање везе' }); expect(confirm).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Разумем да бришем само ову везу.' })); expect(confirm).toBeEnabled();
    const changed = structuredClone(demoArchive); changed.partnerships.find(record => record.id === 'nikola-ana')!.fromYear = 1980;
    view.rerender(<RelationshipDialog {...props} archive={changed} />);
    expect(confirm).toBeDisabled(); expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByText(/1980/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Одустани' })); expect(close).toHaveBeenCalledOnce(); expect(save).not.toHaveBeenCalled();
  });
  it('blocks an outdated edit review, retains the draft and uses refreshed untouched fields', async () => {
    const save = vi.fn().mockResolvedValue(undefined); const props = { target: { type: 'partnership' as const, id: 'nikola-ana' }, initialMode: 'edit' as const, onSave: save, onClose: vi.fn(), onReload: vi.fn() };
    const view = render(<RelationshipDialog {...props} archive={demoArchive} />);
    await userEvent.selectOptions(screen.getByLabelText('Врста партнерске везе'), 'partners'); await userEvent.click(screen.getByRole('button', { name: 'Прегледај измене' }));
    const changed = structuredClone(demoArchive); changed.partnerships.find(record => record.id === 'nikola-ana')!.fromYear = 1980;
    view.rerender(<RelationshipDialog {...props} archive={changed} />);
    expect(screen.getByRole('button', { name: 'Потврди и сачувај везу' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Назад на измене' }));
    expect(screen.getByLabelText('Врста партнерске везе')).toHaveValue('partners'); expect(screen.getByLabelText('Почетна година (необавезно)')).toHaveValue(1980);
    await userEvent.click(screen.getByRole('button', { name: 'Прегледај измене' })); await userEvent.click(screen.getByRole('button', { name: 'Потврди и сачувај везу' }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ relationship: { type: 'partnership', id: 'nikola-ana', changes: { kind: 'partners' } } }));
  });
});
