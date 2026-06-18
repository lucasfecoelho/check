import {
  ARCHIVE_NOTEBOOK_ENTRY_SQL,
  DELETE_NOTEBOOK_ITEM_SQL,
  DELETE_NOTEBOOK_ENTRY_SQL,
  INSERT_NOTEBOOK_ITEM_SQL,
  INSERT_NOTEBOOK_ENTRY_SQL,
  SEARCH_NOTEBOOK_ENTRIES_SQL,
  SELECT_NOTEBOOK_ITEMS_SQL,
  SELECT_NOTEBOOK_ITEM_BY_ID_SQL,
  SELECT_NOTEBOOK_ENTRIES_SQL,
  SELECT_NOTEBOOK_ENTRY_BY_ID_SQL,
  TOUCH_NOTEBOOK_ENTRY_SQL,
  TOGGLE_NOTEBOOK_ITEM_COMPLETED_SQL,
  UPDATE_NOTEBOOK_ITEM_SQL,
  UPDATE_NOTEBOOK_ENTRY_SQL,
} from './schema';
import { getTimestamp } from './date';
import { getDatabase } from './client';
import { createId } from './id';
import type {
  CreateNotebookEntryInput,
  CreateNotebookItemInput,
  NotebookEntry,
  NotebookEntryFilter,
  NotebookItem,
  NotebookEntryType,
  SyncNotebookItemInput,
  UpdateNotebookEntryInput,
  UpdateNotebookItemInput,
} from './types';

const NOTEBOOK_ENTRY_TYPES: NotebookEntryType[] = ['note', 'list', 'task'];

function validateNotebookEntryInput(
  input: CreateNotebookEntryInput | UpdateNotebookEntryInput
) {
  const title = input.title.trim();
  const content = input.content?.trim() || null;

  if (!title) {
    throw new Error('Informe um título para a anotação.');
  }

  if (!NOTEBOOK_ENTRY_TYPES.includes(input.type)) {
    throw new Error('Escolha um tipo válido para a anotação.');
  }

  return {
    content,
    title,
    type: input.type,
  };
}

export async function createNotebookEntry(input: CreateNotebookEntryInput) {
  const data = validateNotebookEntryInput(input);
  const db = await getDatabase();
  const timestamp = getTimestamp();
  const id = createId('note');

  await db.runAsync(INSERT_NOTEBOOK_ENTRY_SQL, [
    id,
    data.title,
    data.content,
    data.type,
    timestamp,
    timestamp,
  ]);

  return getNotebookEntryById(id);
}

export async function updateNotebookEntry(id: string, input: UpdateNotebookEntryInput) {
  const data = validateNotebookEntryInput(input);
  const db = await getDatabase();

  await db.runAsync(UPDATE_NOTEBOOK_ENTRY_SQL, [
    data.title,
    data.content,
    data.type,
    getTimestamp(),
    id,
  ]);

  return getNotebookEntryById(id);
}

export async function archiveNotebookEntry(id: string) {
  const db = await getDatabase();

  await db.runAsync(ARCHIVE_NOTEBOOK_ENTRY_SQL, [getTimestamp(), id]);

  return getNotebookEntryById(id);
}

export async function deleteNotebookEntry(id: string) {
  const db = await getDatabase();

  await db.runAsync(DELETE_NOTEBOOK_ENTRY_SQL, [id]);
}

export async function getNotebookEntries() {
  const db = await getDatabase();

  return db.getAllAsync<NotebookEntry>(SELECT_NOTEBOOK_ENTRIES_SQL);
}

export async function searchNotebookEntries(filter: NotebookEntryFilter, query: string) {
  const db = await getDatabase();
  const normalizedQuery = query.trim();
  const archived = filter === 'archived' ? 1 : 0;
  const type = filter === 'all' || filter === 'archived' ? null : filter;
  const likeQuery = `%${normalizedQuery}%`;

  return db.getAllAsync<NotebookEntry>(SEARCH_NOTEBOOK_ENTRIES_SQL, [
    archived,
    type,
    type,
    normalizedQuery,
    likeQuery,
    likeQuery,
    likeQuery,
  ]);
}

