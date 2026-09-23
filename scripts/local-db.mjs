import EmbeddedPostgres from 'embedded-postgres';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const pg = new EmbeddedPostgres({
  databaseDir: path.join(root, 'data', 'pg'),
  user: 'postgres',
  password: 'postgres',
  port: 5432,
  persistent: true,
});

await pg.initialise();
await pg.start();

try {
  await pg.createDatabase('lomasricodb');
} catch {
  // ya existe
}

console.log('PostgreSQL local listo en localhost:5432  (db: lomasricodb)');
console.log('Deja esta ventana abierta. Ctrl+C para detener.');
