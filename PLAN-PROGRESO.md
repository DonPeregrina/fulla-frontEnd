# Plan: pantalla de Progreso (agnóstica al dominio)

Estado: borrador para decidir. Nada de esto está implementado. Los números salen de lecturas de solo lectura a Supabase hechas el 2026-11-07.

## 1. Qué nos da hoy el sistema (medido, no supuesto)

Datos en Supabase (proyecto compartido con AgnoRag):

| Tabla | Hoy | Lectura |
|---|---|---|
| `fact_log_entries` | 1 690 entradas, 2023-11-19 → 2026-11-06, **1 solo usuario** | 1 190 elementizadas (70 %) |
| `fact_log_entry_items` | 1 342 ítems | 355 (26 %) sin cantidad; 524 (39 %) sin unidad |
| `dim_item_catalog` | 896 ítems, **todos `domain=health`**, **0 con `properties`** | Nombres canónicos buenos, sin nutrición |
| `fact_daily_summary` | 202 filas (solo `weight`, `weight_delta`) | Ayer: 0 filas |
| `dim_metric_definitions` | **2 filas** (`weight` agg `last`, `weight_delta` agg `delta`) | Es el embrión del contrato de indicadores |

Calidad de la elementización (ayer, 06-nov, 16 entradas, 6 elementizadas, 24 ítems):
- Bien: nombres canónicos y singulares (`huevo`, `fresa`, `pan de centeno`), cantidad con unidad casera (`0.25 taza`, `2 cucharada`, `3 unidad`), fragmento original, confianza, versión del elementizador.
- Límite 1, **no hay gramos**: las unidades son caseras (`taza`, `cucharada`, `pieza`, `vaso`, `unidad`; solo 38 ítems en `gramo`). Para calorías hace falta convertir unidad → gramos.
- Límite 2, **cantidad faltante** en ~1 de cada 4 ítems (`sirlón`, `queso`, `salsa`, `lechuga`…). Hay que asumir una porción y marcarla como asumida.
- Límite 3, **platillo + componentes juntos**: "Taco campechano" aparece como ítem y también `sirlón`, `carne de trompo`, `queso`, `aguacate`. Si se suman todos se cuenta doble.
- Límite 4, **solo se elementiza comida**: respuestas de escala o síntomas ("2", "nivel 1", "5 horas", "Dolor 0") no se elementizan. Por eso las gráficas de agruras o dolor no salen de ahí.
- Duplicados dentro de una misma respuesta (`lechuga` dos veces): se consolidan al agregar.

Conclusión: el nivel de agregación al que llegamos hoy es **frecuencia y presencia de ítems por día** (qué comí, cuántas veces, con qué cantidad casera). Para calorías, grasa y proteína falta una capa nueva; para escalas falta extraer el valor numérico.

Lo que **ya existe y no hay que rehacer**: ETL Mongo→Supabase, `elementize_event`, catálogo canónico, `fact_daily_summary` + `dim_metric_definitions` (motor de métricas diarias con agregación y retraso de respuesta), autenticación por API key ligada a un usuario, API de AgnoRag desplegada.

## 2. Decisión de diseño

Reutilizar `dim_metric_definitions` + `fact_daily_summary` como contrato de indicadores en vez de inventar otro. Se le agregan fuentes y metas. El LLM solo estima nutrientes **una vez por ítem nuevo del catálogo**; las sumas son código determinista. El front solo pinta lo que el contrato diga.

Contrato que devuelve la API (lo único que el front necesita conocer):

```json
{
  "date": "2026-11-06",
  "timezone": "America/Mexico_City",
  "indicators": [
    {
      "key": "kcal", "label": "Calorías", "unit": "kcal", "domain": "health",
      "value": 1840, "estimated": true, "coverage": 0.78,
      "target": { "type": "max", "value": 2200 },
      "status": "ok",
      "display": "bar",
      "series": [{ "date": "2026-11-05", "value": 2010 }]
    }
  ]
}
```

- `source`: `nutrient` (kcal, proteína, grasa…), `numeric_answer` (peso), `scale` (agruras 0-5), `count_items`, `boolean`.
- `aggregation`: `sum | avg | last | delta | count`.
- `target.type`: `max | min | range | none`. `status`: `ok | warn | over | under | no_data`.
- `coverage`: fracción de ítems del día con cantidad real. Si es baja, el front muestra "estimado".

