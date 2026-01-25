#!/usr/bin/env -S node --experimental-strip-types

/**
 * Create a test database with Unicode content (CJK and emoji)
 * To test proper width calculation in the TUI
 */

import { DatabaseSync } from 'node:sqlite';
import { unlink } from 'node:fs';

const dbPath = 'unicode-test.db';

// Remove existing database
try {
  unlink(dbPath, () => {});
} catch (e) {
  // Ignore if file doesn't exist
}

console.log('Creating test database with Unicode content...');

const db = new DatabaseSync(dbPath);

// Create a test table with mixed content
db.exec(`
  CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    username TEXT,
    content TEXT,
    emoji TEXT,
    status TEXT
  )
`);

// Insert test data with CJK characters and emoji
const insert = db.prepare(`
  INSERT INTO messages (username, content, emoji, status)
  VALUES (?, ?, ?, ?)
`);

const testData: [string, string, string, string][] = [
  ['Alice', 'Hello! 👋 How can I help you today?', '👋', 'active'],
  ['张三', '你好，很高兴认识你', '😊', 'active'],
  ['Bob', 'Why don\'t scientists trust atoms? Because they make up everything! 😄', '😄', 'active'],
  ['李明', '汽车轮毂锻造和铸造的区别', '🚗', 'pending'],
  ['Carol', '3d 打印和铸造相比呢', '🎨', 'completed'],
  ['王芳', '四大和五常 13小时前 来自 OPPO Find X8s', '📱', 'active'],
  ['山田太郎', '現在銀行还办理存折吗', '🏦', 'pending'],
  ['김철수', 'handshake 域名应该如何使用', '🔗', 'active'],
  ['🤖 Bot', 'Beep boop! I am a robot 🤖', '🤖', 'active'],
  ['Marie', 'Test 测试 テスト 🧪', '🧪', 'testing'],
];

for (const [username, content, emoji, status] of testData) {
  insert.run(username, content, emoji, status);
}

// Create another table for schema testing
db.exec(`
  CREATE TABLE 用户信息 (
    用户ID INTEGER PRIMARY KEY,
    姓名 TEXT NOT NULL,
    年龄 INTEGER,
    邮箱 TEXT UNIQUE,
    创建时间 TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  INSERT INTO 用户信息 (姓名, 年龄, 邮箱)
  VALUES 
    ('张三', 25, 'zhangsan@example.com'),
    ('李四', 30, 'lisi@example.com'),
    ('王五 👨‍💼', 28, 'wangwu@example.com')
`);

db.close();

console.log(`✅ Database created: ${dbPath}`);
console.log('Test it with: npm run dev unicode-test.db');
