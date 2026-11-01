export interface MediaFileInput { id: string; original: Blob; thumbnail?: Blob }
export interface StoredMediaFile extends MediaFileInput { archiveId: string }
