import fs from 'fs';
import path from 'path';

import { NextRequest } from 'next/server';
import Papa from 'papaparse';
import { getPayload, Payload } from 'payload';
import config from '@/payload.config';

import { describe, it, beforeAll, afterAll, expect } from 'vitest';

import { POST as applicationRoute } from '@/app/api/agency-application/route';
import { POST as reviewRoute } from '@/app/api/admin/review/route';
import { GET as errorsCsvRoute } from '@/app/api/import/[jobId]/errors.csv/route';
import { runImport } from '@/lib/import/runner';
import type { RawRow } from '@/lib/import/validate-row';

// Track B acceptance (Prompts 15–16), local-API level:
// onboarding application → approval side-effects; the profile gate; the
// import pipeline against the sample CSV (idempotency, €4M rejection,
// channel rejection, images-blocked-by-moderation).

let payload: Payload;
const suffix = Date.now().toString(36);
const APPLICANT = `applicant-${suffix}@test.lawrence`;

function fixtureRows(): RawRow[] {
  const csv = fs.readFileSync(
    path.resolve(process.cwd(), 'tests/fixtures/sample-import.csv'),
    'utf8',
  );
  return Papa.parse<RawRow>(csv, { header: true, skipEmptyLines: true }).data;
}

describe('Track B acceptance', () => {
  let agencyId: number;

  beforeAll(async () => {
    payload = await getPayload({ config: await config });
    const agency = await payload.create({
      collection: 'agencies',
      overrideAccess: true,
      data: {
        name: `Import Test Agency ${suffix}`,
        slug: `import-agency-${suffix}`,
        email: `import-${suffix}@test.lawrence`,
        tier: 'verified',
      } as never,
    });
    agencyId = agency.id;
  });

  afterAll(async () => {
    await payload.delete({
      collection: 'properties',
      where: { agency: { equals: agencyId } },
      overrideAccess: true,
    });
    await payload.delete({
      collection: 'import-jobs',
      where: { agency: { equals: agencyId } },
      overrideAccess: true,
    });
    await payload.delete({
      collection: 'agencies',
      where: { id: { equals: agencyId } },
      overrideAccess: true,
    });
    await payload.delete({
      collection: 'users',
      where: { email: { equals: APPLICANT } },
      overrideAccess: true,
    });
    await payload.delete({
      collection: 'agencies',
      where: { email: { equals: APPLICANT } },
      overrideAccess: true,
    });
    await payload.delete({
      collection: 'agency-applications',
      where: { email: { equals: APPLICANT } },
      overrideAccess: true,
    });
  });

  it('an approved application creates the agency and its agency_admin user (§9.4 onboarding)', async () => {
    const res = await applicationRoute(
      new NextRequest('http://localhost:3000/api/agency-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
        body: JSON.stringify({
          agencyName: `Test Office ${suffix}`,
          contactName: 'Test Contact',
          email: APPLICANT,
          country: 'fr',
          consent: true,
          startedAt: Date.now() - 10_000,
        }),
      }),
    );
    expect(res.status).toBe(201);

    const application = await payload.find({
      collection: 'agency-applications',
      where: { email: { equals: APPLICANT } },
      limit: 1,
      overrideAccess: true,
    });
    expect(application.docs[0]?.status).toBe('new');

    await payload.update({
      collection: 'agency-applications',
      id: application.docs[0]!.id,
      data: { status: 'approved' },
      overrideAccess: true,
    });

    const agency = await payload.find({
      collection: 'agencies',
      where: { email: { equals: APPLICANT } },
      limit: 1,
      overrideAccess: true,
    });
    expect(agency.docs[0]).toBeTruthy();

    const user = await payload.find({
      collection: 'users',
      where: { email: { equals: APPLICANT } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    expect(user.docs[0]?.role).toBe('agency_admin');
    expect(user.docs[0]?.agency).toBe(agency.docs[0]!.id);
  });

  it('the profile-completeness gate blocks a first submission from an incomplete agency', async () => {
    const user = await payload.find({
      collection: 'users',
      where: { email: { equals: APPLICANT } },
      limit: 1,
      overrideAccess: true,
    });
    let thrown: unknown;
    try {
      await payload.create({
        collection: 'properties',
        overrideAccess: false,
        user: user.docs[0],
        draft: true,
        data: {
          title: 'Gate test listing',
          propertyType: 'villa',
          priceType: 'fixed',
          currency: 'EUR',
          priceAmount: 25_000_000,
          status: 'draft',
          moderation: 'unreviewed',
          sourceType: 'manual',
          _status: 'draft',
        } as never,
      });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeTruthy();
    const detail = JSON.stringify((thrown as { data?: unknown }).data ?? thrown);
    expect(detail).toMatch(/complete your agency profile/i);
  });

  it('importing the sample CSV twice creates no duplicates (§9.4 idempotency)', async () => {
    const first = await runImport({
      payload,
      agencyId,
      rows: fixtureRows(),
      dryRun: false,
      kind: 'csv',
      sourceType: 'csv_import',
      sourceFilename: 'sample-import.csv',
    });
    // Rows IMP-002 (€4M) and IMP-003 (channel) are rejected; three import.
    expect(first.created).toBe(3);
    expect(first.skipped).toBe(2);

    const second = await runImport({
      payload,
      agencyId,
      rows: fixtureRows(),
      dryRun: false,
      kind: 'csv',
      sourceType: 'csv_import',
      sourceFilename: 'sample-import.csv',
    });
    expect(second.created).toBe(0);
    expect(second.updated).toBe(3);

    const count = await payload.count({
      collection: 'properties',
      where: { agency: { equals: agencyId } },
      overrideAccess: true,
    });
    expect(count.totalDocs).toBe(3);
  });

  it('a €4M row is rejected with a clear admission reason', async () => {
    const summary = await runImport({
      payload,
      agencyId,
      rows: fixtureRows(),
      dryRun: true,
      kind: 'csv',
      sourceType: 'csv_import',
    });
    const row = summary.reports.find((r) => r.reference === 'IMP-002');
    expect(row?.status).toBe('error');
    expect(JSON.stringify(row?.issues)).toMatch(/€4M|below|threshold|10M/i);
  });

  it('a row attempting channel = off_market is rejected', async () => {
    const summary = await runImport({
      payload,
      agencyId,
      rows: fixtureRows(),
      dryRun: true,
      kind: 'csv',
      sourceType: 'csv_import',
    });
    const row = summary.reports.find((r) => r.reference === 'IMP-003');
    expect(row?.status).toBe('error');
    expect(JSON.stringify(row?.issues)).toMatch(/off-market|channel=public/i);
  });

  it('a listing with too few images is blocked by moderation, not published', async () => {
    const imported = await payload.find({
      collection: 'properties',
      where: {
        and: [{ agency: { equals: agencyId } }, { reference: { equals: 'IMP-004' } }],
      },
      limit: 1,
      draft: true,
      overrideAccess: true,
    });
    const listing = imported.docs[0]!;
    expect(listing).toBeTruthy();
    // Fixture image hosts do not resolve → zero attached images → the ≥8
    // check flags it and auto-approval never fires, even for a verified tier.
    expect(listing.moderation).toBe('unreviewed');
    expect(listing._status).toBe('draft');
    expect(listing.moderationNote ?? '').toMatch(/too_few_images/);
  });

  it('the review decision approves through /api/admin/review and publishes', async () => {
    const editorLogin = await payload.login({
      collection: 'users',
      data: { email: 'editor@sample.lawrence', password: 'sample-staff-password' },
    });
    const target = await payload.find({
      collection: 'properties',
      where: {
        and: [{ agency: { equals: agencyId } }, { reference: { equals: 'IMP-005' } }],
      },
      limit: 1,
      draft: true,
      overrideAccess: true,
    });
    const res = await reviewRoute(
      new NextRequest('http://localhost:3000/api/admin/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `JWT ${editorLogin.token}`,
        },
        body: JSON.stringify({ propertyId: target.docs[0]!.id, action: 'approve' }),
      }),
    );
    expect(res.status, JSON.stringify(await res.clone().json())).toBe(200);

    const published = await payload.findByID({
      collection: 'properties',
      id: target.docs[0]!.id,
      depth: 0,
      overrideAccess: true,
    });
    expect(published.moderation).toBe('approved');
    expect(published._status).toBe('published');
  });

  it('the error CSV downloads for the job owner and staff', async () => {
    const editorLogin = await payload.login({
      collection: 'users',
      data: { email: 'editor@sample.lawrence', password: 'sample-staff-password' },
    });
    const job = await payload.find({
      collection: 'import-jobs',
      where: { agency: { equals: agencyId } },
      sort: '-createdAt',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const res = await errorsCsvRoute(
      new NextRequest(`http://localhost:3000/api/import/${job.docs[0]!.id}/errors.csv`, {
        headers: { Authorization: `JWT ${editorLogin.token}` },
      }),
      { params: Promise.resolve({ jobId: String(job.docs[0]!.id) }) },
    );
    expect(res.status).toBe(200);
    const csv = await res.text();
    expect(csv.split('\n')[0]).toBe('row,reference,severity,column,reason');
    expect(csv).toMatch(/IMP-00[23]/);
  });
});
