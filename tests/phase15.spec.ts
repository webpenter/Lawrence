import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Prompt 15 acceptance over the REST API: agency B receives 403 or EMPTY
 * results on agency A's listings, media and enquiries; an agency user cannot
 * publish (the save lands as an unreviewed draft); an editor can. Uses the
 * §13.10 sample staff users.
 */

const PASSWORD = 'sample-staff-password';

async function loginAs(request: APIRequestContext, email: string): Promise<string> {
  const response = await request.post('/api/users/login', {
    data: { email, password: PASSWORD },
  });
  expect(response.ok(), `login ${email}`).toBe(true);
  const body = (await response.json()) as { token: string };
  return body.token;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `JWT ${token}` };
}

test.describe('Agency tenancy over REST (§9.4 acceptance)', () => {
  test('agency B sees none of agency A data; an editor sees it all', async ({ request }) => {
    const editorToken = await loginAs(request, 'editor@sample.lawrence');
    const aToken = await loginAs(request, 'agency-a@sample.lawrence');
    const bToken = await loginAs(request, 'agency-b@sample.lawrence');

    // Agency A's own scope, from A's account.
    const meA = (await (
      await request.get('/api/users/me', { headers: authHeaders(aToken) })
    ).json()) as { user: { agency: number | { id: number } } };
    const agencyAId =
      typeof meA.user.agency === 'object' ? meA.user.agency.id : meA.user.agency;

    // As the editor: pick one listing that belongs to agency A.
    const editorList = (await (
      await request.get(
        `/api/properties?where[agency][equals]=${agencyAId}&limit=1&depth=0&draft=true`,
        { headers: authHeaders(editorToken) },
      )
    ).json()) as { docs: Array<{ id: number }>; totalDocs: number };
    expect(editorList.totalDocs).toBeGreaterThan(0);
    const aListingId = editorList.docs[0]!.id;

    // As agency B: A's listings are invisible in list queries…
    const bList = (await (
      await request.get(
        `/api/properties?where[agency][equals]=${agencyAId}&limit=5&depth=0`,
        { headers: authHeaders(bToken) },
      )
    ).json()) as { totalDocs: number };
    expect(bList.totalDocs).toBe(0);

    // …and the direct document read is denied (403/404 — never the data).
    const bDirect = await request.get(`/api/properties/${aListingId}?depth=0`, {
      headers: authHeaders(bToken),
    });
    expect([403, 404]).toContain(bDirect.status());

    // Every listing B CAN see is B's own.
    const bOwn = (await (
      await request.get('/api/properties?limit=100&depth=0&draft=true', {
        headers: authHeaders(bToken),
      })
    ).json()) as { docs: Array<{ agency: number | { id: number } }> };
    const meB = (await (
      await request.get('/api/users/me', { headers: authHeaders(bToken) })
    ).json()) as { user: { agency: number | { id: number } } };
    const agencyBId =
      typeof meB.user.agency === 'object' ? meB.user.agency.id : meB.user.agency;
    for (const doc of bOwn.docs) {
      const owner = typeof doc.agency === 'object' ? doc.agency.id : doc.agency;
      expect(owner).toBe(agencyBId);
    }

    // Media and enquiries: B sees nothing of A's.
    const bMedia = (await (
      await request.get(`/api/media?where[agency][equals]=${agencyAId}&limit=5&depth=0`, {
        headers: authHeaders(bToken),
      })
    ).json()) as { totalDocs: number };
    expect(bMedia.totalDocs).toBe(0);

    const bEnquiries = (await (
      await request.get(
        `/api/enquiries?where[agency][equals]=${agencyAId}&limit=5&depth=0`,
        { headers: authHeaders(bToken) },
      )
    ).json()) as { totalDocs: number };
    expect(bEnquiries.totalDocs).toBe(0);
  });

  test('an agency user cannot publish; the attempt lands as an unreviewed draft', async ({
    request,
  }) => {
    const aToken = await loginAs(request, 'agency-a@sample.lawrence');
    const own = (await (
      await request.get('/api/properties?limit=1&depth=0&draft=true', {
        headers: authHeaders(aToken),
      })
    ).json()) as { docs: Array<{ id: number }> };
    expect(own.docs.length).toBeGreaterThan(0);
    const listingId = own.docs[0]!.id;

    const attempt = await request.patch(`/api/properties/${listingId}?depth=0&draft=true`, {
      headers: { ...authHeaders(aToken), 'Content-Type': 'application/json' },
      data: { _status: 'published', moderation: 'approved' },
    });
    expect(attempt.ok(), await attempt.text()).toBe(true);
    const updated = (await attempt.json()) as {
      doc: { _status: string; moderation: string };
    };
    expect(updated.doc._status).toBe('draft');
    expect(updated.doc.moderation).toBe('unreviewed');
  });

  test('an editor CAN publish through the same API', async ({ request }) => {
    const editorToken = await loginAs(request, 'editor@sample.lawrence');
    const list = (await (
      await request.get(
        '/api/properties?where[channel][equals]=public&where[_status][equals]=published&limit=1&depth=0',
        { headers: authHeaders(editorToken) },
      )
    ).json()) as { docs: Array<{ id: number; _status?: string }> };
    expect(list.docs.length).toBeGreaterThan(0);
    const listingId = list.docs[0]!.id;

    const attempt = await request.patch(`/api/properties/${listingId}?depth=0`, {
      headers: { ...authHeaders(editorToken), 'Content-Type': 'application/json' },
      data: { _status: 'published' },
    });
    expect(attempt.ok(), await attempt.text()).toBe(true);
    const updated = (await attempt.json()) as { doc: { _status: string } };
    expect(updated.doc._status).toBe('published');
  });
});
