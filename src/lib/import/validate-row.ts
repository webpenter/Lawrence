import { checkAdmission } from '@/collections/Property/validation';

import { IMPORT_COLUMNS } from './columns';

export type RowStatus = 'ok' | 'warning' | 'error';

export interface RowIssue {
  column: string;
  reason: string;
  severity: 'warning' | 'error';
}

export interface RowReport {
  row: number;
  reference: string;
  status: RowStatus;
  issues: RowIssue[];
}

export type RawRow = Record<string, string | undefined>;

const PIPE = '|';

function parseBool(value: string): boolean | undefined {
  const v = value.trim().toLowerCase();
  if (['true', 'yes', '1', 'y'].includes(v)) return true;
  if (['false', 'no', '0', 'n'].includes(v)) return false;
  return undefined;
}

/**
 * §8.4 dry-run validation: row-by-row ok / warning / error with the exact
 * reason and column. Pure — the same report renders in the browser, lands in
 * the ImportJob record and exports as the error CSV.
 */
export function validateRow(raw: RawRow, rowNumber: number): RowReport {
  const issues: RowIssue[] = [];
  const value = (name: string) => raw[name]?.trim() ?? '';

  // §9.4: import may set channel = public ONLY. Off-market inventory is
  // entered deliberately, by a person — a channel column asking for anything
  // else is rejected, not silently ignored.
  const channel = value('channel');
  if (channel && channel !== 'public') {
    issues.push({
      column: 'channel',
      reason:
        'Import may only create public listings (channel=public). Off-market listings must be entered manually.',
      severity: 'error',
    });
  }

  for (const column of IMPORT_COLUMNS) {
    const v = value(column.name);
    if (!v) {
      if (column.required) {
        issues.push({ column: column.name, reason: 'Required value is missing.', severity: 'error' });
      }
      continue;
    }
    switch (column.kind) {
      case 'number':
      case 'int': {
        const parsed = Number(v);
        if (!Number.isFinite(parsed)) {
          issues.push({ column: column.name, reason: `"${v}" is not a number.`, severity: 'error' });
        } else if (column.kind === 'int' && !Number.isInteger(parsed)) {
          issues.push({ column: column.name, reason: `"${v}" must be a whole number.`, severity: 'error' });
        } else if (parsed < 0 && !['latitude', 'longitude'].includes(column.name)) {
          issues.push({ column: column.name, reason: 'Value cannot be negative.', severity: 'error' });
        }
        break;
      }
      case 'bool':
        if (parseBool(v) === undefined) {
          issues.push({
            column: column.name,
            reason: `"${v}" is not a yes/no value (use true/false).`,
            severity: 'error',
          });
        }
        break;
      case 'enum':
        if (!column.enumValues?.includes(v)) {
          issues.push({
            column: column.name,
            reason: `"${v}" is not one of: ${column.enumValues?.join(', ')}.`,
            severity: 'error',
          });
        }
        break;
      case 'multi-enum': {
        const parts = v.split(PIPE).map((p) => p.trim()).filter(Boolean);
        const invalid = parts.filter((p) => !column.enumValues?.includes(p));
        if (invalid.length > 0) {
          issues.push({
            column: column.name,
            reason: `Invalid value(s) ${invalid.join(', ')}. Allowed: ${column.enumValues?.join(', ')}.`,
            severity: 'error',
          });
        }
        break;
      }
      case 'date':
        if (Number.isNaN(Date.parse(v))) {
          issues.push({ column: column.name, reason: `"${v}" is not a date (use YYYY-MM-DD).`, severity: 'error' });
        }
        break;
      case 'urls': {
        const urls = v.split(PIPE).map((p) => p.trim()).filter(Boolean);
        const bad = urls.filter((u) => !/^https?:\/\//.test(u));
        if (bad.length > 0) {
          issues.push({ column: column.name, reason: `Not absolute URL(s): ${bad.join(', ')}.`, severity: 'error' });
        }
        if (urls.length < 6) {
          issues.push({
            column: column.name,
            reason: `${urls.length} image(s) supplied; listings need at least 6 to pass review (§8.6).`,
            severity: 'warning',
          });
        }
        break;
      }
      default:
        break;
    }
  }

  // The admission policy (§2.2) — the reason every other check exists. FX is
  // not available in this pure validator, so a non-EUR price without an
  // internal value only warns; the publish-time hook re-enforces exactly.
  const parseMoney = (name: string): number => {
    const raw = value(name);
    return raw === '' ? Number.NaN : Number(raw);
  };
  const internalValue = parseMoney('internal_value_eur');
  const priceAmount = parseMoney('price_amount');
  const currency = value('currency') || 'EUR';
  const enforceable = Number.isFinite(internalValue)
    ? internalValue
    : currency === 'EUR' && Number.isFinite(priceAmount)
      ? priceAmount
      : null;
  if (enforceable == null) {
    issues.push({
      column: 'internal_value_eur',
      reason:
        'No enforceable EUR value: set internal_value_eur (required for on-request or non-EUR rows) — the €20M admission threshold cannot be verified.',
      severity: 'warning',
    });
  } else {
    const admission = checkAdmission({ internalValueEur: enforceable });
    if (!admission.ok) {
      issues.push({
        column: Number.isFinite(internalValue) ? 'internal_value_eur' : 'price_amount',
        reason: admission.reason as string,
        severity: enforceable >= 10_000_000 ? 'warning' : 'error',
      });
    }
  }

  // Coordinate plausibility (§8.6 pre-check, importable subset).
  const lat = Number(value('latitude'));
  const lng = Number(value('longitude'));
  if (Number.isFinite(lat) && (lat < -90 || lat > 90)) {
    issues.push({ column: 'latitude', reason: 'Latitude must be between -90 and 90.', severity: 'error' });
  }
  if (Number.isFinite(lng) && (lng < -180 || lng > 180)) {
    issues.push({ column: 'longitude', reason: 'Longitude must be between -180 and 180.', severity: 'error' });
  }
  if (lat === 0 && lng === 0) {
    issues.push({ column: 'latitude', reason: 'Coordinates (0,0) are not a real location.', severity: 'error' });
  }

  if (value('water_frontage_m') === '') {
    issues.push({
      column: 'water_frontage_m',
      reason: 'Missing frontage: listings with frontage data receive far more enquiries (§8.3).',
      severity: 'warning',
    });
  }

  const status: RowStatus = issues.some((i) => i.severity === 'error')
    ? 'error'
    : issues.length > 0
      ? 'warning'
      : 'ok';

  return { row: rowNumber, reference: value('reference'), status, issues };
}

export { parseBool };