## 3. Reparto de trabajo

| Paquete | Repo | Quién | Depende de |
|---|---|---|---|
| A. Capa de nutrientes y metas | AgnoRag | Agente 1 | nada |
| B. Endpoint de progreso + modo servicio | AgnoRag | Agente 1 | A |
| C. Sincronización incremental | AgnoRag + backend | Agente 1 / yo | nada |
| D. Pasarela `/progress` | HabiOS/backend | Yo | contrato (sección 2) |
| E. Pantalla de Progreso | fulla | Yo | contrato; datos reales cuando B esté |
| F. Escalas y síntomas | AgnoRag | Agente 1 (después) | B |
| G. Puntos y recompensas | todos | Después, opcional | B |

Las dos mitades pueden avanzar en paralelo si ambos respetan el contrato: yo empiezo D y E con datos de ejemplo y se conecta al terminar B.

## 4. Paquetes (para el agente de AgnoRag)

### A. Capa de nutrientes y metas (migraciones SQL en Supabase)
1. `dim_item_nutrients(item_catalog_id PK/FK, basis_grams default 100, kcal, protein_g, fat_g, carbs_g, fiber_g, sugar_g, sodium_mg, source text, confidence numeric, estimated bool default true, reviewed bool default false, updated_at)`.
2. `dim_unit_grams(unit text, item_catalog_id nullable, grams numeric, note)`: filas genéricas (`taza`, `cucharada`, `vaso`, `pieza`, `rebanada`, `unidad`…) y excepciones por ítem (`huevo unidad = 50 g`). Resolución: la regla específica gana a la genérica.
3. `dim_item_defaults(item_catalog_id, default_qty, default_unit)` o la misma lógica en `dim_unit_grams` para cuando no hay cantidad. Todo cálculo con porción asumida se marca `assumed=true`.
4. `dim_item_composition` o una regla en el elementizador: si un platillo tiene componentes en la misma respuesta, sumar **solo componentes** y dejar el platillo como etiqueta. Definir y documentar la regla elegida.
5. `dim_goals(id, user_id, metric_name, direction max|min|range, target_min, target_max, period day|week, active, updated_by, updated_at)`.
6. Ampliar `dim_metric_definitions`: columnas `source_kind`, `nutrient_key`, `display_hint`, `label`. Agregar `aggregation_type = sum | avg | count`.
7. Script de relleno único: recorrer los 896 ítems, pedir al LLM los nutrientes por 100 g, guardar con `estimated=true`, `source='llm'`. Reporte de los ítems de baja confianza para revisión humana. **No** repetir la llamada para ítems ya llenos.
8. Pruebas: ítem conocido (huevo, 100 g ≈ 143 kcal), conversión de `taza`, ítem sin cantidad, platillo con componentes.

### B. Endpoint de progreso y modo servicio
1. `GET /progress/daily?date=YYYY-MM-DD&tz=` y `GET /progress/range?from=&to=`: agrega `fact_log_entry_items` × `dim_item_nutrients` × `dim_unit_grams` por día, junta con `dim_goals` y devuelve el contrato de la sección 2. Calcula en el momento o lee `fact_daily_summary` si ya está.
2. Autenticación: reusar la API key ligada a usuario (`sk-…`). Para que el backend Node actúe por varios usuarios: aceptar una **llave de servicio** más `X-Mnestics-User: <id de DeltaHabits>` y resolver `dim_users` por ese id. Rechazar el header con llaves normales.
3. Escritura de metas: `PUT /goals/{metric}` (usuario o host dueño). Validar rangos.
4. Rate limit y respuesta 404 clara si el usuario no está ligado a `dim_users`.
5. Documentar en `README`/brief y agregar un script de prueba en `scripts/`.

### C. Sincronización incremental
Hoy `/system/sync` es manual, así que el progreso se queda viejo. **Decisión: pipeline disparado por evento**, con una tarea programada solo como red de seguridad.

