// IndexedDB helper for storing downloaded book files locally

const DB_NAME = 'BookLibraryDB';
const DB_VERSION = 1;
const STORE_NAME = 'downloadedBooks';

interface DownloadedBook {
  bookId: string;
  blob: Blob;
  downloadedAt: Date;
  fileName: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'bookId' });
      }
    };
  });
}

export async function saveBookLocally(bookId: string, blob: Blob, fileName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const data: DownloadedBook = {
      bookId,
      blob,
      downloadedAt: new Date(),
      fileName,
    };

    const request = store.put(data);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getLocalBook(bookId: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(bookId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result as DownloadedBook | undefined;
      resolve(result?.blob || null);
    };
  });
}

export async function isBookDownloaded(bookId: string): Promise<boolean> {
  const blob = await getLocalBook(bookId);
  return blob !== null;
}

export async function deleteLocalBook(bookId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(bookId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function downloadBookFromUrl(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to download book');
  }
  return response.blob();
}
