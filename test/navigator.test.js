import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { unlinkSync, existsSync } from 'node:fs';
import { SQLiteAdapter } from '../src/adapter/sqlite.js';
import { Navigator } from '../src/ui/navigator.js';

const TEST_DB = './test-navigator.db';

describe('Navigator', () => {
  let adapter;
  let navigator;

  before(() => {
    // Create test database
    const db = new DatabaseSync(TEST_DB);
    
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE
      );
      
      CREATE TABLE posts (
        id INTEGER PRIMARY KEY,
        user_id INTEGER,
        title TEXT,
        content TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
    
    // Insert test data
    const insertUser = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
    insertUser.run('Alice', 'alice@example.com');
    insertUser.run('Bob', 'bob@example.com');
    insertUser.run('Charlie', 'charlie@example.com');
    
    const insertPost = db.prepare('INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)');
    insertPost.run(1, 'Post 1', 'Content 1');
    insertPost.run(1, 'Post 2', 'Content 2');
    insertPost.run(2, 'Post 3', 'Content 3');
    
    db.close();
    
    // Create adapter and navigator
    adapter = new SQLiteAdapter();
    adapter.connect(TEST_DB);
    navigator = new Navigator(adapter);
  });

  after(() => {
    adapter.close();
    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB);
    }
  });

  describe('initialization', () => {
    it('should initialize with tables view', () => {
      navigator.init();
      const state = navigator.getState();
      
      assert.strictEqual(state.type, 'tables');
      assert.ok(Array.isArray(state.tables));
      assert.strictEqual(state.cursor, 0);
      assert.strictEqual(state.scrollOffset, 0);
    });

    it('should load all tables', () => {
      const state = navigator.getState();
      assert.ok(state.tables.length >= 2);
      
      const tableNames = state.tables.map(t => t.name);
      assert.ok(tableNames.includes('users'));
      assert.ok(tableNames.includes('posts'));
    });
  });

  describe('navigation in tables view', () => {
    it('should move cursor down', () => {
      navigator.init();
      const initialCursor = navigator.getState().cursor;
      
      navigator.moveDown();
      const newCursor = navigator.getState().cursor;
      
      assert.strictEqual(newCursor, initialCursor + 1);
    });

    it('should move cursor up', () => {
      navigator.moveDown();
      const initialCursor = navigator.getState().cursor;
      
      navigator.moveUp();
      const newCursor = navigator.getState().cursor;
      
      assert.strictEqual(newCursor, initialCursor - 1);
    });

    it('should not move cursor below 0', () => {
      navigator.jumpToTop();
      navigator.moveUp();
      
      assert.strictEqual(navigator.getState().cursor, 0);
    });

    it('should not move cursor beyond table count', () => {
      const state = navigator.getState();
      const maxCursor = state.tables.length - 1;
      
      navigator.jumpToBottom();
      navigator.moveDown();
      
      assert.strictEqual(navigator.getState().cursor, maxCursor);
    });

    it('should jump to top', () => {
      navigator.moveDown();
      navigator.moveDown();
      navigator.jumpToTop();
      
      assert.strictEqual(navigator.getState().cursor, 0);
    });

    it('should jump to bottom', () => {
      navigator.jumpToTop();
      navigator.jumpToBottom();
      
      const state = navigator.getState();
      assert.strictEqual(state.cursor, state.tables.length - 1);
    });
  });

  describe('entering table detail', () => {
    it('should enter table detail view', () => {
      navigator.init();
      navigator.enter();
      
      const state = navigator.getState();
      assert.strictEqual(state.type, 'table-detail');
      assert.ok(state.tableName);
      assert.ok(Array.isArray(state.schema));
      assert.ok(Array.isArray(state.data));
      assert.strictEqual(typeof state.totalRows, 'number');
      assert.strictEqual(state.dataOffset, 0);
      assert.strictEqual(state.dataCursor, 0);
    });

    it('should load table schema', () => {
      const state = navigator.getState();
      assert.ok(state.schema.length > 0);
      
      const schema = state.schema;
      assert.ok(schema[0].name);
      assert.ok(schema[0].type);
    });

    it('should load table data', () => {
      const state = navigator.getState();
      assert.ok(state.data.length > 0);
      assert.ok(state.totalRows > 0);
    });
  });

  describe('schema view toggle', () => {
    it('should view schema from table detail', () => {
      navigator.init();
      navigator.enter();
      navigator.viewSchema();
      
      const state = navigator.getState();
      assert.strictEqual(state.type, 'schema-view');
      assert.ok(state.tableName);
      assert.ok(Array.isArray(state.schema));
      assert.strictEqual(state.cursor, 0);
      assert.strictEqual(state.scrollOffset, 0);
    });

    it('should navigate in schema view', () => {
      const state = navigator.getState();
      assert.strictEqual(state.cursor, 0);
      
      navigator.moveDown();
      assert.strictEqual(navigator.getState().cursor, 1);
      
      navigator.moveUp();
      assert.strictEqual(navigator.getState().cursor, 0);
    });

    it('should jump to top/bottom in schema view', () => {
      navigator.moveDown();
      navigator.jumpToTop();
      assert.strictEqual(navigator.getState().cursor, 0);
      
      navigator.jumpToBottom();
      const state = navigator.getState();
      assert.strictEqual(state.cursor, state.schema.length - 1);
    });

    it('should not move cursor beyond schema bounds', () => {
      navigator.jumpToTop();
      navigator.moveUp();
      assert.strictEqual(navigator.getState().cursor, 0);
      
      navigator.jumpToBottom();
      const maxCursor = navigator.getState().schema.length - 1;
      navigator.moveDown();
      assert.strictEqual(navigator.getState().cursor, maxCursor);
    });

    it('should go back to table detail', () => {
      navigator.back();
      
      const state = navigator.getState();
      assert.strictEqual(state.type, 'table-detail');
    });

    it('should preserve table detail state when toggling', () => {
      const state = navigator.getState();
      const tableName = state.tableName;
      const dataOffset = state.dataOffset;
      const dataCursor = state.dataCursor;
      
      navigator.viewSchema();
      navigator.back();
      
      const newState = navigator.getState();
      assert.strictEqual(newState.type, 'table-detail');
      assert.strictEqual(newState.tableName, tableName);
      assert.strictEqual(newState.dataOffset, dataOffset);
      assert.strictEqual(newState.dataCursor, dataCursor);
    });
  });

  describe('row detail view', () => {
    it('should enter row detail from table detail', () => {
      navigator.init();
      navigator.enter();
      navigator.enter();
      
      const state = navigator.getState();
      assert.strictEqual(state.type, 'row-detail');
      assert.ok(state.tableName);
      assert.ok(state.row);
      assert.strictEqual(typeof state.rowIndex, 'number');
      assert.ok(Array.isArray(state.schema));
    });

    it('should go back to table detail', () => {
      navigator.back();
      
      const state = navigator.getState();
      assert.strictEqual(state.type, 'table-detail');
    });
  });

  describe('back navigation', () => {
    it('should maintain state stack', () => {
      navigator.init();
      assert.strictEqual(navigator.states.length, 1);
      
      navigator.enter();
      assert.strictEqual(navigator.states.length, 2);
      
      navigator.viewSchema();
      assert.strictEqual(navigator.states.length, 3);
      
      navigator.back();
      assert.strictEqual(navigator.states.length, 2);
      
      navigator.back();
      assert.strictEqual(navigator.states.length, 1);
    });

    it('should not go back beyond root', () => {
      navigator.init();
      navigator.back();
      
      assert.strictEqual(navigator.states.length, 1);
      assert.strictEqual(navigator.getState().type, 'tables');
    });
  });

  describe('data reload', () => {
    it('should reload table data in table detail', () => {
      navigator.init();
      navigator.enter();
      
      const state = navigator.getState();
      const initialData = [...state.data];
      
      navigator.reload();
      
      const newData = navigator.getState().data;
      assert.deepStrictEqual(newData, initialData);
    });

    it('should reload data after offset change', () => {
      const state = navigator.getState();
      state.dataOffset = 1;
      
      navigator.reload();
      
      // Data should be reloaded from new offset
      assert.ok(navigator.getState().data);
    });
  });
});