1. Al guardar una respuesta, el backend Node llama (sin esperar, con reintentos) a `POST /pipeline/ingest` de AgnoRag con `{answerId, userId, groupId, questionId, text, entryDate}`.
2. AgnoRag decide por `groupId` si hay un pipeline asignado (`dim_pipeline_assignments`). Si no hay, no hace nada. Si hay: inserta/actualiza **solo esa entrada** en `fact_log_entries` (idempotente por `source_answer_id`), la elementiza, enriquece los ítems nuevos y recalcula `fact_daily_summary` de ese día. Sin tocar el resto de la base.
3. Editar o borrar una respuesta vuelve a ejecutar el paso 2 (reemplaza los ítems de esa entrada).
4. Tarea nocturna de conciliación: busca respuestas en Mongo sin entrada en Supabase y las procesa. Es el respaldo si el aviso falló.
5. El front muestra "procesando…" mientras la entrada no esté elementizada. Meta de frescura: 15 minutos como máximo, normalmente segundos.

### H. Pipelines enchufables (diseño ahora, interfaz después)
El objetivo es que nutrición sea solo el primer pipeline. Un pipeline = **extractor** (qué se saca del texto) + **enriquecedor** (qué se agrega a cada elemento) + **indicadores** (qué se mide con eso).
- Registro en AgnoRag: `GET /pipelines` devuelve `[{key, label, domain, enricher, indicators[]}]`. Hoy una entrada: `nutrition`. Mañana: `emotions`, con su API de emociones ya registrada.
- Interfaz de enriquecedor: `enrich(item) -> properties` (JSON validado por esquema). Cada indicador apunta a una ruta de propiedad (`nutrients.kcal`) y una agregación; así el endpoint de progreso no sabe nada de nutrición.
- Asignación por hilo en Supabase (`dim_pipeline_assignments(group_id, pipeline_key, params, active)`), **no en Prisma**, para no tocar la base de producción de DeltaHabits.
- UI futura: pestaña "Análisis" por hilo del host con un dropdown alimentado por `GET /pipelines` (mismo patrón que la pestaña Imágenes). No se construye todavía; sí se deja la tabla y el endpoint.

### I. Calidad de calorías y macros (reutilizar `foodgeonCrawler`)
Ya existe un prototipo en `RaspBerryProjects/mnestics-companion/foodgeonCrawler/analyses/catalogo/`: `enrich_proposal.py` (LLM propone propiedades por ítem), `audit_usda.py` (compara contra USDA SR Legacy), `unidades.py` (gramos por ítem) y 399 propuestas ya generadas. **Partir de ahí.**
- Medido por ese audit: en ingredientes genéricos, 24 de 28 caen dentro de ±25 % de USDA (86 %). Fallan `tortilla de maíz`, `crema`, `frijoles`, `leche de almendras`.
- Los 6 "controles" (platillos y empacados: `taco`, `quesadilla`, `cheetos`, `twix`…) no tienen referencia en USDA SR Legacy, así que no se pudieron validar.
- Falta: el esquema v1.0 solo trae kcal por 100 g. Hay que subir a v2 con `protein_g`, `fat_g`, `carbs_g` por 100 g (rango + confianza).
- No consultar USDA en vivo para cada ítem: la búsqueda del primer resultado se equivoca (probado: "queso" devolvió queso crema untable y "tocino" devolvió grasa de tocino, 898 kcal). Usar USDA offline como calibración/semilla con el `search_term_en` ya curado, y guardar `source = usda | llm | manual`.
- Platillos mexicanos sin referencia (`taco campechano`): el enriquecedor los **descompone en receta** (componentes con gramos típicos) y suma componentes. Si el usuario ya listó componentes en la misma respuesta, esos mandan y de la receta solo se agrega lo que falte (la tortilla de harina en el ejemplo). Sin descomposición confiable, se guarda estimación con confianza baja y entra a una cola de revisión del host.
- Cola de revisión en el panel del host: ítems con confianza < 0.7, sin fuente USDA o con cantidad asumida; el host corrige y queda `source=manual`, `reviewed=true`.
- Referencias a evaluar para México (no verificadas todavía): tablas del SMAE (Sistema Mexicano de Alimentos Equivalentes) para platillos y porciones, y Open Food Facts para productos empacados.

### F. Escalas y síntomas (después)
Extender el elementizador con dominio `scale`: extrae el valor ("nivel 2 o 3" → 2.5, "Dolor 0" → 0) con la pregunta como contexto, `confidence`, y alimenta `dim_metric_definitions` con `source_kind=scale`. Es lo que permite graficar agruras, garganta, rodilla.

## 5. Paquetes (para mí: backend y front)

