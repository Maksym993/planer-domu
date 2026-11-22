// Pobiera opcjonalny model Ferrari 458 Italia z przykładów three.js do public/willa/auta/ferrari.glb.
// Repozytorium go nie zawiera, bo nie udało się potwierdzić licencji modelu (szczegóły w LICENCJE.md).
// Bez tego pliku willa pokazuje tylko auto koncepcyjne w garażu.
//
// Użycie: npm run ferrari

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const URL = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/ferrari.glb'
const cel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'willa', 'auta', 'ferrari.glb')

const r = await fetch(URL)
if (!r.ok) { console.error(`Nie udało się pobrać modelu: ${r.status}`); process.exit(1) }
fs.mkdirSync(path.dirname(cel), { recursive: true })
fs.writeFileSync(cel, Buffer.from(await r.arrayBuffer()))
console.log(`Zapisano ${path.relative(process.cwd(), cel)} (${(fs.statSync(cel).size / 1e6).toFixed(1)} MB). Odśwież willę.`)
