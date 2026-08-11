import Dexie, { type EntityTable } from 'dexie';
import type { Notebook, Page, Stroke, Shape, AppState, VersionSnapshot } from '../types';

const db = new Dexie('InfinityBoard') as Dexie & {
  notebooks: EntityTable<Notebook, 'id'>;
  pages: EntityTable<Page, 'id'>;
  strokes: EntityTable<Stroke, 'id'>;
  shapes: EntityTable<Shape, 'id'>;
  settings: EntityTable<AppState & { id: string }, 'id'>;
  versions: EntityTable<VersionSnapshot, 'id'>;
};

db.version(1).stores({
  notebooks: 'id, createdAt',
  pages: 'id, notebookId, order, createdAt',
  strokes: 'id, pageId, createdAt',
  shapes: 'id, pageId, createdAt',
  settings: 'id',
  versions: 'id, pageId, createdAt',
});

export { db };

// Repository layer
export const notebookRepo = {
  async getOrCreateDefault(): Promise<Notebook> {
    const existing = await db.notebooks.orderBy('createdAt').first();
    if (existing) return existing;
    
    const now = Date.now();
    const pageId = crypto.randomUUID();
    const notebook: Notebook = {
      id: crypto.randomUUID(),
      schemaVersion: 1,
      pageOrder: [pageId],
      createdAt: now,
      updatedAt: now,
    };
    
    const defaultPage: Page = {
      id: pageId,
      notebookId: notebook.id,
      order: 0,
      background: 'white',
      viewport: { x: 0, y: 0 },
      zoom: 1,
      createdAt: now,
      updatedAt: now,
    };
    
    await db.notebooks.add(notebook);
    await db.pages.add(defaultPage);
    return notebook;
  },
  
  async update(id: string, changes: Partial<Notebook>) {
    await db.notebooks.update(id, { ...changes, updatedAt: Date.now() });
  },
};

export const pageRepo = {
  async getByNotebook(notebookId: string): Promise<Page[]> {
    return db.pages.where('notebookId').equals(notebookId).sortBy('order');
  },
  
  async get(id: string): Promise<Page | undefined> {
    return db.pages.get(id);
  },
  
  async create(notebookId: string, background: string, order: number): Promise<Page> {
    const now = Date.now();
    const page: Page = {
      id: crypto.randomUUID(),
      notebookId,
      order,
      background: background as Page['background'],
      viewport: { x: 0, y: 0 },
      zoom: 1,
      createdAt: now,
      updatedAt: now,
    };
    await db.pages.add(page);
    return page;
  },
  
  async update(id: string, changes: Partial<Page>) {
    await db.pages.update(id, { ...changes, updatedAt: Date.now() });
  },
  
  async delete(id: string) {
    await db.pages.delete(id);
    await db.strokes.where('pageId').equals(id).delete();
    await db.shapes.where('pageId').equals(id).delete();
  },
};

export const strokeRepo = {
  async getByPage(pageId: string): Promise<Stroke[]> {
    return db.strokes.where('pageId').equals(pageId).sortBy('createdAt');
  },
  
  async add(stroke: Stroke) {
    await db.strokes.add(stroke);
  },
  
  async addBatch(strokes: Stroke[]) {
    await db.strokes.bulkPut(strokes);
  },

  /** Sync strokes: upsert current ones, delete any from DB not in the current list */
  async syncPage(pageId: string, currentStrokes: Stroke[]) {
    const currentIds = new Set(currentStrokes.map(s => s.id));
    await db.strokes.bulkPut(currentStrokes);
    const dbStrokes = await db.strokes.where('pageId').equals(pageId).toArray();
    const toDelete = dbStrokes.filter(s => !currentIds.has(s.id)).map(s => s.id);
    if (toDelete.length > 0) {
      await db.strokes.bulkDelete(toDelete);
    }
  },

  async delete(id: string) {
    await db.strokes.delete(id);
  },

  async deleteByPage(pageId: string) {
    await db.strokes.where('pageId').equals(pageId).delete();
  },
};

export const shapeRepo = {
  async getByPage(pageId: string): Promise<Shape[]> {
    return db.shapes.where('pageId').equals(pageId).sortBy('createdAt');
  },
  
  async add(shape: Shape) {
    await db.shapes.put(shape);
  },
  
  async addBatch(shapes: Shape[]) {
    await db.shapes.bulkPut(shapes);
  },

  /** Sync shapes: upsert current ones, delete any from DB not in the current list */
  async syncPage(pageId: string, currentShapes: Shape[]) {
    const currentIds = new Set(currentShapes.map(s => s.id));
    await db.shapes.bulkPut(currentShapes);
    const dbShapes = await db.shapes.where('pageId').equals(pageId).toArray();
    const toDelete = dbShapes.filter(s => !currentIds.has(s.id)).map(s => s.id);
    if (toDelete.length > 0) {
      await db.shapes.bulkDelete(toDelete);
    }
  },

  async update(id: string, changes: Partial<Shape>) {
    await db.shapes.update(id, changes);
  },

  async delete(id: string) {
    await db.shapes.delete(id);
  },

  async deleteByPage(pageId: string) {
    await db.shapes.where('pageId').equals(pageId).delete();
  },
};

export const settingsRepo = {
  async get(): Promise<AppState | undefined> {
    const result = await db.settings.get('app-settings');
    if (result) {
      const { id: _, ...settings } = result;
      return settings;
    }
    return undefined;
  },
  
  async save(settings: AppState) {
    await db.settings.put({ ...settings, id: 'app-settings' });
  },
};

export const versionRepo = {
  async getByPage(pageId: string): Promise<VersionSnapshot[]> {
    return db.versions
      .where('pageId')
      .equals(pageId)
      .sortBy('createdAt')
      .then(versions => versions.slice(-50));
  },
  
  async add(snapshot: VersionSnapshot) {
    await db.versions.add(snapshot);
    // Prune old versions
    const versions = await db.versions
      .where('pageId')
      .equals(snapshot.pageId)
      .sortBy('createdAt');
    if (versions.length > 50) {
      const toDelete = versions.slice(0, versions.length - 50).map(v => v.id);
      await db.versions.bulkDelete(toDelete);
    }
  },
  
  async getLatest(pageId: string): Promise<VersionSnapshot | undefined> {
    return db.versions.where('pageId').equals(pageId).last();
  },
};