### D. Pasarela en HabiOS/backend
- `GET /progress?date=&days=` autenticado con el JWT del usuario. Resuelve el id de DeltaHabits y llama a AgnoRag con la llave de servicio (variable de entorno, nunca en el front).
- Cache corto (60 s) y errores amistosos si AgnoRag no responde (el front muestra "sin conexión" en vez de romper).
- Host: ver el progreso de un usuario de su hilo, editar metas (proxy a B.3), respetando que el host solo vea lo suyo.

### E. Front
- Pestaña **Progreso** como primera del usuario (`/user/progreso`), ruta de inicio.
- Tarjetas por indicador generadas del contrato: barra, anillo o línea según `display`; chip "estimado" cuando `estimated` o `coverage` baja; estado vacío cuando no hay datos.
- Selector de día/semana, usando `answersByDay`/`answersByWeek` del backend para el detalle.
- Datos de ejemplo mientras B no esté, y una prueba de que el renderer pinta un indicador de tipo desconocido sin romperse.

## 6. Decisiones y preguntas

Decididas por el dueño (2026-11-07):
- **Metas:** las edita el host. El usuario solo ve sus resultados. (`PUT /goals` solo para host dueño del hilo.)
- **Precisión de calorías:** mientras más certera mejor, con etiqueta de "estimado" y cola de revisión (ver I).
- **Frescura:** 15 minutos máximo; se resuelve con pipeline por evento (ver C).
- **Pipelines agnósticos:** diseñar para enchufar otros enriquecedores (emociones, etc.) por hilo; la UI de dropdown viene después (ver H).

Preguntas originales (las que siguen abiertas son 2, 5 y 6):
1. **Metas**: ¿las edita el host por usuario, el propio usuario, o ambos? (Afecta B.3 y la pasarela.)
2. **Primeros indicadores**: propuesta kcal, proteína, grasa, agua y peso. ¿Alguno más para empezar?
3. **Frescura**: ¿basta con sincronizar cada 15 min o debe reflejar lo dicho hace un segundo?
4. **Calorías aproximadas**: ¿aceptan que sean estimadas con etiqueta, sabiendo que los gramos caseros ("una taza", "un puñado") tienen error?
5. **Más usuarios**: Supabase solo tiene datos de uno. ¿Los demás se migran con el ETL actual o hay que ligarlos primero?
6. **Puntos y recompensas** (mishabitOS): ¿entran en esta pantalla o se dejan para después?

## 7. Riesgos
- Las llaves `sk-…` y de servicio son equivalentes a acceso total a los datos del usuario: nunca en el front, rotarlas si se compartieron.
- Cambios de esquema en Supabase afectan a AgnoRag y a mishabitOS (mismo proyecto): migraciones aditivas, sin borrar columnas.
- Backend Node despliega a producción al hacer merge: los cambios de D van con PR y prueba local previa.

## 8. Mock up y Mu (agregado 2026-11-07)

Mock: `scripts/New Tab/mnestics_metricas_evita_campechanas.html` (pantalla de Progreso en móvil).

