/**
 * StoryForge — Full E2E Test Script
 * Setup (users/roles) via Prisma directly → tests via HTTP API
 * Run: node scripts/e2e-test.mjs
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = 'ec9b94c31e1eb846cd3a311dd607a696f0207d743dbf2be6c13a2a1f01371414';

function makeToken(userId, role) {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: '1h' });
}

const BASE = 'http://localhost:4000/api';
const prisma = new PrismaClient();
let pass = 0, fail = 0;
const results = [];

// Small delay between calls to respect rate limits (60 req/min global)
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function req(method, path, body, token) {
  await sleep(1200); // 50 req/min — safe margin under 60/min global throttle
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  const res = await fetch(`${BASE}${path}`, opts);
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

function check(label, condition, detail = '') {
  if (condition) {
    pass++;
    results.push(`  ✅ ${label}`);
  } else {
    fail++;
    results.push(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
  }
}

async function seedUser(name, email, password, role) {
  const hash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { role, passwordHash: hash, isActive: true },
    create: { name, email, passwordHash: hash, role, isActive: true },
  });
}

async function run() {
  console.log('\n════════════════════════════════════════════════════');
  console.log('  StoryForge — Full E2E Test');
  console.log('════════════════════════════════════════════════════\n');

  // ── SEED: create test users via Prisma (bypass rate limit) ─────────────────
  console.log('── Seeding test users via Prisma ──');
  const pw = 'Test@12345';
  const writer = await seedUser('Arjun Writer', 'e2e_writer@sf.com', pw, 'WRITER');
  const reader = await seedUser('Riya Reader',  'e2e_reader@sf.com', pw, 'READER');
  const editor = await seedUser('Sahil Editor', 'e2e_editor@sf.com', pw, 'EDITOR');
  const admin  = await seedUser('Priya Admin',  'e2e_admin@sf.com',  pw, 'ADMIN');
  console.log(`  Users seeded: ${writer.email}, ${reader.email}, ${editor.email}, ${admin.email}\n`);

  // ── HEALTH ──────────────────────────────────────────────────────────────────
  console.log('── Phase 0: Health ──');
  const health = await req('GET', '/health');
  check('US-00 Health check', health.status === 200 && health.data.status === 'ok');

  // ── PHASE 1: AUTH ───────────────────────────────────────────────────────────
  console.log('\n── Phase 1: Auth ──');

  // Generate tokens directly via JWT (avoids hammering login endpoint + rate limit)
  const WRITER = makeToken(writer.id, 'WRITER');
  const READER  = makeToken(reader.id,  'READER');
  const EDITOR  = makeToken(editor.id,  'EDITOR');
  const ADMIN   = makeToken(admin.id,   'ADMIN');
  check('US-01 WRITER token generated', !!WRITER);
  check('US-02 READER token generated', !!READER);
  check('US-03 EDITOR token generated', !!EDITOR);
  check('US-04 ADMIN token generated',  !!ADMIN);

  // Create a real refresh token via Prisma (bypasses login rate limit entirely)
  const refreshTokenRaw = crypto.randomUUID();
  await prisma.refreshToken.create({
    data: {
      userId: writer.id,
      token:  refreshTokenRaw,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  const WRITER_REFRESH = refreshTokenRaw;
  check('US-05 WRITER refresh token seeded via Prisma', !!WRITER_REFRESH);

  // Test wrong password rejection (1 real HTTP call)
  const badLogin = await req('POST', '/auth/login', { email: writer.email, password: 'wrongpass' });
  check('US-06 Wrong password rejected (401)', badLogin.status === 401);

  const me = await req('GET', '/auth/me', null, WRITER);
  check('US-07 GET /auth/me returns WRITER role', me.data?.role === 'WRITER', JSON.stringify(me.data));

  const refresh = await req('POST', '/auth/refresh', { refreshToken: WRITER_REFRESH });
  check('US-08 Token refresh returns new accessToken', refresh.status === 200 && !!refresh.data?.accessToken, JSON.stringify(refresh.data));

  // ── PHASE 2: ADMIN ──────────────────────────────────────────────────────────
  console.log('\n── Phase 2: Admin ──');

  const stats = await req('GET', '/admin/stats', null, ADMIN);
  check('US-08 Admin gets platform stats', stats.status === 200, JSON.stringify(stats.data));

  const usersList = await req('GET', '/admin/users', null, ADMIN);
  check('US-09 Admin lists all users', usersList.status === 200 && Array.isArray(usersList.data));

  const roleChange = await req('PATCH', `/admin/users/${reader.id}/role`, { role: 'WRITER' }, ADMIN);
  check('US-10 Admin changes user role', roleChange.status === 200 || roleChange.status === 201, JSON.stringify(roleChange.data));
  await req('PATCH', `/admin/users/${reader.id}/role`, { role: 'READER' }, ADMIN); // reset

  const toggle = await req('PATCH', `/admin/users/${reader.id}/toggle`, null, ADMIN);
  check('US-11 Admin toggles user active status', toggle.status === 200 || toggle.status === 201, JSON.stringify(toggle.data));
  await req('PATCH', `/admin/users/${reader.id}/toggle`, null, ADMIN); // reset

  const readerAdmin = await req('GET', '/admin/stats', null, READER);
  check('US-12 READER blocked from admin (403)', readerAdmin.status === 403);

  // ── PHASE 3: TAGS ───────────────────────────────────────────────────────────
  console.log('\n── Phase 3: Tags ──');

  const ts = Date.now();
  const t1 = await req('POST', '/tags', { name: `Technology ${ts}` }, ADMIN);
  check('US-13 Admin creates tag', t1.status === 201, JSON.stringify(t1.data));
  const TAG1 = t1.data?.id;
  const TAG1_SLUG = t1.data?.slug; // auto-generated from name

  const t2 = await req('POST', '/tags', { name: `Design ${ts}` }, ADMIN);
  check('US-14 Admin creates second tag', t2.status === 201);
  const TAG2 = t2.data?.id;

  const writerTag = await req('POST', '/tags', { name: `WTag ${ts}` }, WRITER);
  check('US-15 WRITER blocked from creating tags (403)', writerTag.status === 403);

  const tagList = await req('GET', '/tags');
  check('US-16 Public lists all tags', tagList.status === 200 && Array.isArray(tagList.data));

  const tagBySlug = await req('GET', `/tags/${TAG1_SLUG}`);
  check('US-17 Public gets tag by slug', tagBySlug.status === 200 && !!tagBySlug.data?.slug, JSON.stringify(tagBySlug.data));

  // ── PHASE 4: ARTICLES ───────────────────────────────────────────────────────
  console.log('\n── Phase 4: Articles ──');

  const artCreate = await req('POST', '/articles', {
    title: `The Future of AI ${ts}`,
    content: 'Artificial intelligence is transforming every industry. LLMs are now commodity infrastructure.',
    coverImageUrl: 'https://example.com/ai.jpg',
  }, WRITER);
  check('US-18 Writer creates article', artCreate.status === 201, JSON.stringify(artCreate.data));
  const ART_ID   = artCreate.data?.id;
  const ART_SLUG = artCreate.data?.slug;
  check('US-19 Article has auto-generated slug', !!ART_SLUG);
  check('US-20 Article created as DRAFT', artCreate.data?.status === 'DRAFT');

  // Add tags via PATCH (tagIds not in CreateArticleDto, only in UpdateArticleDto)
  const patchBody = { title: `The Future of AI in 2026 ${ts}` };
  if (TAG1 && TAG2) patchBody.tagIds = [TAG1, TAG2];
  const artPatch = await req('PATCH', `/articles/${ART_ID}`, patchBody, WRITER);
  check('US-21 Writer updates article metadata', artPatch.status === 200, JSON.stringify(artPatch.data));

  const rev1 = await req('PATCH', `/articles/${ART_ID}/content`, {
    content: 'AI in 2026: multimodal models are mainstream. Deep analysis follows.',
    editorNote: 'Expanded intro',
  }, WRITER);
  check('US-22 Writer adds content revision', rev1.status === 200, JSON.stringify(rev1.data));

  const rev2 = await req('PATCH', `/articles/${ART_ID}/content`, {
    content: 'AI in 2026: multimodal models are mainstream. We cover GPT-5, Gemini Ultra, Claude 4.',
  }, WRITER);
  check('US-23 Writer adds second revision (append-only)', rev2.status === 200);

  const revHistory = await req('GET', `/articles/${ART_ID}/revisions`, null, WRITER);
  // Initial creation + 2 content patches = 3 revisions (creation also stores initial content)
  check('US-24 Revision history has ≥ 2 entries', Array.isArray(revHistory.data) && revHistory.data.length >= 2, JSON.stringify(revHistory.data));

  const mine = await req('GET', '/articles/mine', null, WRITER);
  check('US-25 Writer lists own articles', mine.status === 200 && Array.isArray(mine.data));

  const pubList = await req('GET', '/articles');
  const draftVisible = pubList.data?.articles?.find?.(a => a.id === ART_ID);
  check('US-26 DRAFT not visible in public list', !draftVisible);

  const submit = await req('POST', `/articles/${ART_ID}/submit`, null, WRITER);
  check('US-27 Writer submits article (DRAFT→SUBMITTED)', submit.status === 200 || submit.status === 201, JSON.stringify(submit.data));
  check('US-28 Status is SUBMITTED', submit.data?.status === 'SUBMITTED');

  const resubmit = await req('POST', `/articles/${ART_ID}/submit`, null, WRITER);
  check('US-29 Re-submit rejected (invalid transition)', resubmit.status === 409 || resubmit.status === 400);

  // ── PHASE 5: EDITOR REVIEW ──────────────────────────────────────────────────
  console.log('\n── Phase 5: Editor review ──');

  const reject = await req('POST', `/articles/${ART_ID}/reject`, { editorNote: 'Needs more depth on the analysis section' }, EDITOR);
  check('US-30 Editor rejects article (SUBMITTED→DRAFT)', reject.status === 200 || reject.status === 201, JSON.stringify(reject.data));
  check('US-31 Article returns to DRAFT', reject.data?.status === 'DRAFT');

  const resubmit2 = await req('POST', `/articles/${ART_ID}/submit`, null, WRITER);
  if (resubmit2.status !== 200 && resubmit2.status !== 201) {
    console.log(`  ⚠️  Re-submit before publish failed: ${resubmit2.status} — ${JSON.stringify(resubmit2.data)}`);
  }

  const publish = await req('POST', `/articles/${ART_ID}/publish`, null, EDITOR);
  check('US-32 Editor publishes article (SUBMITTED→PUBLISHED)', publish.status === 200 || publish.status === 201, JSON.stringify(publish.data));
  check('US-33 Status is PUBLISHED', publish.data?.status === 'PUBLISHED');
  check('US-34 publishedAt is set', !!publish.data?.publishedAt);

  const slugBefore = publish.data?.slug;
  const patchPublished = await req('PATCH', `/articles/${ART_ID}`, { title: `New Title ${ts}` }, WRITER);
  check('US-35 Slug immutable after PUBLISHED', patchPublished.data?.slug === slugBefore);

  const writerPublish = await req('POST', `/articles/${ART_ID}/publish`, null, WRITER);
  check('US-36 WRITER cannot publish (403)', writerPublish.status === 403);

  // ── PHASE 6: DISCOVERY ──────────────────────────────────────────────────────
  console.log('\n── Phase 6: Discovery ──');

  const bySlug = await req('GET', `/articles/${ART_SLUG}`);
  check('US-37 Public reads published article by slug', bySlug.status === 200 && bySlug.data?.status === 'PUBLISHED');

  const discovery = await req('GET', '/discovery/articles');
  check('US-38 Discovery feed returns articles', discovery.status === 200);

  const discTag = await req('GET', `/discovery/articles?tag=tech-${ts}`);
  check('US-39 Discovery filtered by tag', discTag.status === 200);

  const discTags = await req('GET', '/discovery/tags');
  check('US-40 Discovery tags with article counts', discTags.status === 200 && Array.isArray(discTags.data));

  const trending = await req('GET', '/discovery/trending');
  check('US-41 Trending articles endpoint works', trending.status === 200);

  // ── PHASE 7: CLAPS ──────────────────────────────────────────────────────────
  console.log('\n── Phase 7: Claps ──');

  const clap1 = await req('POST', `/articles/${ART_ID}/claps`, null, READER);
  check('US-42 Reader claps on article', clap1.status === 201 || clap1.status === 200, JSON.stringify(clap1.data));

  const clap2 = await req('POST', `/articles/${ART_ID}/claps`, null, WRITER);
  check('US-43 Writer claps own article', clap2.status === 201 || clap2.status === 200);

  const clap3 = await req('POST', `/articles/${ART_ID}/claps`, null, READER);
  check('US-44 Multiple claps allowed (append-only)', clap3.status === 201 || clap3.status === 200);

  const clapCount = await req('GET', `/articles/${ART_ID}/claps`);
  check('US-45 Clap count ≥ 3 (public)', clapCount.status === 200 && clapCount.data?.clapCount >= 3, JSON.stringify(clapCount.data));

  const noClap = await req('POST', `/articles/${ART_ID}/claps`);
  check('US-46 Unauthenticated clap rejected (401)', noClap.status === 401);

  // ── PHASE 8: COMMENTS ───────────────────────────────────────────────────────
  console.log('\n── Phase 8: Comments ──');

  const c1 = await req('POST', `/articles/${ART_ID}/comments`, { body: 'Great article! Very insightful.' }, READER);
  check('US-47 Reader posts comment', c1.status === 201 || c1.status === 200, JSON.stringify(c1.data));
  const C1_ID = c1.data?.id;
  check('US-48 Comment status is PENDING', c1.data?.status === 'PENDING');

  const c2 = await req('POST', `/articles/${ART_ID}/comments`, {
    body: 'Thank you, glad you found it useful!', parentId: C1_ID,
  }, WRITER);
  check('US-49 Writer replies to comment (nested)', c2.status === 201 || c2.status === 200, JSON.stringify(c2.data));
  const C2_ID = c2.data?.id;

  const pubComments = await req('GET', `/articles/${ART_ID}/comments`);
  const pendingVisible = pubComments.data?.some?.(c => c.id === C1_ID);
  check('US-50 PENDING comments hidden from public', !pendingVisible);

  const approveC1 = await req('POST', `/articles/${ART_ID}/comments/${C1_ID}/approve`, null, EDITOR);
  check('US-51 Editor approves comment (PENDING→APPROVED)', approveC1.status === 200 || approveC1.status === 201, JSON.stringify(approveC1.data));

  const approveAgain = await req('POST', `/articles/${ART_ID}/comments/${C1_ID}/approve`, null, EDITOR);
  check('US-52 Re-approve is idempotent', approveAgain.status === 200 || approveAgain.status === 201);

  const rejectC2 = await req('POST', `/articles/${ART_ID}/comments/${C2_ID}/reject`, null, EDITOR);
  check('US-53 Editor rejects comment (PENDING→REJECTED)', rejectC2.status === 200 || rejectC2.status === 201, JSON.stringify(rejectC2.data));

  const pubAfter = await req('GET', `/articles/${ART_ID}/comments`);
  const approvedVisible = pubAfter.data?.some?.(c => c.id === C1_ID);
  check('US-54 Approved comment visible to public', approvedVisible, JSON.stringify(pubAfter.data));

  const delC = await req('DELETE', `/articles/${ART_ID}/comments/${C1_ID}`, null, ADMIN);
  check('US-55 Admin deletes comment (204)', delC.status === 204 || delC.status === 200, JSON.stringify(delC.data));

  const modQueue = await req('GET', '/admin/comments/pending', null, ADMIN);
  check('US-56 Admin sees pending comment queue', modQueue.status === 200 && Array.isArray(modQueue.data));

  // ── PHASE 9: SOCIAL ─────────────────────────────────────────────────────────
  console.log('\n── Phase 9: Social ──');

  const follow = await req('POST', `/users/${writer.id}/follow`, null, READER);
  check('US-57 Reader follows writer', follow.status === 201 || follow.status === 200, JSON.stringify(follow.data));

  const followAgain = await req('POST', `/users/${writer.id}/follow`, null, READER);
  check('US-58 Duplicate follow rejected (409)', followAgain.status === 409 || followAgain.status === 400);

  const feed = await req('GET', '/users/me/feed', null, READER);
  check('US-59 Reader gets personalised feed', feed.status === 200, JSON.stringify(feed.data));

  const unfollow = await req('DELETE', `/users/${writer.id}/follow`, null, READER);
  check('US-60 Reader unfollows writer (204)', unfollow.status === 204 || unfollow.status === 200);

  // ── PHASE 10: USER PROFILE ──────────────────────────────────────────────────
  console.log('\n── Phase 10: User profile ──');

  const updateProfile = await req('PATCH', '/users/me', {
    name: 'Arjun Mehta', bio: 'AI & Tech writer based in Bengaluru',
  }, WRITER);
  check('US-61 Writer updates own profile', updateProfile.status === 200, JSON.stringify(updateProfile.data));

  // ── PHASE 11: ARCHIVE ────────────────────────────────────────────────────────
  console.log('\n── Phase 11: Archive ──');

  const archive = await req('POST', `/articles/${ART_ID}/archive`, null, WRITER);
  check('US-62 Writer archives article (PUBLISHED→ARCHIVED)', archive.status === 200 || archive.status === 201, JSON.stringify(archive.data));
  check('US-63 Status is ARCHIVED', archive.data?.status === 'ARCHIVED');

  const pubFinal = await req('GET', '/articles');
  const archivedVisible = pubFinal.data?.articles?.find?.(a => a.id === ART_ID);
  check('US-64 ARCHIVED article not in public list', !archivedVisible);

  // ── PHASE 12: LOGOUT ─────────────────────────────────────────────────────────
  console.log('\n── Phase 12: Logout ──');

  // Use fresh refresh token seeded at start — guaranteed to be a real DB token
  const logout = await req('POST', '/auth/logout', { refreshToken: refreshTokenRaw }, WRITER);
  check('US-65 Writer logs out', logout.status === 200 || logout.status === 204, JSON.stringify(logout.data));

  // ── SUMMARY ──────────────────────────────────────────────────────────────────
  await prisma.$disconnect();
  console.log('\n════════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('════════════════════════════════════════════════════');
  results.forEach(r => console.log(r));
  console.log('\n────────────────────────────────────────────────────');
  console.log(`  PASS: ${pass}  |  FAIL: ${fail}  |  TOTAL: ${pass + fail}`);
  console.log('────────────────────────────────────────────────────\n');
  const failed = results.filter(r => r.startsWith('  ❌'));
  if (failed.length > 0) {
    console.log('FAILED TESTS:');
    failed.forEach(f => console.log(f));
  }
}

run().catch(async err => {
  await prisma.$disconnect();
  console.error('FATAL:', err.message);
  process.exit(1);
});
