// Katalog dist/esm zawiera moduły ES, ale paczka nie ma "type":"module"
// (API wymaga CommonJS). Lokalny package.json przełącza tylko ten podkatalog.
const fs = require('fs');
const path = require('path');
const target = path.join(__dirname, '..', 'dist', 'esm', 'package.json');
fs.writeFileSync(target, JSON.stringify({ type: 'module' }, null, 2) + '\n');
