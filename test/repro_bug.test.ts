import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { unlinkSync, existsSync } from 'node:fs';
import { SQLiteAdapter } from '../src/adapter/sqlite.ts';
import { Navigator } from '../src/ui/navigator.ts';

const REPRO_DB = './repro-bug.db';

describe('Navigator Bug Reproduction', () => {
  let adapter: SQLiteAdapter;
  let navigator: Navigator;

  before(() => {
    const db = new DatabaseSync(REPRO_DB);
    db.exec(`
      CREATE TABLE items (
        id INTEGER PRIMARY KEY,
        name TEXT
      );
    `);

    const insert = db.prepare('INSERT INTO items (name) VALUES (?)');
    for (let i = 1; i <= 100; i++) {
      insert.run(`Item ${i}`);
    }
    db.close();

    adapter = new SQLiteAdapter();
    adapter.connect(REPRO_DB);
    navigator = new Navigator(adapter);
  });

  after(() => {
    adapter.close();
    if (existsSync(REPRO_DB)) {
      unlinkSync(REPRO_DB);
    }
  });

  it('should enter the correct row when scrolled down', () => {
    navigator.init();
    // Enter table detail for 'items'
    navigator.enter();

    let state = navigator.getState() as any;
    assert.strictEqual(state.type, 'table-detail');
    assert.strictEqual(state.dataCursor, 0);
    assert.strictEqual(state.dataOffset, 0);

    // Move down 30 times.
    // Default visibleRows is 20, so this should push dataOffset to 11 (if cursor hits bottom at 19)
    // Actually, moveDown increments cursor until 19, then increments dataOffset.
    // 0 -> 19 (20 steps), then 10 more steps increments dataOffset to 10.
    // dataCursor = 19, dataOffset = 11? No, 0 to 19 is 19 steps.
    // 30 steps total: 19 steps to get cursor to 19. 11 steps to increment dataOffset.
    // dataOffset = 11, dataCursor = 19.
    for (let i = 0; i < 30; i++) {
      navigator.moveDown();
    }

    state = navigator.getState() as any;
    const expectedRowIndex = state.dataOffset + state.dataCursor;
    const expectedName = `Item ${expectedRowIndex + 1}`;

    navigator.enter(); // Enter row detail
    const rowState = navigator.getState() as any;

    assert.strictEqual(rowState.type, 'row-detail');
    assert.strictEqual(rowState.rowIndex, expectedRowIndex, `Row index should be ${expectedRowIndex}`);
    assert.strictEqual(rowState.row.name, expectedName, `Row name should be ${expectedName}`);
  });
});