### Qué muestra y de dónde sale cada pieza
| Pieza del mock | Fuente | Notas |
|---|---|---|
| Imagen de Mu rechazando el alimento + 2 miniaturas (#2, #3) + frase "Evita las donas, 5 veces en 7 días" | Bloque `focus` del endpoint | Cálculo determinista, ver abajo. El LLM solo redacta la frase |
| Tope de calorías, "620 disponibles", "llevas 1 380" y barra de 20 segmentos | Indicador `kcal` (meta máxima) | `remaining = target - value` |
| Proteína, carbos, grasas con chips BIEN / CERCA | Indicadores de nutrientes | Estados `ok`, `near`, `over` |
| Vegetales con chip FALTA | Indicador por **grupo de alimento** (`food_group = verdura`) | No es un nutriente: se suma por grupo, no por kcal. Ya existe `food_group` en el esquema v1 |
| "Sugerencia: te faltan vegetales… cena ligera…" | Bloque `suggestion` | Depende de la hora del día y de lo que falta; se genera al terminar el pipeline, no en cada visita (corrige el diagrama de lectura) |
| Botón principal | **"Hablar con Mu"** (en el mock dice "Corregir con voz": cambiar) | Ver sección Mu |
| "Archivo" | Pantalla Diario existente | Sin trabajo nuevo |

### Cambios al contrato (sección 2)
- `display: "segments"` con `segments: 10` o `20`; el front llena según `value / target`.
- Estados: `ok | near | over | under | no_data` (el front los traduce a BIEN / CERCA / SOBRA / FALTA). `near` = entre el 85 % y el 100 % de una meta máxima (umbral editable por el host).
- Tipos de meta por indicador: kcal `max`, carbos `max`, grasas `range`, proteína `min`, vegetales `min`.
- Indicadores por grupo de alimento (`source: "food_group"`), además de nutrientes.
- Bloques nuevos en la respuesta:
```json
"focus": { "nutrient": "carbs", "window_days": 7,
  "top": [ { "item": "dona", "count": 5, "contribution_g": 180, "image_key": "dona" } ],
  "headline": "5 veces en 7 días · tus carbos van cerca" },
"suggestion": { "text": "…", "generated_at": "…", "meal_slot": "night" },
"pending": 0
```
- Regla de `focus` (código, no LLM): elegir el indicador con peor estado (`over`, luego `near`); sumar los últimos 7 días por ítem canónico; devolver los 3 que más aportan a ese nutriente. El LLM redacta `headline` y `suggestion` en una sola llamada con salida estructurada, al terminar el pipeline.

### Mu: persona, imagen y conversación
**Mu no necesita una ruta ni un servicio aparte para la pantalla.** El análisis es una consulta determinista (regla de `focus`); Mu es el nombre y el tono del texto que se genera.

**Imagen (fase 1, ahora):** ilustraciones estáticas: Mu dibujado una vez y un set chico de íconos de alimentos (dona, refresco, malteada, taco…), con un ícono genérico si no hay uno. El mock ya trae Mu y la dona dibujados en SVG. **Fase 2 (después):** imagen generada por alimento ("Mu rechazando {alimento}") con el generador de imágenes que ya existe, guardada una sola vez por ítem del catálogo y reutilizada, así no se genera una imagen por visita. Falta decidir dónde guardarlas: hoy las imágenes del asistente se archivan en el celular, no en servidor.

**"Hablar con Mu" (agente conversacional):**
- Reusar el asistente de voz que ya existe (motores de voz, sesión, autenticación y burbujas del chat) con otro prompt y otras herramientas. Hoy sus herramientas son de captura (`preguntas_pendientes`, `preguntar`, `guardar_respuesta`, `finalizar`); Mu usa herramientas **de solo lectura**:
  - `progreso_dia(fecha)`, `progreso_rango(desde, hasta)` (vía `/progress`),
  - `top_alimentos(nutriente, dias)`, `detalle_comida(fecha)`,
  - `metas()`.
- Contexto inicial: indicadores de hoy + resumen de 7 días + resumen de 30 días ya agregados. Así la mayoría de las preguntas se responden sin llamar herramientas; las demás hacen drill-down.
- Reglas del personaje: solo habla de los datos del usuario, no inventa cifras que no estén en las herramientas, aclara que las calorías son estimadas y no da consejo médico.
- **Decidido: Mu no usa el retrieval de AgnoRag** (embeddings). Trae comida que no corresponde. Mu es solo **descriptivo**, a una semana: explica las métricas de forma fácil de entender y ayuda a recordar ("ah, es cierto, he traído reflujo con esto").
- **Contexto completo en el prompt, sin búsqueda.** Medido con datos reales (2026-11-07): 7 días = 74 respuestas ≈ 2 200 tokens; 30 días = 154 respuestas ≈ 4 700 tokens. Entra de sobra.
- **Qué se le pasa a Mu** (todo, no solo lo que alimenta las métricas, para que pueda notar relaciones no previstas: fin de semana, con quién estuvo, agruras tras cierto alimento):
  1. Las respuestas crudas de los últimos 7 días en formato compacto `fecha | pregunta | respuesta`, con la hora de captura.
  2. Los indicadores ya calculados (totales, metas, estados, `focus`). Mu **no hace aritmética**; cita lo calculado.
  3. Contexto de calendario calculado por código: día de la semana, fin de semana, festivos.
  4. El resumen de 30 días solo bajo demanda (herramienta), no en cada conversación.
- **Reglas contra inventar patrones:** cada afirmación cita el día o la respuesta de donde sale; si hay menos de 3 ocurrencias dice "coincidió" y no "causa"; si no hay datos suficientes lo dice. Con una semana de datos casi nada es estadísticamente firme: Mu describe coincidencias verificables, no conclusiones.
- **Privacidad:** las respuestas crudas incluyen texto íntimo. Enviarlas todas al proveedor del LLM exige que el usuario lo acepte (aviso en la primera conversación) y no loguear el prompt completo.
- **No se guardan las conversaciones con Mu.**

### Conflicto resuelto
El mock mostraba "2,000 kcal · editar". **Solo el host edita las metas**: para el usuario el tope es texto, sin "editar". También se cambia el botón "Corregir con voz" por "Hablar con Mu".

### Ajustes al contrato descubiertos al construir la pantalla (2026-11-07)
Tipos reales en `src/types/progress.ts`. Respecto a la sección 8:
- `Indicator.display`: `'budget'` (calorías, 20 bloques) o `'segments'` (10 segmentos).
- `Indicator.sources: string[]`: alimentos que más aportan. Al tocar una fila el mock muestra "// DE DÓNDE VIENE: …"; el endpoint debe devolverlo por indicador.
- `Indicator.estimated`: el front muestra "· EST." junto a lo llevado del día.
- `focus.top[]` lleva `item` (clave de la ilustración), `label` en plural ("donas"), `article` ("las" / "los") y `count`; así el front no conjuga nada.
- Estados `ok | near | over | under | no_data` ya implementados en el front (BIEN, CERCA, PASADO, FALTA, SIN DATOS).
- Mientras no exista el endpoint, `src/services/progress.ts` devuelve datos de ejemplo marcados con `sample: true` (la pantalla muestra "DATOS DE EJEMPLO"). Reemplazar por `GET /progress` en el paquete D.

## Imágenes de la pantalla (decisión del 2026-11-08, reemplaza la "fase 2" de un banco por alimento)
- Mu es el nombre del agente, NO un personaje. No hay personaje que dibujar ni mantener igual entre imágenes.
- La imagen es simple: manos en señal de alto (rechazo) a la izquierda y el alimento a la derecha cuando conviene evitarlo (`focus.status` = over/near); pulgar arriba u OK con el alimento que va bien (por ejemplo proteína) cuando `focus.status` = ok. El platillo completo queda para más adelante.
- No se arma un banco de imágenes por adelantado: la escena se genera bajo demanda (es rápido y barato).
- Se guarda solo el resultado ya generado (Azure Storage), clave = estilo (alto/ok) + alimento canónico, y se reutiliza mientras el alimento principal no cambie. Motivo: evitar la espera de unos segundos en cada visita y no pagar dos veces por la misma imagen.
- Mientras tanto la pantalla usa las 3 ilustraciones estáticas actuales (dona, refresco, campechana, hechas con el círculo del mockup) y un plato genérico para el resto; se sustituirán por las manos.
- Pendiente de decidir: proveedor de imágenes, quién dispara la generación (Node al cambiar el `focus`) y qué pasa si falla (cae al plato genérico).

## Ramas
Una rama por repositorio (backend y front) para todo lo de Progreso; no se crean ramas por paso.

## "Sigue así" y "evita" (decisión del 2026-11-10, reemplaza al héroe con manos/personaje)
- Se quitan las manos y el personaje. Dos tarjetas: izquierda "SIGUE ASÍ" (✓ debajo de la imagen) y derecha "EVITA" (🚫 debajo). El ✓ y el 🚫 los dibuja la app encima; la imagen es solo del alimento.
- Empieza solo con calorías y con el alimento canónico (queso, pan, carne de trompo), no con el platillo.
- Reglas (las calcula AgnoRag en `GET /progress/focus`, con parámetros que fija Node en `src/infrastructure/progress/focus.config.ts`, sobrescribibles con la variable `FOCUS_PARAMS`):
  - keep: días dentro de 90–110 % de la meta de kcal; los alimentos que aparecen en más de esos días; top 2; mínimo 2 días.
  - avoid: días con más de 120 % de la meta; los alimentos que más kcal aportaron; top 2; mínimo 2 días.
  - La respuesta trae `meta` (días que cumplieron cada criterio, parámetros usados) para saber por qué una lista sale vacía.
- Imagen de cada alimento: `GET /progress/food-image/:item` (Gemini, estilo calcomanía, una vez por alimento; caché en Azure Storage `food-images`, en memoria si no hay almacenamiento). Pendiente de AgnoRag: la ruta `/progress/focus`.
- Siguiente paso posible: guardar estos parámetros por hilo en `params` de la asignación de pipelines para que el host los ajuste.
