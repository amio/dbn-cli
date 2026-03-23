import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';

const exampleDbPath = 'test/assets/example.db';
const sidecarPaths = [`${exampleDbPath}-shm`, `${exampleDbPath}-wal`];

type UserSeed = {
  name: string;
  email: string;
  age: number;
  createdAt: string;
};

type PostSeed = {
  userEmail: string;
  title: string;
  content: string;
  views: number;
  published: 0 | 1;
  createdAt: string;
};

type CommentSeed = {
  postTitle: string;
  authorName: string;
  content: string;
  createdAt: string;
};

mkdirSync('test/assets', { recursive: true });

for (const filePath of [exampleDbPath, ...sidecarPaths]) {
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

const db = new DatabaseSync(exampleDbPath);
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    age INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE posts (
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

db.exec(`
  CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id)
  );
`);

const users: UserSeed[] = [
  { name: 'Maya Patel', email: 'maya.patel@northwind.app', age: 29, createdAt: '2025-07-03 09:14:00' },
  { name: 'Ethan Carter', email: 'ethan.carter@northwind.app', age: 35, createdAt: '2025-07-11 10:42:00' },
  { name: 'Olivia Chen', email: 'olivia.chen@northwind.app', age: 31, createdAt: '2025-07-18 08:35:00' },
  { name: 'Noah Thompson', email: 'noah.thompson@northwind.app', age: 38, createdAt: '2025-08-01 11:05:00' },
  { name: 'Ava Rodriguez', email: 'ava.rodriguez@northwind.app', age: 27, createdAt: '2025-08-08 13:22:00' },
  { name: 'Liam Foster', email: 'liam.foster@northwind.app', age: 41, createdAt: '2025-08-16 16:18:00' },
  { name: 'Sophia Bennett', email: 'sophia.bennett@northwind.app', age: 33, createdAt: '2025-08-24 09:48:00' },
  { name: 'Jackson Reed', email: 'jackson.reed@northwind.app', age: 36, createdAt: '2025-09-02 14:10:00' },
  { name: 'Isabella Nguyen', email: 'isabella.nguyen@northwind.app', age: 30, createdAt: '2025-09-09 12:26:00' },
  { name: 'Lucas Brooks', email: 'lucas.brooks@northwind.app', age: 44, createdAt: '2025-09-15 17:02:00' },
  { name: 'Amelia Rivera', email: 'amelia.rivera@northwind.app', age: 28, createdAt: '2025-09-22 10:11:00' },
  { name: 'Benjamin Hall', email: 'benjamin.hall@northwind.app', age: 39, createdAt: '2025-09-30 15:32:00' },
  { name: 'Harper Murphy', email: 'harper.murphy@northwind.app', age: 32, createdAt: '2025-10-08 09:21:00' },
  { name: 'Elijah Wright', email: 'elijah.wright@northwind.app', age: 37, createdAt: '2025-10-16 08:59:00' },
  { name: 'Charlotte Adams', email: 'charlotte.adams@northwind.app', age: 34, createdAt: '2025-10-28 11:47:00' },
  { name: 'James Turner', email: 'james.turner@northwind.app', age: 40, createdAt: '2025-11-05 16:40:00' },
  { name: 'Mia Phillips', email: 'mia.phillips@northwind.app', age: 26, createdAt: '2025-11-14 13:08:00' },
  { name: 'Henry Cooper', email: 'henry.cooper@northwind.app', age: 43, createdAt: '2025-11-26 18:14:00' },
];

const teamByEmail = new Map<string, string>([
  ['maya.patel@northwind.app', 'data insights'],
  ['ethan.carter@northwind.app', 'platform engineering'],
  ['olivia.chen@northwind.app', 'revenue strategy'],
  ['noah.thompson@northwind.app', 'data platform'],
  ['ava.rodriguez@northwind.app', 'product marketing'],
  ['liam.foster@northwind.app', 'infrastructure'],
  ['sophia.bennett@northwind.app', 'product design'],
  ['jackson.reed@northwind.app', 'developer experience'],
  ['isabella.nguyen@northwind.app', 'customer success operations'],
  ['lucas.brooks@northwind.app', 'security engineering'],
  ['amelia.rivera@northwind.app', 'customer education'],
  ['benjamin.hall@northwind.app', 'finance operations'],
  ['harper.murphy@northwind.app', 'product operations'],
  ['elijah.wright@northwind.app', 'quality engineering'],
  ['charlotte.adams@northwind.app', 'go-to-market operations'],
  ['james.turner@northwind.app', 'reliability engineering'],
  ['mia.phillips@northwind.app', 'account management'],
  ['henry.cooper@northwind.app', 'internal systems'],
]);

function inferPostDiscipline(title: string): string {
  const normalized = title.toLowerCase();

  if (
    normalized.includes('query') ||
    normalized.includes('sqlite') ||
    normalized.includes('index') ||
    normalized.includes('schema') ||
    normalized.includes('database')
  ) {
    return 'data infrastructure';
  }

  if (
    normalized.includes('node') ||
    normalized.includes('dev setup') ||
    normalized.includes('container') ||
    normalized.includes('logging') ||
    normalized.includes('job') ||
    normalized.includes('test')
  ) {
    return 'engineering operations';
  }

  if (
    normalized.includes('revenue') ||
    normalized.includes('pricing') ||
    normalized.includes('forecast') ||
    normalized.includes('billing') ||
    normalized.includes('metrics')
  ) {
    return 'commercial operations';
  }

  if (
    normalized.includes('support') ||
    normalized.includes('release') ||
    normalized.includes('customer') ||
    normalized.includes('account') ||
    normalized.includes('workshop') ||
    normalized.includes('empty state')
  ) {
    return 'customer operations';
  }

  if (
    normalized.includes('security') ||
    normalized.includes('sso') ||
    normalized.includes('restore') ||
    normalized.includes('archive')
  ) {
    return 'platform resilience';
  }

  return 'cross-functional operations';
}

function buildPostContent(post: PostSeed): string {
  const team = teamByEmail.get(post.userEmail) ?? 'operations';
  const discipline = inferPostDiscipline(post.title);

  if (post.published === 0) {
    return [
      post.content,
      `The current draft still leaves room for review on scope, ownership, and rollout sequence. It explains which assumptions came from the ${team} team, which examples are still provisional, and where reviewers are expected to challenge the framing before the document turns into a stable recommendation for ${discipline}.`,
      'That extra context makes the record feel closer to an internal working note than a placeholder. Even unfinished posts now include enough narrative detail to be useful in demos, search results, and table browsing, because the reader can see not only the proposed direction but also the open questions that still need decisions.',
    ].join('\n\n');
  }

  return [
    post.content,
    `Most of the examples in the article come from the ${team} team, where the work had to fit around active projects, existing handoff routines, and weekly review meetings that already had very little slack. Instead of describing an idealized framework, the post usually spells out what changed first, what was intentionally left alone, and which tradeoffs were acceptable because the immediate goal was to make ${discipline} easier to run day to day.`,
    'A second layer of detail focuses on what happened after the change was introduced. The write-up calls out the signals the team watched, the edge cases that surfaced in real usage, and the follow-up adjustments that were needed once the process met actual operators, customers, or on-call pressure. That makes the content read more like a field report from a functioning company than a short product blurb.',
  ].join('\n\n');
}

const posts: PostSeed[] = [
  {
    userEmail: 'maya.patel@northwind.app',
    title: 'How We Cut Dashboard Query Time by 68 Percent',
    content:
      'We profiled the slowest dashboard widgets, moved three repeated subqueries into a materialized rollup table, and added covering indexes for the top customer filters. The result was a measurable drop in median page load time during weekday traffic without changing the API contract.',
    views: 8245,
    published: 1,
    createdAt: '2025-11-06 09:30:00',
  },
  {
    userEmail: 'maya.patel@northwind.app',
    title: 'Designing a Weekly Revenue Snapshot for Busy Teams',
    content:
      'A useful revenue digest should answer what changed, why it changed, and what needs follow-up in less than two minutes. This post walks through the sections we kept, the charts we removed, and the thresholds that now trigger annotations automatically.',
    views: 3712,
    published: 1,
    createdAt: '2025-12-03 08:45:00',
  },
  {
    userEmail: 'ethan.carter@northwind.app',
    title: 'A Practical Rollout Plan for Node 24 in Production',
    content:
      'We upgraded one background worker at a time, watched memory and startup regressions, then widened the rollout after a full billing cycle. The checklist in this write-up is intentionally operational: smoke tests, package audits, runtime flags, and fallback criteria.',
    views: 6521,
    published: 1,
    createdAt: '2025-10-22 10:05:00',
  },
  {
    userEmail: 'ethan.carter@northwind.app',
    title: 'What We Standardized in Local Dev Setup This Quarter',
    content:
      'Small setup inconsistencies kept turning into support time, so we standardized shell versions, seeded demo data, and added one command to bootstrap certificates, environment files, and local services. The biggest win was not speed alone, it was fewer invisible differences across laptops.',
    views: 2940,
    published: 1,
    createdAt: '2026-01-09 14:12:00',
  },
  {
    userEmail: 'ethan.carter@northwind.app',
    title: 'Draft: Moving Seed Data to Versioned Fixtures',
    content:
      'This draft compares generated demo data with checked-in fixture snapshots. The working direction is to keep realistic records but make the critical IDs and relationships stable enough for docs, screencasts, and support reproductions.',
    views: 118,
    published: 0,
    createdAt: '2026-02-18 11:08:00',
  },
  {
    userEmail: 'olivia.chen@northwind.app',
    title: 'Five Metrics We Review Before Every Pricing Change',
    content:
      'Feature adoption, conversion lag, downgrade rate, support ticket mix, and deal cycle length all matter more than raw signup volume when pricing shifts. Looking at those together kept us from overreacting to short-term noise in self-serve growth.',
    views: 7180,
    published: 1,
    createdAt: '2025-09-27 09:10:00',
  },
  {
    userEmail: 'olivia.chen@northwind.app',
    title: 'Interview Notes from 18 Customer Success Managers',
    content:
      'The strongest pattern in the interviews was not about features, it was about handoff quality. Teams trusted the product more when implementation owners, account managers, and operators all saw the same timeline and blockers in one place.',
    views: 4416,
    published: 1,
    createdAt: '2025-12-17 15:40:00',
  },
  {
    userEmail: 'noah.thompson@northwind.app',
    title: 'Index Hygiene for Multi-Tenant SQLite Datasets',
    content:
      'SQLite remains a solid fit for many desktop and embedded workflows, but tenant-heavy datasets need disciplined indexing. This example shows where composite indexes helped, where they hurt writes, and how we decided which filters deserved dedicated support.',
    views: 5598,
    published: 1,
    createdAt: '2025-11-13 13:25:00',
  },
  {
    userEmail: 'noah.thompson@northwind.app',
    title: 'Schema Review Checklist for Internal Tools',
    content:
      'When teams move quickly, schema drift shows up as duplicate status fields, inconsistent timestamps, and nullable columns no one really expects. Our review checklist keeps those issues visible before they make reporting or migrations harder than necessary.',
    views: 3387,
    published: 1,
    createdAt: '2026-01-28 10:52:00',
  },
  {
    userEmail: 'ava.rodriguez@northwind.app',
    title: 'How Product Marketing Uses Support Tags to Shape Launch Copy',
    content:
      'Support tags reveal friction earlier than campaign performance data does. We grouped the top misunderstanding themes from the previous release and rewrote launch copy so the first-use experience answered those questions before customers opened a ticket.',
    views: 2674,
    published: 1,
    createdAt: '2025-10-05 11:18:00',
  },
  {
    userEmail: 'ava.rodriguez@northwind.app',
    title: 'Release Notes That People Actually Read',
    content:
      'The format that works best for us is simple: one plain-language headline, a short explanation of who benefits, and a note about whether teams need to update any process. Removing filler nearly doubled click-through from the in-app changelog.',
    views: 4028,
    published: 1,
    createdAt: '2026-02-04 09:55:00',
  },
  {
    userEmail: 'liam.foster@northwind.app',
    title: 'Container Image Slimming Without Breaking Debuggability',
    content:
      'We reduced image size by removing unused package managers, build caches, and duplicate runtime assets, but we kept symbol maps and a predictable shell for incident response. A smaller image is only useful if you can still inspect it under pressure.',
    views: 6150,
    published: 1,
    createdAt: '2025-11-21 16:05:00',
  },
  {
    userEmail: 'liam.foster@northwind.app',
    title: 'Weekend Runbook for Background Job Backlogs',
    content:
      'This post documents the order we follow when retries begin to stack up on weekends: confirm queue health, isolate the slowest job family, pause secondary exports, and only then widen worker concurrency. The sequence matters because blind scaling usually masks the real bottleneck.',
    views: 2865,
    published: 1,
    createdAt: '2026-01-15 18:30:00',
  },
  {
    userEmail: 'sophia.bennett@northwind.app',
    title: 'Accessibility Fixes That Quietly Improved Activation',
    content:
      'We originally treated the accessibility pass as maintenance work, but clearer focus states, better table headings, and consistent button labels improved completion rates for every user segment we measured. The gains were modest individually and meaningful together.',
    views: 5310,
    published: 1,
    createdAt: '2025-12-11 10:20:00',
  },
  {
    userEmail: 'sophia.bennett@northwind.app',
    title: 'Why We Reworked Empty States in the Admin Console',
    content:
      'The old empty states explained what the screen was, but not what someone should do next. We replaced them with role-specific setup guidance, example values, and links to related settings so first-time admins could finish setup without leaving the flow.',
    views: 3499,
    published: 1,
    createdAt: '2026-02-10 14:44:00',
  },
  {
    userEmail: 'jackson.reed@northwind.app',
    title: 'Logging Changes We Made After a Noisy Incident',
    content:
      'During a December incident, we had plenty of logs and very little signal. We tightened event names, added request correlation to the busiest paths, and cut redundant debug lines so the next on-call person can reconstruct the timeline without filtering ten tabs of noise.',
    views: 4782,
    published: 1,
    createdAt: '2026-01-06 12:15:00',
  },
  {
    userEmail: 'jackson.reed@northwind.app',
    title: 'Draft: Service Ownership Map for Shared Jobs',
    content:
      'This draft outlines a clearer ownership model for scheduled jobs that currently span data, billing, and success operations. The unresolved section is escalation policy when a failure crosses more than one team during off-hours.',
    views: 76,
    published: 0,
    createdAt: '2026-03-01 09:40:00',
  },
  {
    userEmail: 'isabella.nguyen@northwind.app',
    title: 'Customer Health Scores: What We Kept and What We Removed',
    content:
      'Our first scoring model looked comprehensive but was too hard to explain. We trimmed it to usage consistency, unresolved blockers, training completion, and sponsor engagement so success managers could actually defend the score in customer reviews.',
    views: 3902,
    published: 1,
    createdAt: '2025-11-29 13:35:00',
  },
  {
    userEmail: 'isabella.nguyen@northwind.app',
    title: 'The Ops Review Meeting Agenda That Finally Stuck',
    content:
      'We tried long review decks and ad hoc note taking before settling on a strict 30-minute agenda. Now each section has a single owner, one metric trend, and an explicit follow-up, which made the meeting less performative and more useful.',
    views: 2148,
    published: 1,
    createdAt: '2026-02-21 11:22:00',
  },
  {
    userEmail: 'lucas.brooks@northwind.app',
    title: 'Quarterly Security Tasks We Automate Now',
    content:
      'Key rotation, dormant account review, dependency exception checks, and admin audit exports no longer depend on someone remembering a calendar reminder. The automation is intentionally boring, because predictable security maintenance is better than heroic cleanups.',
    views: 5874,
    published: 1,
    createdAt: '2025-10-31 08:50:00',
  },
  {
    userEmail: 'lucas.brooks@northwind.app',
    title: 'Lessons from Tightening SSO Provisioning Rules',
    content:
      'The project looked like a simple security improvement, but the hard part was aligning identity data from finance, HR, and customer tenants with very different lifecycle assumptions. The final rule set is stricter and also easier for admins to reason about.',
    views: 4462,
    published: 1,
    createdAt: '2026-01-19 10:38:00',
  },
  {
    userEmail: 'amelia.rivera@northwind.app',
    title: 'What We Learned from Watching 12 First-Time Admin Setups',
    content:
      'Most setup friction came from unclear prerequisites rather than missing features. By surfacing sample CSV files, better permission hints, and one progress checklist, we reduced the time to a successful first import for nearly every participant.',
    views: 5086,
    published: 1,
    createdAt: '2025-12-09 09:42:00',
  },
  {
    userEmail: 'amelia.rivera@northwind.app',
    title: 'Support Queue Patterns After the January Release',
    content:
      'Ticket volume did rise after launch, but the category mix improved in a healthy way: fewer account confusion issues, more advanced workflow questions, and shorter time to resolution for import errors. That usually means the base experience became easier to understand.',
    views: 3317,
    published: 1,
    createdAt: '2026-02-07 16:18:00',
  },
  {
    userEmail: 'benjamin.hall@northwind.app',
    title: 'Forecast Accuracy Improved When We Shortened the Horizon',
    content:
      'A 90-day forecast created false precision for our team, so we moved to a rolling 45-day view with explicit confidence bands. The shorter horizon made weekly adjustments less political and much more grounded in current pipeline evidence.',
    views: 3638,
    published: 1,
    createdAt: '2025-11-18 11:05:00',
  },
  {
    userEmail: 'benjamin.hall@northwind.app',
    title: 'What Finance Asked for in the New Billing Export',
    content:
      'The export project became manageable once we narrowed it to three finance needs: stable external IDs, net and gross amounts side by side, and clean adjustment reasons. The rest of the work was mostly naming and reconciliation discipline.',
    views: 2851,
    published: 1,
    createdAt: '2026-02-14 08:32:00',
  },
  {
    userEmail: 'harper.murphy@northwind.app',
    title: 'Building a Changelog Workflow Across Product and Support',
    content:
      'Publishing release notes used to be a scramble across chat threads. We now draft updates inside the release checklist, have support add migration notes before code freeze, and publish one customer-facing summary within an hour of deployment.',
    views: 2749,
    published: 1,
    createdAt: '2025-12-20 10:16:00',
  },
  {
    userEmail: 'harper.murphy@northwind.app',
    title: 'Draft: Internal Glossary for Metrics Definitions',
    content:
      'This draft proposes a shared glossary for pipeline, activation, expansion, and retention metrics. The open question is where the canonical definitions should live so analytics, product, and finance stop maintaining slightly different copies.',
    views: 93,
    published: 0,
    createdAt: '2026-03-10 15:27:00',
  },
  {
    userEmail: 'elijah.wright@northwind.app',
    title: 'Reducing Test Runtime by Pruning Duplicate Scenarios',
    content:
      'We mapped the slowest integration tests to the behaviors they actually protected and removed duplicate setup paths that covered no distinct risk. The suite is still broad, just less repetitive, and that gave us faster feedback without hiding failures.',
    views: 6017,
    published: 1,
    createdAt: '2026-01-12 09:58:00',
  },
  {
    userEmail: 'elijah.wright@northwind.app',
    title: 'How We Review Flaky Tests Without Normalizing Them',
    content:
      'A flaky test is easy to dismiss when the failure disappears on rerun. We now require a short failure note, environment details, and an owner for every flaky investigation so temporary instability does not quietly become part of the build contract.',
    views: 3184,
    published: 1,
    createdAt: '2026-02-26 13:14:00',
  },
  {
    userEmail: 'charlotte.adams@northwind.app',
    title: 'A Simple Review Template for Cross-Functional Launches',
    content:
      'Our launch reviews improved when the template forced teams to explain audience, timing, support readiness, and rollback expectations in plain language. The structure is simple enough to finish quickly and strict enough to expose missing decisions.',
    views: 2573,
    published: 1,
    createdAt: '2025-11-25 15:05:00',
  },
  {
    userEmail: 'charlotte.adams@northwind.app',
    title: 'How We Measure Follow-Through After Customer Workshops',
    content:
      'Workshop sessions used to end with good intent and scattered notes. We now track action completion within two weeks, count repeated blockers, and tag which recommendations lead to actual configuration changes so the sessions can improve over time.',
    views: 1988,
    published: 1,
    createdAt: '2026-02-12 12:48:00',
  },
  {
    userEmail: 'james.turner@northwind.app',
    title: 'The Database Restore Drill We Run Every Month',
    content:
      'Backups are not enough if restore steps are vague. Our monthly drill validates snapshot age, restore duration, integrity checks, and the handoff notes on who confirms application readiness after the database is back online.',
    views: 5429,
    published: 1,
    createdAt: '2025-12-27 17:22:00',
  },
  {
    userEmail: 'james.turner@northwind.app',
    title: 'When to Archive Historical Events Instead of Deleting Them',
    content:
      'Deleting old operational events keeps tables small, but archives preserve context for audits, support, and customer questions. We document retention rules per event type so cleanup work remains predictable and the main tables stay fast.',
    views: 3015,
    published: 1,
    createdAt: '2026-01-31 10:06:00',
  },
  {
    userEmail: 'mia.phillips@northwind.app',
    title: 'What New Account Owners Need in Their First 30 Days',
    content:
      'The most effective onboarding assets were a short account handoff brief, two examples of successful adoption plans, and a clear escalation map. New owners felt prepared faster when we stopped drowning them in generic process documentation.',
    views: 2327,
    published: 1,
    createdAt: '2025-12-14 09:12:00',
  },
  {
    userEmail: 'mia.phillips@northwind.app',
    title: 'Template: Weekly Customer Risk Summary',
    content:
      'This template distills risk reviews into three parts: what changed this week, what still blocks progress, and what decision the account team needs from leadership. It is intentionally short so it can be written well under time pressure.',
    views: 1762,
    published: 1,
    createdAt: '2026-02-24 08:55:00',
  },
  {
    userEmail: 'henry.cooper@northwind.app',
    title: 'What We Learned from Auditing 400 Legacy Automations',
    content:
      'The audit was less about deleting old jobs and more about classifying them. Once we grouped automations by business owner, trigger reliability, and downstream impact, cleanup decisions became obvious and safer to execute.',
    views: 4863,
    published: 1,
    createdAt: '2026-01-23 14:28:00',
  },
  {
    userEmail: 'henry.cooper@northwind.app',
    title: 'Keeping Internal Tools Useful After the Team Doubles',
    content:
      'Internal tools degrade when the original creators stay the only power users. We now review usage quarterly, retire workflows no one follows, and document the paths that new managers actually depend on for approvals and reporting.',
    views: 2644,
    published: 1,
    createdAt: '2026-03-05 11:31:00',
  },
];

const comments: CommentSeed[] = [
  { postTitle: 'How We Cut Dashboard Query Time by 68 Percent', authorName: 'Priya Shah', content: 'The before-and-after framing is useful. I would love to see the exact index definitions in a follow-up.', createdAt: '2025-11-06 11:02:00' },
  { postTitle: 'How We Cut Dashboard Query Time by 68 Percent', authorName: 'Daniel Kim', content: 'We ran into the same issue with repeated account filters. Moving the aggregation upstream made a bigger difference than expected.', createdAt: '2025-11-06 13:18:00' },
  { postTitle: 'How We Cut Dashboard Query Time by 68 Percent', authorName: 'Nora Hughes', content: 'Helpful reminder that cutting query time without touching the API can still deliver a visible UX win.', createdAt: '2025-11-07 09:45:00' },
  { postTitle: 'Designing a Weekly Revenue Snapshot for Busy Teams', authorName: 'Samir Rao', content: 'The note about thresholds triggering annotations automatically is the best part here.', createdAt: '2025-12-03 10:12:00' },
  { postTitle: 'Designing a Weekly Revenue Snapshot for Busy Teams', authorName: 'Emily Stone', content: 'We shortened our revenue digest recently and saw the same effect. More people actually read it.', createdAt: '2025-12-03 18:27:00' },
  { postTitle: 'A Practical Rollout Plan for Node 24 in Production', authorName: 'Victor Perez', content: 'Appreciate that this focuses on rollout discipline instead of only benchmark screenshots.', createdAt: '2025-10-22 12:41:00' },
  { postTitle: 'A Practical Rollout Plan for Node 24 in Production', authorName: 'Rachel Green', content: 'We skipped staged workers once and paid for it. This checklist would have saved us time.', createdAt: '2025-10-23 08:19:00' },
  { postTitle: 'What We Standardized in Local Dev Setup This Quarter', authorName: 'Cole Ramsey', content: 'The invisible differences across laptops line is painfully accurate.', createdAt: '2026-01-09 16:54:00' },
  { postTitle: 'Five Metrics We Review Before Every Pricing Change', authorName: 'Janet Ross', content: 'Strong list. Downgrade rate is the one metric we still underweight on our side.', createdAt: '2025-09-27 10:46:00' },
  { postTitle: 'Five Metrics We Review Before Every Pricing Change', authorName: 'Owen Bailey', content: 'Useful to see pricing discussed with support and sales impact in the same frame.', createdAt: '2025-09-27 14:05:00' },
  { postTitle: 'Interview Notes from 18 Customer Success Managers', authorName: 'Leah Foster', content: 'Handoff quality is the hidden multiplier. We saw nearly the same pattern in our interviews.', createdAt: '2025-12-17 17:11:00' },
  { postTitle: 'Index Hygiene for Multi-Tenant SQLite Datasets', authorName: 'Marcus Long', content: 'Nice balance between theory and tradeoffs. Composite indexes are easy to overuse.', createdAt: '2025-11-13 16:20:00' },
  { postTitle: 'Index Hygiene for Multi-Tenant SQLite Datasets', authorName: 'Kara James', content: 'Would be interested in how you monitor write amplification after these changes.', createdAt: '2025-11-14 09:04:00' },
  { postTitle: 'Schema Review Checklist for Internal Tools', authorName: 'Peter Lang', content: 'Nullable columns no one expects is a perfect summary of half our reporting pain.', createdAt: '2026-01-28 12:28:00' },
  { postTitle: 'How Product Marketing Uses Support Tags to Shape Launch Copy', authorName: 'Allison Reed', content: 'This is a solid example of support data doing more than post-launch cleanup.', createdAt: '2025-10-05 14:36:00' },
  { postTitle: 'Release Notes That People Actually Read', authorName: 'Jordan Bell', content: 'Plain-language headlines seem obvious, but very few teams do it consistently.', createdAt: '2026-02-04 11:07:00' },
  { postTitle: 'Release Notes That People Actually Read', authorName: 'Megan Price', content: 'The note about process changes is what makes release notes actionable for admins.', createdAt: '2026-02-04 19:22:00' },
  { postTitle: 'Container Image Slimming Without Breaking Debuggability', authorName: 'Trevor Scott', content: 'Glad you called out incident response. A tiny image is not worth much if it is impossible to inspect.', createdAt: '2025-11-21 18:49:00' },
  { postTitle: 'Weekend Runbook for Background Job Backlogs', authorName: 'Gina Flores', content: 'Pausing secondary exports before scaling saved us during year-end invoicing.', createdAt: '2026-01-15 20:11:00' },
  { postTitle: 'Accessibility Fixes That Quietly Improved Activation', authorName: 'Hannah Cook', content: 'This is the kind of post I want more teams to publish. Accessibility work is product work.', createdAt: '2025-12-11 13:58:00' },
  { postTitle: 'Accessibility Fixes That Quietly Improved Activation', authorName: 'Ivan Brooks', content: 'Better table headings are boring until you watch someone struggle without them.', createdAt: '2025-12-12 09:30:00' },
  { postTitle: 'Why We Reworked Empty States in the Admin Console', authorName: 'Lena Ward', content: 'Role-specific setup guidance is the key detail here. Generic empty states rarely help.', createdAt: '2026-02-10 16:01:00' },
  { postTitle: 'Logging Changes We Made After a Noisy Incident', authorName: 'Derek Young', content: 'Request correlation is the first thing I look for now after too many bad incident reviews.', createdAt: '2026-01-06 15:26:00' },
  { postTitle: 'Customer Health Scores: What We Kept and What We Removed', authorName: 'Brenda Ellis', content: 'Making the score explainable is usually more valuable than making it look sophisticated.', createdAt: '2025-11-29 15:47:00' },
  { postTitle: 'The Ops Review Meeting Agenda That Finally Stuck', authorName: 'Shawn West', content: 'One owner and one explicit follow-up per section sounds obvious, but it changes the tone of the meeting.', createdAt: '2026-02-21 13:14:00' },
  { postTitle: 'Quarterly Security Tasks We Automate Now', authorName: 'Paula Simmons', content: 'Predictable security maintenance really is underrated. Good post.', createdAt: '2025-10-31 11:33:00' },
  { postTitle: 'Quarterly Security Tasks We Automate Now', authorName: 'Neil Grant', content: 'We still review dormant accounts manually. This makes a good case for automation.', createdAt: '2025-10-31 17:48:00' },
  { postTitle: 'Lessons from Tightening SSO Provisioning Rules', authorName: 'Clara Diaz', content: 'The cross-system identity mismatch is where these projects always get messy.', createdAt: '2026-01-19 14:09:00' },
  { postTitle: 'What We Learned from Watching 12 First-Time Admin Setups', authorName: 'Fiona Murphy', content: 'Sample CSV files solved more onboarding confusion for us than another help center article ever did.', createdAt: '2025-12-09 11:26:00' },
  { postTitle: 'Support Queue Patterns After the January Release', authorName: 'Wesley Hart', content: 'That category shift is a useful way to judge release quality beyond ticket count alone.', createdAt: '2026-02-07 18:02:00' },
  { postTitle: 'Forecast Accuracy Improved When We Shortened the Horizon', authorName: 'Erin Sullivan', content: 'False precision is exactly the problem. Shorter windows make forecast conversations much healthier.', createdAt: '2025-11-18 13:32:00' },
  { postTitle: 'What Finance Asked for in the New Billing Export', authorName: 'Caleb Barnes', content: 'Stable external IDs sound small until reconciliation week arrives.', createdAt: '2026-02-14 10:55:00' },
  { postTitle: 'Building a Changelog Workflow Across Product and Support', authorName: 'Tina Marshall', content: 'Love the requirement to publish within an hour of deployment. That forces clarity.', createdAt: '2025-12-20 14:08:00' },
  { postTitle: 'Reducing Test Runtime by Pruning Duplicate Scenarios', authorName: 'Andy Cox', content: 'This mirrors what we found. Slow tests often protect the same behavior in slightly different wrappers.', createdAt: '2026-01-12 12:17:00' },
  { postTitle: 'Reducing Test Runtime by Pruning Duplicate Scenarios', authorName: 'Jill Turner', content: 'Did you keep a coverage matrix while pruning? That made reviews easier for us.', createdAt: '2026-01-13 09:01:00' },
  { postTitle: 'How We Review Flaky Tests Without Normalizing Them', authorName: 'Scott Fisher', content: 'Requiring an owner for every flaky investigation is a good discipline.', createdAt: '2026-02-26 15:09:00' },
  { postTitle: 'A Simple Review Template for Cross-Functional Launches', authorName: 'Molly Graham', content: 'Rollback expectations are the line item most launch templates skip.', createdAt: '2025-11-25 17:42:00' },
  { postTitle: 'How We Measure Follow-Through After Customer Workshops', authorName: 'Aaron Porter', content: 'Tracking recommendations that lead to real configuration changes is a smart metric.', createdAt: '2026-02-12 15:05:00' },
  { postTitle: 'The Database Restore Drill We Run Every Month', authorName: 'Naomi Bell', content: 'Restore duration plus application readiness is the right combo. Too many drills stop halfway.', createdAt: '2025-12-27 20:18:00' },
  { postTitle: 'When to Archive Historical Events Instead of Deleting Them', authorName: 'Gareth Cole', content: 'Retention rules per event type would have prevented several arguments on our team last year.', createdAt: '2026-01-31 13:47:00' },
  { postTitle: 'What New Account Owners Need in Their First 30 Days', authorName: 'Kelly Warren', content: 'A short handoff brief beats a giant process folder every time.', createdAt: '2025-12-14 12:34:00' },
  { postTitle: 'Template: Weekly Customer Risk Summary', authorName: 'Patrick Doyle', content: 'The leadership decision prompt is what keeps this from becoming another status document.', createdAt: '2026-02-24 10:41:00' },
  { postTitle: 'What We Learned from Auditing 400 Legacy Automations', authorName: 'Monica Hardy', content: 'Classifying by downstream impact is a strong lens for cleanup work.', createdAt: '2026-01-23 17:06:00' },
  { postTitle: 'Keeping Internal Tools Useful After the Team Doubles', authorName: 'Elliot Crane', content: 'Quarterly usage reviews are boring and extremely effective.', createdAt: '2026-03-05 14:53:00' },
  { postTitle: 'Keeping Internal Tools Useful After the Team Doubles', authorName: 'Sabrina Holt', content: 'Retiring workflows no one follows is harder than building new ones, but usually more valuable.', createdAt: '2026-03-05 18:11:00' },
  { postTitle: 'Draft: Moving Seed Data to Versioned Fixtures', authorName: 'Internal Note', content: 'Need to decide whether docs will reference stable primary keys or stable slugs before this ships.', createdAt: '2026-02-18 13:02:00' },
  { postTitle: 'Draft: Service Ownership Map for Shared Jobs', authorName: 'Internal Note', content: 'Escalation matrix still needs approval from data and finance leads.', createdAt: '2026-03-01 12:18:00' },
  { postTitle: 'Draft: Internal Glossary for Metrics Definitions', authorName: 'Internal Note', content: 'Definition source should likely live beside the analytics model docs, not in a slide deck.', createdAt: '2026-03-10 17:03:00' },
];

const insertUser = db.prepare(
  'INSERT INTO users (name, email, age, created_at) VALUES (?, ?, ?, ?)',
);
const insertPost = db.prepare(
  'INSERT INTO posts (user_id, title, content, views, published, created_at) VALUES (?, ?, ?, ?, ?, ?)',
);
const insertComment = db.prepare(
  'INSERT INTO comments (post_id, author_name, content, created_at) VALUES (?, ?, ?, ?)',
);

const userIdByEmail = new Map<string, number>();
for (const user of users) {
  const result = insertUser.run(user.name, user.email, user.age, user.createdAt);
  userIdByEmail.set(user.email, Number(result.lastInsertRowid));
}

const postIdByTitle = new Map<string, number>();
for (const post of posts) {
  const userId = userIdByEmail.get(post.userEmail);
  if (!userId) {
    throw new Error(`Missing user for post: ${post.title}`);
  }

  const content = buildPostContent(post);

  const result = insertPost.run(
    userId,
    post.title,
    content,
    post.views,
    post.published,
    post.createdAt,
  );
  postIdByTitle.set(post.title, Number(result.lastInsertRowid));
}

for (const comment of comments) {
  const postId = postIdByTitle.get(comment.postTitle);
  if (!postId) {
    throw new Error(`Missing post for comment: ${comment.postTitle}`);
  }

  insertComment.run(postId, comment.authorName, comment.content, comment.createdAt);
}

db.close();

console.log(`✓ Example database created: ${exampleDbPath}`);
console.log(`  - ${users.length} users`);
console.log(`  - ${posts.length} posts`);
console.log(`  - ${comments.length} comments`);
console.log('');
console.log('Run: node --experimental-strip-types bin/dbn.ts test/assets/example.db');
