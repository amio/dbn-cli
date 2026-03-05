import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { unlinkSync, existsSync } from 'node:fs';
import { SQLiteAdapter } from '../adapter/sqlite.ts';
import { Navigator } from './navigator.ts';

const SYNC_DB = './sync-test.db';

describe('Navigator Synchronization', () => {
  let adapter: SQLiteAdapter;
  let navigator: Navigator;

  before(() => {
    const db = new DatabaseSync(SYNC_DB);
    db.exec(`
      CREATE TABLE items (
        id INTEGER PRIMARY KEY,
        name TEXT
      );
    `);

    const insert = db.prepare('INSERT INTO items (name) VALUES (?)');
    for (let i = 1; i <= 50; i++) {
      insert.run(`Item ${i}`);
    }
    db.close();

    adapter = new SQLiteAdapter();
    adapter.connect(SYNC_DB);
    navigator = new Navigator(adapter);
  });

  after(() => {
    adapter.close();
    if (existsSync(SYNC_DB)) {
      unlinkSync(SYNC_DB);
    }
  });

  it('should sync table-detail cursor when navigating in row-detail', () => {
    navigator.init();
    navigator.enter(); // Enter 'items' table

    // Start at row 0
    let state = navigator.getState() as any;
    assert.strictEqual(state.type, 'table-detail');
    assert.strictEqual(state.dataCursor, 0);
    assert.strictEqual(state.dataOffset, 0);

    navigator.enter(); // Enter row-detail for Row 0
    let rowState = navigator.getState() as any;
    assert.strictEqual(rowState.type, 'row-detail');
    assert.strictEqual(rowState.rowIndex, 0);

    // Move to next record (Row 1)
    navigator.nextRecord();
    rowState = navigator.getState() as any;
    assert.strictEqual(rowState.rowIndex, 1);
    assert.strictEqual(rowState.row.name, 'Item 2');

    // Go back to table-detail
    navigator.back();
    state = navigator.getState() as any;
    assert.strictEqual(state.type, 'table-detail');

    // VERIFY SYNC: The table detail should now be at row 1
    // (This is expected to FAIL before the fix)
    assert.strictEqual(state.dataCursor + state.dataOffset, 1, 'Table detail cursor should be synced to Row 1');
  });

  it('should sync table-detail cursor when deleting in row-detail', () => {
    navigator.init();
    navigator.enter(); // Enter 'items' table

    // Move to row 5
    for (let i = 0; i < 5; i++) navigator.moveDown();

    navigator.enter(); // Enter row-detail for Row 5 (Item 6)
    navigator.requestDelete();
    navigator.confirmDelete(); // 1st confirm
    navigator.confirmDelete(); // 2nd confirm (actually performs delete and goes back)

    const state = navigator.getState() as any;
    assert.strictEqual(state.type, 'table-detail');

    // After deleting row 5, the cursor should still be at 5 (pointing to what was Row 6)
    // or adjusted if it was the last row.
    assert.strictEqual(state.dataCursor + state.dataOffset, 5, 'Table detail cursor should be at index 5 after deletion');

    // Verify it's now 'Item 7' (since Item 6 was deleted)
    const selectedRow = (navigator as any).getSelectedRow(state);
    assert.strictEqual(selectedRow.name, 'Item 7');
  });
});
