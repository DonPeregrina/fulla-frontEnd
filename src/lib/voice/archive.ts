/**
 * Archivo local de las imágenes de comida: se guardan en el propio dispositivo (IndexedDB), no en la nube.
 * Una imagen por (usuario, día, momento del día): al regenerarse con una respuesta nueva reemplaza a la anterior.
 *
 * Limitaciones (a propósito, sin almacenamiento en la nube): se pierden si se borran los datos del navegador o se
 * desinstala la app, y no pasan de un dispositivo a otro. Todo falla en silencio: si IndexedDB no está disponible
 * (modo privado, por ejemplo) el asistente sigue funcionando, solo que sin archivo.
 */
const DB_NAME = 'mnestics-archive'
const STORE = 'images'

export interface ArchivedImage {
  key: string
  userId: string
  /** Día local "YYYY-MM-DD". */
  day: string
  /** Momento del día en mayúsculas ("MORNING", "WAKING UP", …). */
  moment: string
  /** Lo que se dibujó (la descripción que se le mandó a la imagen). */
  description: string
  /** Preguntas cuyas respuestas dieron origen a la imagen (el Diario la muestra bajo ellas). */
  questionIds: string[]
  blob: Blob
  updatedAt: number
}

const keyOf = (userId: string, day: string, moment: string) => `${userId}|${day}|${moment.toUpperCase()}`

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'key' })
        store.createIndex('userId', 'userId')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(db => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = work(tx.objectStore(STORE))
    tx.oncomplete = () => { db.close(); resolve(req.result) }
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error) }
  }))
}

/** Reduce la imagen (≈1 MB) a un WebP de ≤512 px (decenas de KB). Si algo falla, devuelve la original. */
export async function shrinkImage(blob: Blob, max = 512): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(blob)
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const w = Math.round(bmp.width * scale)
    const h = Math.round(bmp.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
    bmp.close?.()
    const out = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/webp', 0.82))
    return out && out.size > 0 ? out : blob
  } catch {
    return blob
  }
}

let persistAsked = false
/** Pide al navegador que no borre este almacenamiento solo (una vez). No garantiza nada, pero ayuda. */
function askPersistence() {
  if (persistAsked) return
  persistAsked = true
  try { void navigator.storage?.persist?.() } catch { /* sin soporte */ }
}

export async function saveImage(p: {
  userId: string; day: string; moment: string; description: string; questionIds: string[]; image: Blob
}): Promise<boolean> {
  try {
    askPersistence()
    const blob = await shrinkImage(p.image)
    const row: ArchivedImage = {
      key: keyOf(p.userId, p.day, p.moment),
      userId: p.userId,
      day: p.day,
      moment: p.moment.toUpperCase(),
      description: p.description,
      questionIds: p.questionIds,
      blob,
      updatedAt: Date.now(),
    }
    await run('readwrite', s => s.put(row))
    return true
  } catch {
    return false
  }
}

/** Todas las imágenes del usuario, las más recientes primero. */
export async function listImages(userId: string): Promise<ArchivedImage[]> {
  try {
    const rows = await run<ArchivedImage[]>('readonly', s => s.index('userId').getAll(userId))
    return rows.sort((a, b) => b.day.localeCompare(a.day) || b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

export async function deleteImage(userId: string, day: string, moment: string): Promise<void> {
  try { await run('readwrite', s => s.delete(keyOf(userId, day, moment))) } catch { /* nada que borrar */ }
}
