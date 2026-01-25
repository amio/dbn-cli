import { DatabaseSync } from 'node:sqlite';
import { unlinkSync, existsSync, mkdirSync } from 'node:fs';

// Ensure test asset path and delete existing database file if it exists
const exampleDbPath = 'test/assets/example.db';
try {
  mkdirSync('test/assets', { recursive: true });
} catch (e) {
  // ignore
}

if (existsSync(exampleDbPath)) {
  unlinkSync(exampleDbPath);
}

const db = new DatabaseSync(exampleDbPath);

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    age INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create posts table
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    content TEXT,
    views INTEGER DEFAULT 0,
    published BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Create comments table
db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id)
  );
`);

// Insert sample users
const insertUser = db.prepare('INSERT INTO users (name, email, age) VALUES (?, ?, ?)');
const users: [string, string, number][] = [
  ['Alice Johnson', 'alice@example.com', 28],
  ['Bob Smith', 'bob@example.com', 34],
  ['Charlie Brown', 'charlie@example.com', 42],
  ['Diana Prince', 'diana@example.com', 31],
  ['Eve Anderson', 'eve@example.com', 26],
  ['Frank Miller', 'frank@example.com', 39],
  ['Grace Lee', 'grace@example.com', 29],
  ['Henry Wilson', 'henry@example.com', 45],
];

for (const user of users) {
  insertUser.run(...user);
}

// Insert sample posts
const insertPost = db.prepare('INSERT INTO posts (user_id, title, content, views, published) VALUES (?, ?, ?, ?, ?)');
const posts: [number, string, string, number, number][] = [
  [1, 'Getting Started with SQLite', 'SQLite is a great embedded database...', 1234, 1],
  [1, 'Advanced SQL Queries', 'Learn how to write complex SQL queries...', 856, 1],
  [2, 'Web Development Tips', 'Here are some tips for web developers...', 2341, 1],
  [2, 'Introduction to Node.ts', 'Node.js is a JavaScript runtime...', 3456, 1],
  [3, 'Database Design Patterns', 'Good database design is crucial...', 789, 1],
  [3, 'Performance Optimization', 'Tips for optimizing database performance...', 1567, 1],
  [4, 'Security Best Practices', 'Keep your applications secure...', 4321, 1],
  [5, 'Modern JavaScript', 'ES6+ features you should know...', 2890, 1],
  [6, 'Docker Tutorial', 'Containerize your applications...', 1456, 1],
  [7, 'Git Workflows', 'Effective git branching strategies...', 987, 1],
  [8, 'Testing Strategies', 'How to write better tests...', 654, 0],
];

for (const post of posts) {
  insertPost.run(...post);
}

// Insert sample comments
const insertComment = db.prepare('INSERT INTO comments (post_id, author_name, content) VALUES (?, ?, ?)');
const comments: [number, string, string][] = [
  [1, 'John Doe', 'Great article! Very helpful.'],
  [1, 'Jane Smith', 'Thanks for sharing this.'],
  [2, 'Mike Johnson', 'I learned a lot from this post.'],
  [3, 'Sarah Williams', 'Excellent tips!'],
  [3, 'Tom Brown', 'This is exactly what I needed.'],
  [4, 'Lisa Davis', 'Clear and concise explanation.'],
  [5, 'David Miller', 'Very informative, thanks!'],
  [6, 'Emma Wilson', 'These optimization tips really work.'],
  [7, 'Alex Taylor', 'Security is so important.'],
  [8, 'Chris Anderson', 'Love the modern JS features.'],
];

for (const comment of comments) {
  insertComment.run(...comment);
}

db.close();

console.log(`✓ Example database created: ${exampleDbPath}`);
console.log('  - 8 users');
console.log('  - 11 posts');
console.log('  - 10 comments');
console.log('');
console.log('Run: node --experimental-strip-types bin/dbn.ts example.db');
