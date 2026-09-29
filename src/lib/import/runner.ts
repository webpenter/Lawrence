import { createHash } from 'crypto';

import type { Payload } from 'payload';
import { render } from '@react-email/components';

import { brand } from '@/config/brand';
import { sendEmail } from '@/lib/email/send';
import { ImportSummaryEmail } from '@/lib/email/templates/agency-emails';
import { computeFingerprint } from '@/lib/fingerprint';
import { lexicalToText, runPreChecks } from '@/lib/moderation/pre-checks';

import { imageUrlsFromRow, mapRowToListing } from './map-row';
import { validateRow, type RawRow, type RowReport } from './validate-row';

/** Cap fetched images per row — enough for the ≥8 check plus headroom. */
const MAX_FETCHED_IMAGES = 12;

/**
 * §9.4: fetch, validate and deduplicate row images into Media docs. Upload
 * enforcement does the heavy lifting (2000px long edge, EXIF stripping) —
 * a rejected image degrades to a row warning, never row loss. Dedup is by
 * source-URL hash on Media.sourceId.
 */
async function attachRowImages(
  payload: Payload,
  listingId: number,
  agencyId: number,
  title: string,
  row: RawRow,
  report: RowReport,
): Promise<number> {
  const urls = imageUrlsFromRow(row).slice(0, MAX_FETCHED_IMAGES);
  const mediaIds: number[] = [];
  for (const url of urls) {
    const sourceId = `import-${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
    const existing = await payload.find({
      collection: 'media',
      where: { sourceId: { equals: sourceId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (existing.docs[0]) {
      mediaIds.push(existing.docs[0].id);
      continue;
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      const type = response.headers.get('content-type') ?? '';
      if (!response.ok || !type.startsWith('image/')) throw new Error(`HTTP ${response.status} ${type}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > 25_000_000) throw new Error('image exceeds 25MB');
      const created = await payload.create({
        collection: 'media',
        overrideAccess: true,
        file: {
          data: buffer,
          name: `${sourceId}.jpg`,
          mimetype: type.split(';')[0] ?? 'image/jpeg',
          size: buffer.length,
        },
        data: {
          visibility: 'public',
          alt: title,
          agency: agencyId,
          sourceUrl: url,
          sourceId,
        } as never,
      });
      mediaIds.push(created.id);
    } catch (err) {
      report.issues.push({
        column: 'image_urls',
        reason: `Image rejected (${url.slice(0, 80)}): ${String(err).slice(0, 120)}`,
        severity: 'warning',
      });
    }
  }
  if (mediaIds.length > 0) {
    await payload.update({
      collection: 'properties',
      id: listingId,
      data: { media: mediaIds } as never,
      draft: true,
      overrideAccess: true,
    });
  }
  return mediaIds.length;
}

export interface ImportSummary {
  jobId: number;
  dryRun: boolean;
  created: number;
  updated: number;
  skipped: number;
  reports: RowReport[];
}

interface RunImportArgs {
  payload: Payload;
  agencyId: number;
  rows: RawRow[];
  dryRun: boolean;
  kind: 'csv' | 'xlsx' | 'feed';
  sourceType: 'csv_import' | 'xml_feed';
  sourceFilename?: string;
}

/**
 * The shared import pipeline (§8.4/§8.5): validate every row, record the full
 * report on an ImportJob, and — outside dry-run — upsert idempotently on
 * (agency, reference). Rows with errors never touch the database; imported
 * listings always land in pending_review and clear §8.6 auto-approval only
 * when clean and from a verified-tier agency. Image fetching is delegated to
 * the media step and its failures degrade to row warnings, never row loss.
 */
