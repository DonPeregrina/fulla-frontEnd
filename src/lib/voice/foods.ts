/**
 * Vocabulario de comidas y bebidas para el efecto en vivo de la tarjeta del asistente: al oír una palabra se
 * subraya, sale su etiqueta y aparece un sticker. Es solo visual: la imagen final la genera Gemini y lo que se
 * guarda es el texto que dijo el usuario. Lo que no esté aquí simplemente no se resalta.
 */
export interface FoodHit { key: string; label: string; emoji: string }

interface FoodEntry extends FoodHit { words: string[] }

const FOODS: FoodEntry[] = [
  { key: 'huevo', label: 'huevo', emoji: '🍳', words: ['huevo', 'huevos', 'omelette', 'omelet'] },
  { key: 'frijol', label: 'frijoles', emoji: '🫘', words: ['frijol', 'frijoles'] },
  { key: 'tortilla', label: 'tortilla', emoji: '🫓', words: ['tortilla', 'tortillas'] },
  { key: 'cafe', label: 'café', emoji: '☕', words: ['cafe', 'cafecito', 'capuchino', 'capuccino', 'latte', 'espresso'] },
  { key: 'leche', label: 'leche', emoji: '🥛', words: ['leche', 'licuado'] },
  { key: 'te', label: 'té', emoji: '🍵', words: ['te', 'infusion'] },
  { key: 'jugo', label: 'jugo', emoji: '🧃', words: ['jugo', 'jugos', 'zumo'] },
  { key: 'agua', label: 'agua', emoji: '💧', words: ['agua'] },
  { key: 'refresco', label: 'refresco', emoji: '🥤', words: ['refresco', 'soda', 'coca', 'cola'] },
  { key: 'cerveza', label: 'cerveza', emoji: '🍺', words: ['cerveza', 'chela', 'cervezas'] },
  { key: 'vino', label: 'vino', emoji: '🍷', words: ['vino'] },
  { key: 'pan', label: 'pan', emoji: '🍞', words: ['pan', 'bolillo', 'telera', 'tostada', 'tostadas', 'tostadita'] },
  { key: 'arroz', label: 'arroz', emoji: '🍚', words: ['arroz'] },
  { key: 'pasta', label: 'pasta', emoji: '🍝', words: ['pasta', 'espagueti', 'espaguetis', 'spaghetti', 'fideo', 'fideos'] },
  { key: 'pollo', label: 'pollo', emoji: '🍗', words: ['pollo'] },
  { key: 'carne', label: 'carne', emoji: '🥩', words: ['carne', 'res', 'bistec', 'filete', 'arrachera', 'asada'] },
  { key: 'cerdo', label: 'cerdo', emoji: '🥓', words: ['cerdo', 'tocino', 'chorizo', 'jamon', 'salchicha', 'salchichas'] },
  { key: 'pescado', label: 'pescado', emoji: '🐟', words: ['pescado', 'atun', 'salmon', 'camaron', 'camarones', 'mojarra'] },
  { key: 'taco', label: 'tacos', emoji: '🌮', words: ['taco', 'tacos', 'taquitos', 'burrito', 'burritos', 'quesadilla', 'quesadillas'] },
  { key: 'sopa', label: 'sopa', emoji: '🍲', words: ['sopa', 'caldo', 'pozole', 'consome', 'menudo', 'crema'] },
  { key: 'ensalada', label: 'ensalada', emoji: '🥗', words: ['ensalada', 'lechuga'] },
  { key: 'fruta', label: 'fruta', emoji: '🍓', words: ['fruta', 'frutas', 'fresa', 'fresas', 'papaya', 'melon', 'sandia', 'mango', 'uvas', 'pina'] },
  { key: 'manzana', label: 'manzana', emoji: '🍎', words: ['manzana', 'manzanas'] },
  { key: 'platano', label: 'plátano', emoji: '🍌', words: ['platano', 'platanos', 'banana'] },
  { key: 'naranja', label: 'naranja', emoji: '🍊', words: ['naranja', 'naranjas', 'mandarina', 'limon'] },
  { key: 'aguacate', label: 'aguacate', emoji: '🥑', words: ['aguacate', 'guacamole'] },
  { key: 'verdura', label: 'verdura', emoji: '🥦', words: ['verdura', 'verduras', 'brocoli', 'zanahoria', 'calabaza', 'nopales', 'nopal', 'espinaca'] },
  { key: 'tomate', label: 'tomate', emoji: '🍅', words: ['tomate', 'jitomate', 'salsa'] },
  { key: 'papa', label: 'papas', emoji: '🥔', words: ['papa', 'papas', 'camote'] },
  { key: 'queso', label: 'queso', emoji: '🧀', words: ['queso', 'quesos'] },
  { key: 'avena', label: 'avena', emoji: '🥣', words: ['avena', 'cereal', 'granola', 'yogur', 'yogurt'] },
  { key: 'pizza', label: 'pizza', emoji: '🍕', words: ['pizza'] },
  { key: 'hamburguesa', label: 'hamburguesa', emoji: '🍔', words: ['hamburguesa', 'hamburguesas', 'hotdog'] },
  { key: 'sandwich', label: 'sándwich', emoji: '🥪', words: ['sandwich', 'torta', 'tortas', 'emparedado'] },
  { key: 'tamal', label: 'tamal', emoji: '🫔', words: ['tamal', 'tamales'] },
  { key: 'dulce', label: 'postre', emoji: '🍰', words: ['pastel', 'postre', 'galleta', 'galletas', 'chocolate', 'helado', 'dulce', 'dulces', 'pay', 'flan'] },
  { key: 'nueces', label: 'nueces', emoji: '🥜', words: ['nuez', 'nueces', 'almendra', 'almendras', 'cacahuate', 'cacahuates'] },
]

const norm = (w: string) =>
  w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zñ0-9]/g, '')

const INDEX = new Map<string, FoodEntry>()
FOODS.forEach(f => f.words.forEach(w => INDEX.set(norm(w), f)))

/** Alimentos distintos mencionados en el texto, en el orden en que se dijeron. */
export function detectFoods(text: string): FoodHit[] {
  const seen = new Set<string>()
  const hits: FoodHit[] = []
  for (const token of text.split(/\s+/)) {
    const f = INDEX.get(norm(token))
    if (f && !seen.has(f.key)) {
      seen.add(f.key)
      hits.push({ key: f.key, label: f.label, emoji: f.emoji })
    }
  }
  return hits
}

/** Parte el texto en palabras marcando cuáles son alimentos (para subrayarlas). */
export function highlight(text: string): { word: string; food: boolean }[] {
  return text.split(/\s+/).filter(Boolean).map(word => ({ word, food: INDEX.has(norm(word)) }))
}
