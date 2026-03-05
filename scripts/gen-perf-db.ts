import { DatabaseSync } from 'node:sqlite';
import { unlinkSync, existsSync } from 'node:fs';

const dbPath = 'perf-test.db';
if (existsSync(dbPath)) {
  unlinkSync(dbPath);
}

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const stmt = db.prepare('INSERT INTO items (name, description, category) VALUES (?, ?, ?)');

console.log('Generating 100 rows of test data...');
for (let i = 1; i <= 100; i++) {
  stmt.run(`Item ${i}`, `Description for item ${i} with some extra text to make it longer and more dense in the grid view.`.repeat(2), `Category ${i % 10}`);
}

db.close();
console.log('Done.');