export async function runImport(args: RunImportArgs): Promise<ImportSummary> {
  const { payload, agencyId, rows, dryRun, kind, sourceType, sourceFilename } = args;

  const reports = rows.map((row, index) => validateRow(row, index + 2)); // +2: 1-based + header
  const failed = reports.filter((r) => r.status === 'error').length;

  const job = await payload.create({
    collection: 'import-jobs',
    overrideAccess: true,
    data: {
      agency: agencyId,
      kind,
      sourceFilename: sourceFilename ?? null,
      status: dryRun ? 'dry_run' : 'running',
      rowsProcessed: rows.length,
      rowsFailed: failed,
      errorReport: reports.filter((r) => r.status !== 'ok'),
    },
  });

  const summary: ImportSummary = {
    jobId: job.id,
    dryRun,
    created: 0,
    updated: 0,
    skipped: failed,
    reports,
  };
  if (dryRun) return summary;

  const agency = await payload.findByID({
    collection: 'agencies',
    id: agencyId,
    depth: 0,
    overrideAccess: true,
  });

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] as RawRow;
    const report = reports[i] as RowReport;
    if (report.status === 'error') continue;

    const data = mapRowToListing(row, agencyId);
    data.sourceType = sourceType;

    // §8.8 duplicate detection against other agencies' inventory.
    const coords = (data.location as { coordinates?: [number, number] }).coordinates;
    const fingerprint = computeFingerprint({
      longitude: coords?.[0],
      latitude: coords?.[1],
      propertyType: data.propertyType as string,
      builtAreaSqm: data.builtAreaSqm as number,
      bedrooms: data.bedrooms as number,
    });
    const duplicates = await payload.find({
      collection: 'properties',
      where: {
        and: [{ fingerprint: { equals: fingerprint } }, { agency: { not_equals: agencyId } }],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (duplicates.docs[0]) {
      data.duplicateOf = duplicates.docs[0].id;
      data.moderationNote = `Possible duplicate of listing ${duplicates.docs[0].id} (${duplicates.docs[0].slug ?? 'unslugged'}) from another agency — review §8.8.`;
      report.issues.push({
        column: 'reference',
        reason: 'Fingerprint matches a listing from another agency; flagged for review.',
        severity: 'warning',
      });
    }

    // Idempotency on (agency, reference) — §8.4.
    const existing = await payload.find({
      collection: 'properties',
      where: {
        and: [
          { agency: { equals: agencyId } },
          { reference: { equals: data.reference as string } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    let listingId: number;
    if (existing.docs[0]) {
      const updated = await payload.update({
        collection: 'properties',
        id: existing.docs[0].id,
        data,
        draft: true,
        overrideAccess: true,
      });
      listingId = updated.id;
      summary.updated += 1;
    } else {
      const created = await payload.create({
        collection: 'properties',
        data: data as never,
        draft: true,
        overrideAccess: true,
      });
      listingId = created.id;
      summary.created += 1;
    }

    // §9.4: images are fetched, validated (upload enforces 2000px + EXIF
    // stripping), optimised by the media pipeline and deduplicated by URL.
    const attachedImages = await attachRowImages(
      payload,
      listingId,
      agencyId,
      (data.title as string) ?? '',
      row,
      report,
    );

    // §9.4: clean listings from verified agencies auto-approve and publish.
    if (agency.tier === 'verified' && !data.duplicateOf) {
      const flags = runPreChecks({
        coordinates: coords ?? null,
        priceEur: (data.currency === 'EUR' ? (data.priceAmount as number | null) : null) ?? null,
        internalValueEur: (data.internalValueEur as number | null) ?? null,
        imageCount: attachedImages,
        descriptionText: lexicalToText(data.description),
        title: (data.title as string) ?? '',
        duplicateOf: (data.duplicateOf as number | null) ?? null,
      });
      if (flags.length === 0) {
        await payload.update({
          collection: 'properties',
          id: listingId,
          data: { moderation: 'approved', status: 'available', _status: 'published' },
          overrideAccess: true,
        });
      } else {
        await payload.update({
          collection: 'properties',
          id: listingId,
          data: {
            moderationNote: flags.map((f) => `${f.code}: ${f.message}`).join('\n'),
          },
          draft: true,
          overrideAccess: true,
        });
      }
    }
  }

  await payload.update({
    collection: 'import-jobs',
    id: job.id,
    overrideAccess: true,
    data: {
      status: 'complete',
      rowsFailed: summary.skipped,
      errorReport: summary.reports.filter((r) => r.status !== 'ok'),
    },
  });

  // §9.4: the summary email with the error-CSV link — best-effort.
  if (agency.email) {
    try {
      const base = (process.env.NEXT_PUBLIC_SITE_URL ?? brand.siteUrl).replace(/\/$/, '');
      const component = ImportSummaryEmail({
        agencyName: agency.name,
        filename: sourceFilename ?? kind,
        processed: rows.length,
        created: summary.created,
        updated: summary.updated,
        failed: summary.skipped,
        errorCsvUrl:
          summary.skipped > 0 ? `${base}/api/import/${job.id}/errors.csv` : null,
      });
      await sendEmail({
        to: agency.email,
        subject: `Import complete — ${summary.created} created, ${summary.updated} updated, ${summary.skipped} failed`,
        html: await render(component),
        text: await render(component, { plainText: true }),
      });
    } catch (err) {
      payload.logger.warn(`[import] summary email failed: ${String(err)}`);
    }
  }

  return summary;
}
