import { useSyncExternalStore } from 'react';

export type Bookmark = { code: string; title: string; url: string; jobZone: number | null };

const STORAGE_KEY = 'mot:bookmarks';
/** `storage` events only fire in other tabs, so same-tab writes announce themselves with this one. */
const CHANGE_EVENT = 'mot:bookmarks-change';
const EMPTY: Bookmark[] = [];

let cachedRaw: string | null = null;
let cached: Bookmark[] = EMPTY;

/** useSyncExternalStore needs a stable snapshot, so only re-parse when the stored string changes. */
function read(): Bookmark[] {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (raw !== cachedRaw) {
		cachedRaw = raw;
		try {
			const parsed: unknown = raw ? JSON.parse(raw) : EMPTY;
			cached = Array.isArray(parsed) ? parsed : EMPTY;
		} catch {
			cached = EMPTY;
		}
	}
	return cached;
}

function write(bookmarks: Bookmark[]) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
	window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
	const onStorage = (e: StorageEvent) => {
		if (e.key === STORAGE_KEY || e.key === null) onChange();
	};
	window.addEventListener('storage', onStorage);
	window.addEventListener(CHANGE_EVENT, onChange);
	return () => {
		window.removeEventListener('storage', onStorage);
		window.removeEventListener(CHANGE_EVENT, onChange);
	};
}

export function toggleBookmark(bookmark: Bookmark) {
	const bookmarks = read();
	write(
		bookmarks.some((b) => b.code === bookmark.code)
			? bookmarks.filter((b) => b.code !== bookmark.code)
			: [bookmark, ...bookmarks],
	);
}

export function removeBookmark(code: string) {
	write(read().filter((b) => b.code !== code));
}

export function clearBookmarks() {
	write(EMPTY);
}

/** Occupations the visitor saved for comparison, newest first, kept in localStorage and synced across tabs. */
export function useBookmarks() {
	return useSyncExternalStore(subscribe, read, () => EMPTY);
}
