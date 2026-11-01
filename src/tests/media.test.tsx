/// <reference types="node" />
import { Blob as NativeBlob, File as NativeFile } from 'node:buffer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { identifyFile, MAX_FILE_BYTES, prepareMediaFiles } from '../services/mediaImport';
import { MediaContext, MediaImage } from '../features/media/MediaContext';

afterEach(() => vi.unstubAllGlobals());
describe('file validation and preparation', () => {
  it('checks file signatures against declared types and rejects executable content', async () => {
    const pdf = new NativeFile(['%PDF-1.4\noriginal'], 'letter.pdf', { type: 'application/pdf' }) as File;
    await expect(identifyFile(pdf)).resolves.toBe('application/pdf');
    await expect(identifyFile(new NativeFile(['<svg/>'], 'photo.png', { type: 'image/png' }) as File)).rejects.toThrow('није препозната');
    await expect(identifyFile(new NativeFile(['%PDF-1.4\n'], 'photo.png', { type: 'image/png' }) as File)).rejects.toThrow('не подудара');
    await expect(identifyFile(new NativeFile([''], 'empty.txt', { type: 'text/plain' }) as File)).rejects.toThrow('25 MB');
    const oversized = new NativeFile(['x'], 'large.txt', { type: 'text/plain' }); Object.defineProperty(oversized, 'size', { value: MAX_FILE_BYTES + 1 });
    await expect(identifyFile(oversized as File)).rejects.toThrow('25 MB');
  });
  it('keeps document bytes unchanged and produces one metadata record with shared links', async () => {
    const file = new NativeFile(['Писмо · ћирилица'], 'pismo.txt', { type: 'text/plain' }) as File;
    const prepared = await prepareMediaFiles([file], [{ entityType: 'person', entityId: 'nikola' }, { entityType: 'event', entityId: 'b-n' }]);
    expect(prepared.items).toHaveLength(1); expect(prepared.files).toHaveLength(1);
    expect(prepared.items[0].links).toHaveLength(2);
    expect(await prepared.files[0].original.text()).toBe('Писмо · ћирилица');
    expect(prepared.files[0].thumbnail).toBeUndefined();
    expect(JSON.stringify(prepared.items)).not.toContain('blob:');
  });
});

describe('object URL ownership', () => {
  it('revokes the thumbnail URL when the image is unmounted', async () => {
    const create = vi.fn(() => 'blob:owned-thumbnail'); const revoke = vi.fn();
    const OriginalURL = URL;
    class TestURL extends OriginalURL { static createObjectURL = create; static revokeObjectURL = revoke }
    vi.stubGlobal('URL', TestURL);
    const blob = new NativeBlob(['image bytes'], { type: 'image/png' }) as Blob;
    const load = vi.fn().mockResolvedValue(blob);
    const view = render(<MediaContext.Provider value={load}><MediaImage media={{ id: 'image', alt: 'Породични портрет', mimeType: 'image/png' }} /></MediaContext.Provider>);
    await waitFor(() => expect(screen.getByRole('img', { name: 'Породични портрет' })).toHaveAttribute('src', 'blob:owned-thumbnail'));
    expect(load).toHaveBeenCalledWith('image', 'thumbnail');
    view.unmount(); expect(revoke).toHaveBeenCalledWith('blob:owned-thumbnail');
  });
});