export async function getNotebookEntryById(id: string) {
  const db = await getDatabase();

  return db.getFirstAsync<NotebookEntry>(SELECT_NOTEBOOK_ENTRY_BY_ID_SQL, [id]);
}

function validateNotebookItemInput(
  input: CreateNotebookItemInput | UpdateNotebookItemInput
) {
  const title = input.title.trim();

  if (!title) {
    throw new Error('Informe um título para o item.');
  }

  if (!Number.isInteger(input.position) || input.position < 0) {
    throw new Error('Informe uma posição válida para o item.');
  }

  return {
    position: input.position,
    title,
  };
}

export async function getNotebookItems(noteId: string) {
  const db = await getDatabase();

  return db.getAllAsync<NotebookItem>(SELECT_NOTEBOOK_ITEMS_SQL, [noteId]);
}

async function getNotebookItemById(id: string) {
  const db = await getDatabase();

  return db.getFirstAsync<NotebookItem>(SELECT_NOTEBOOK_ITEM_BY_ID_SQL, [id]);
}

async function touchNotebookEntry(id: string) {
  const db = await getDatabase();

  await db.runAsync(TOUCH_NOTEBOOK_ENTRY_SQL, [getTimestamp(), id]);
}

export async function createNotebookItem(input: CreateNotebookItemInput) {
  const data = validateNotebookItemInput(input);
  const noteId = input.note_id.trim();

  if (!noteId) {
    throw new Error('Informe a anotação do item.');
  }

  const db = await getDatabase();
  const timestamp = getTimestamp();
  const id = createId('note-item');

  await db.runAsync(INSERT_NOTEBOOK_ITEM_SQL, [
    id,
    noteId,
    data.title,
    data.position,
    timestamp,
    timestamp,
  ]);
  await touchNotebookEntry(noteId);

  const items = await getNotebookItems(noteId);

  return items.find((item) => item.id === id) ?? null;
}

export async function updateNotebookItem(id: string, input: UpdateNotebookItemInput) {
  const data = validateNotebookItemInput(input);
  const db = await getDatabase();
  const item = await getNotebookItemById(id);

  await db.runAsync(UPDATE_NOTEBOOK_ITEM_SQL, [
    data.title,
    data.position,
    getTimestamp(),
    id,
  ]);

  if (item) {
    await touchNotebookEntry(item.note_id);
  }
}

export async function deleteNotebookItem(id: string) {
  const db = await getDatabase();
  const item = await getNotebookItemById(id);

  await db.runAsync(DELETE_NOTEBOOK_ITEM_SQL, [id]);

  if (item) {
    await touchNotebookEntry(item.note_id);
  }
}

export async function toggleNotebookItemCompleted(id: string) {
  const db = await getDatabase();
  const item = await getNotebookItemById(id);

  await db.runAsync(TOGGLE_NOTEBOOK_ITEM_COMPLETED_SQL, [getTimestamp(), id]);

  if (item) {
    await touchNotebookEntry(item.note_id);
  }
}

export async function syncNotebookItems(noteId: string, nextItems: SyncNotebookItemInput[]) {
  const existingItems = await getNotebookItems(noteId);
  const existingItemsById = new Map(existingItems.map((item) => [item.id, item]));
  const retainedItemIds = new Set(
    nextItems.flatMap((item) =>
      item.id && existingItemsById.has(item.id) ? [item.id] : []
    )
  );

  for (const item of existingItems) {
    if (!retainedItemIds.has(item.id)) {
      await deleteNotebookItem(item.id);
    }
  }

  for (const [position, item] of nextItems.entries()) {
    const previousItem = item.id ? existingItemsById.get(item.id) : undefined;

    if (previousItem) {
      if (previousItem.title !== item.title || previousItem.position !== position) {
        await updateNotebookItem(previousItem.id, {
          position,
          title: item.title,
        });
      }

      if ((previousItem.completed === 1) !== item.completed) {
        await toggleNotebookItemCompleted(previousItem.id);
      }

      continue;
    }

    const createdItem = await createNotebookItem({
      note_id: noteId,
      position,
      title: item.title,
    });

    if (item.completed && createdItem) {
      await toggleNotebookItemCompleted(createdItem.id);
    }
  }

  return getNotebookItems(noteId);
}
