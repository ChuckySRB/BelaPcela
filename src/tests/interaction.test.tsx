import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HexBadge } from '../components/HexBadge';
import { PersonInspector } from '../features/tree/PersonDetails';
import { GlobalSearchDialog } from '../features/tree/PrototypeDialogs';
import { RelativeEditorDialog } from '../features/people/RelativeEditorDialog';
import { PersonEditorDialog } from '../features/people/PersonEditorDialog';
import { demoArchive } from '../domain/fixtures';
import { initials, lifeYears } from '../domain/people';
import { initialUiState, uiReducer } from '../app/uiState';

describe('selection and focus', () => {
  it('resolves a person removed by undo before rendering an empty inspector', () => {
    const state = { ...initialUiState, selectedPersonId: 'undone-person', focusPersonId: 'undone-person', inspector: { kind: 'person' as const, id: 'undone-person' } };
    expect(uiReducer(state, { type: 'reconcile', personIds: ['nikola', 'vera'] })).toMatchObject({
      selectedPersonId: 'nikola', focusPersonId: 'nikola', inspector: { kind: 'person', id: 'nikola' },
    });
    expect(uiReducer(initialUiState, { type: 'reconcile', personIds: ['nikola'] })).toBe(initialUiState);
  });
  it('selection changes only the selected person and inspector', () => {
    const state = { ...initialUiState, collapsedBranches: ['branch-to-retain'] };
    const selected = uiReducer(state, { type: 'select', personId: 'vera' });
    expect(selected).toEqual({ ...state, selectedPersonId: 'vera', inspector: { kind: 'person', id: 'vera' } });
    expect(selected.collapsedBranches).toBe(state.collapsedBranches);
    expect(uiReducer(selected, { type: 'focus', personId: 'vera' })).toMatchObject({ selectedPersonId: 'vera', focusPersonId: 'vera', mode: 'focused' });
  });
});

describe('accessible prototype components', () => {
  it('activates an interactive hex badge with the keyboard', async () => {
    const click = vi.fn();
    render(<HexBadge label="Породична веза" onClick={click}>+</HexBadge>);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Породична веза' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(click).toHaveBeenCalledOnce();
  });

  it('omits absent optional fields from the inspector', () => {
    const archive = { ...demoArchive, people: [{ id: 'empty' }], parentChildRelationships: [], partnerships: [], events: [] };
    const actions = { selectPerson: vi.fn(), focusPerson: vi.fn(), openProfile: vi.fn(), addRelative: vi.fn(), editPerson: vi.fn(), showUnavailable: vi.fn() };
    render(<PersonInspector archive={archive} person={archive.people[0]} actions={actions} focused={false} onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Неименована особа' })).toBeInTheDocument();
    expect(screen.queryByText('Рођење')).not.toBeInTheDocument();
    expect(screen.queryByText('Занимање')).not.toBeInTheDocument();
    expect(screen.queryByText('Животна прича')).not.toBeInTheDocument();
    expect(screen.queryByText('Породичне везе')).not.toBeInTheDocument();
    expect(lifeYears(archive, 'empty')).toBeUndefined();
    expect(initials({ id: 'x', name: '  Ана   Јовановић  ' })).toBe('АЈ');
  });

  it('searches names and nicknames and selects a real person', async () => {
    const select = vi.fn();
    render(<GlobalSearchDialog archive={demoArchive} onSelect={select} onClose={vi.fn()} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Претражи особе' }), 'ниџа');
    expect(screen.getByRole('status')).toHaveTextContent('1 особа');
    await userEvent.click(screen.getByRole('button', { name: /Никола Петронић/ }));
    expect(select).toHaveBeenCalledWith('nikola');
  });

  it('previews explicit parentage and submits only after confirmation', async () => {
    const before = JSON.stringify(demoArchive);
    const save = vi.fn().mockResolvedValue(undefined);
    render(<RelativeEditorDialog anchorId="nikola" archive={demoArchive} onSave={save} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /^Дете/ }));
    expect(screen.getByRole('combobox', { name: /Други родитељ/ })).toHaveValue('');
    await userEvent.type(screen.getByRole('textbox', { name: /Име и презиме/ }), 'Тест дете');
    await userEvent.click(screen.getByRole('button', { name: /Прегледај везу/ }));
    expect(screen.getByText(/Други родитељ није познат/)).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Потврди и сачувај' }));
    expect(save).toHaveBeenCalledWith({ type: 'addRelative', anchorId: 'nikola', relationship: 'child', target: { newPerson: { name: 'Тест дете' } }, parentageKind: 'biological' });
    expect(JSON.stringify(demoArchive)).toBe(before);
  });

  it('reveals optional fields and keeps the draft when a save fails', async () => {
    render(<PersonEditorDialog person={demoArchive.people.find(person => person.id === 'luka')} archive={demoArchive} onClose={vi.fn()} onSave={vi.fn().mockRejectedValue(new Error('Нема слободног простора'))} />);
    expect(screen.queryByRole('textbox', { name: 'Надимак' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Додај податак'));
    await userEvent.click(screen.getByRole('button', { name: 'Надимак' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Надимак' }), 'Нови надимак');
    await userEvent.click(screen.getByRole('button', { name: 'Сачувај измене' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Нема слободног простора');
    expect(screen.getByRole('textbox', { name: 'Надимак' })).toHaveValue('Нови надимак');
  });
});
