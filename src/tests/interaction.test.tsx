import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HexBadge } from '../components/HexBadge';
import { PersonInspector } from '../features/tree/PersonDetails';
import { GlobalSearchDialog, RelativeAddDialog } from '../features/tree/PrototypeDialogs';
import { demoArchive } from '../domain/fixtures';
import { initials, lifeYears } from '../domain/people';
import { initialUiState, uiReducer } from '../app/uiState';

describe('selection and focus', () => {
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
    const actions = { selectPerson: vi.fn(), focusPerson: vi.fn(), openProfile: vi.fn(), addRelative: vi.fn(), showUnavailable: vi.fn() };
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
    await userEvent.click(screen.getByRole('button', { name: /Никола Петровић/ }));
    expect(select).toHaveBeenCalledWith('nikola');
  });

  it('explains that adding a relative is a preview and does not mutate data', async () => {
    const before = JSON.stringify(demoArchive);
    render(<RelativeAddDialog name="Никола Петровић" onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /^Дете/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Унос и чување сродника стижу у наредној фази');
    expect(screen.getByText(/Други родитељ се бира посебно/)).toBeInTheDocument();
    expect(JSON.stringify(demoArchive)).toBe(before);
  });
});
