import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, unlinkSync } from 'node:fs';
import { SQLiteAdapter } from '../src/adapter/sqlite.js';

const TEST_DB = './test/test.db';

/**
 * Set up test database
 */
function setupTestDB() {
  // Remove old test db if exists
  if (existsSync(TEST_DB)) {
    unlinkSync(TEST_DB);
  }

  // Create test database
  const db = new DatabaseSync(TEST_DB);
  
  // Create test tables
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      age INTEGER
    );
  `);

  db.exec(`
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      title TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert test data
  const insertUser = db.prepare('INSERT INTO users (name, email, age) VALUES (?, ?, ?)');
  insertUser.run('Alice', 'alice@example.com', 30);
  insertUser.run('Bob', 'bob@example.com', 25);
  insertUser.run('Charlie', 'charlie@example.com', 35);

  const insertPost = db.prepare('INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)');
  insertPost.run(1, 'Hello World', 'This is my first post');
  insertPost.run(1, 'Second Post', 'Another post by Alice');
  insertPost.run(2, 'Bobs Post', 'Post by Bob');

  db.close();
}

/**
 * Clean up test database
 */
function cleanupTestDB() {
  if (existsSync(TEST_DB)) {
    unlinkSync(TEST_DB);
  }
}

/**
 * Test suite for SQLiteAdapter
 */
describe('SQLiteAdapter', () => {
  before(() => {
    setupTestDB();
  });

  after(() => {
    cleanupTestDB();
  });

  it('should connect to database', () => {
    const adapter = new SQLiteAdapter();
    adapter.connect(TEST_DB);
    assert.ok(adapter.db !== null, 'Database should be connected');
    assert.strictEqual(adapter.path, TEST_DB, 'Path should be set correctly');
    adapter.close();
  });

  it('should throw error when connecting to invalid path', () => {
    const adapter = new SQLiteAdapter();
    // Try to connect to an invalid path (directory that doesn't exist)
    assert.throws(
      () => adapter.connect('/nonexistent/path/to/database.db'),
      /Failed to open database/,
      'Should throw error for invalid path'
    );
  });

  it('should get all tables', () => {
    const adapter = new SQLiteAdapter();
    adapter.connect(TEST_DB);
    
    const tables = adapter.getTables();
    assert.strictEqual(tables.length, 2, 'Should have 2 tables');
    assert.strictEqual(tables[0].name, 'posts', 'First table should be posts');
    assert.strictEqual(tables[1].name, 'users', 'Second table should be users');
    assert.ok(tables[0].row_count !== undefined, 'Should have row_count property');
    
    adapter.close();
  });

  it('should get table schema', () => {
    const adapter = new SQLiteAdapter();
    adapter.connect(TEST_DB);
    
    const schema = adapter.getTableSchema('users');
    assert.strictEqual(schema.length, 4, 'Users table should have 4 columns');
    assert.strictEqual(schema[0].name, 'id', 'First column should be id');
    assert.strictEqual(schema[0].type, 'INTEGER', 'ID should be INTEGER');
    assert.strictEqual(schema[0].pk, 1, 'ID should be primary key');
    assert.strictEqual(schema[1].name, 'name', 'Second column should be name');
    assert.strictEqual(schema[1].type, 'TEXT', 'Name should be TEXT');
    assert.strictEqual(schema[1].notnull, 1, 'Name should be NOT NULL');
    
    adapter.close();
  });

  it('should get table data', () => {
    const adapter = new SQLiteAdapter();
    adapter.connect(TEST_DB);
    
    const data = adapter.getTableData('users');
    assert.strictEqual(data.length, 3, 'Should have 3 users');
    assert.strictEqual(data[0].name, 'Alice', 'First user should be Alice');
    assert.strictEqual(data[0].email, 'alice@example.com', 'Alice email should match');
    assert.strictEqual(data[0].age, 30, 'Alice age should be 30');
    
    adapter.close();
  });

  it('should get table data with pagination', () => {
    const adapter = new SQLiteAdapter();
    adapter.connect(TEST_DB);
    
    // Get 2 rows starting from offset 1
    const data = adapter.getTableData('users', { limit: 2, offset: 1 });
    assert.strictEqual(data.length, 2, 'Should return 2 users');
    assert.strictEqual(data[0].name, 'Bob', 'First result should be Bob');
    assert.strictEqual(data[1].name, 'Charlie', 'Second result should be Charlie');
    
    adapter.close();
  });

  it('should get table data with custom limit', () => {
    const adapter = new SQLiteAdapter();
    adapter.connect(TEST_DB);
    
    const data = adapter.getTableData('users', { limit: 1 });
    assert.strictEqual(data.length, 1, 'Should return 1 user');
    assert.strictEqual(data[0].name, 'Alice', 'Should return Alice');
    
    adapter.close();
  });

  it('should get row count', () => {
    const adapter = new SQLiteAdapter();
    adapter.connect(TEST_DB);
    
    const userCount = adapter.getRowCount('users');
    assert.strictEqual(userCount, 3, 'Should have 3 users');
    
    const postCount = adapter.getRowCount('posts');
    assert.strictEqual(postCount, 3, 'Should have 3 posts');
    
    adapter.close();
  });

  it('should close database connection', () => {
    const adapter = new SQLiteAdapter();
    adapter.connect(TEST_DB);
    assert.ok(adapter.db !== null, 'Database should be connected');
    
    adapter.close();
    assert.strictEqual(adapter.db, null, 'Database should be null after close');
  });

  it('should handle closing when not connected', () => {
    const adapter = new SQLiteAdapter();
    assert.doesNotThrow(() => adapter.close(), 'Should not throw when closing unconnected adapter');
  });
});
