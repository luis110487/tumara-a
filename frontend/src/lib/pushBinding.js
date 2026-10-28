function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tumarana-push', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('settings');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readPushBinding() {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('settings').objectStore('settings').get('account');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
export async function writePushBinding(value) {
  const db = await database();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('settings', 'readwrite');
      transaction.objectStore('settings').put(value, 'account');
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
}
