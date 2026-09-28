import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { LeadsChartLazy as LeadsChart } from '@/components/dashboard/LeadsChartLazy';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { getPayloadClient } from '@/lib/db';
import {
  getAdminDashboard,
  getAgencyDashboard,
  type AdminDashboard,
  type AgencyDashboard,
} from '@/lib/db/dashboard';
import { humanizeEnum } from '@/components/property/WaterChips';
import { relationId } from '@/payload/access/tenant';

// Prompt 15 B/C: read-only backoffice dashboards, role-gated via the Payload
// session. Never indexable; the Recharts chunk loads only on this route.
export const metadata: Metadata = { robots: { index: false, follow: false } };

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

interface Viewer {
  role: string;
  agencyId?: number;
}

async function resolveViewer(): Promise<Viewer | null> {
  try {
    const payload = await getPayloadClient();
    const { user } = await payload.auth({ headers: await headers() });
    if (!user?.role) return null;
    return {
      role: user.role,
      agencyId: relationId(user.agency as number | { id: number } | null),
    };
  } catch {
    return null;
  }
}

function Cell({ value, label }: { value: string; label: string }) {
  return (
    <div className="border border-line bg-vellum p-4">
      <p className="font-display text-xl tabular-nums text-ink">{value}</p>
      <p className="text-[length:var(--text-xs)] uppercase tracking-[0.16em] text-graphite">
        {label}
      </p>
    </div>
  );
}

async function AgencyView({ agencyId }: { agencyId: number }) {
  const t = await getTranslations('dashboard');
  let data: AgencyDashboard;
  try {
    data = await getAgencyDashboard(agencyId);
  } catch {
    return <p className="px-7 py-8 text-sm text-graphite">{t('signInPrompt')}</p>;
  }

  const reasonLabel: Record<string, string> = {
    missing_frontage: t('reasonMissingFrontage'),
    missing_nautical: t('reasonMissingNautical'),
    expiring: t('reasonExpiring'),
    changes_requested: t('reasonChangesRequested'),
  };

  return (
    <div className="flex flex-col gap-8 px-7 py-8">
      <h1 className="font-display text-2xl text-ink">{t('agencyTitle')}</h1>

      <section aria-label={t('listingsByStatus')} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Object.entries(data.listingsByStatus)
          .filter(([, count]) => count > 0)
          .map(([status, count]) => (
            <Cell key={status} value={String(count)} label={humanizeEnum(status)} />
          ))}
        <Cell value={String(data.leadsLast30Days)} label={t('leads30Title')} />
        <Cell
          value={
            data.averageResponseHours != null
              ? t('responseTimeHours', { hours: data.averageResponseHours })
              : t('responseTimeNone')
          }
          label={t('responseTimeTitle')}
        />
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg text-ink">{t('attentionTitle')}</h2>
        {data.attention.length === 0 ? (
          <p className="text-sm text-graphite">{t('attentionEmpty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.attention.map((entry) => (
              <li key={entry.id} className="border border-line bg-vellum p-3 text-sm">
                <Link href={`/admin/collections/properties/${entry.id}`} className="text-patina">
                  {entry.title}
                </Link>
                <span className="ml-2 text-xs text-graphite">
                  {entry.reasons.map((reason) => reasonLabel[reason] ?? reason).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg text-ink">{t('topListingsTitle')}</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {data.topListings.map((listing) => (
            <li key={listing.id} className="flex justify-between border-b border-line py-1.5">
              <span>{listing.title}</span>
              <span className="tabular-nums text-graphite">
                {listing.viewCount} {t('viewsLabel')} · {listing.leadCount} {t('leadsLabel')}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg text-ink">{t('feedTitle')}</h2>
        {data.feed?.feedUrl ? (
          <p className="text-sm text-graphite">
            {data.feed.feedLastStatus ?? '—'}
            {data.feed.feedLastRunAt ? ` · ${data.feed.feedLastRunAt.slice(0, 16)}` : ''}
          </p>
        ) : (
          <p className="text-sm text-graphite">{t('feedNone')}</p>
        )}
      </section>
    </div>
  );
}

async function AdminView() {
  const t = await getTranslations('dashboard');
  let data: AdminDashboard;
  try {
    data = await getAdminDashboard();
  } catch {
    return <p className="px-7 py-8 text-sm text-graphite">{t('signInPrompt')}</p>;
  }

  return (
    <div className="flex flex-col gap-8 px-7 py-8">
      <h1 className="font-display text-2xl text-ink">{t('adminTitle')}</h1>

      <p
        className={
          data.sampleLeak
            ? 'border border-danger bg-danger/10 p-3 text-sm text-danger'
            : 'border border-line bg-vellum p-3 text-sm text-graphite'
        }
        role={data.sampleLeak ? 'alert' : undefined}
      >
        {data.sampleLeak ? t('sampleLeakWarning') : t('sampleLeakOk')}
      </p>

      <section aria-label={t('listingsByStatus')} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Object.entries(data.totalsByStatus)
          .filter(([, count]) => count > 0)
          .map(([status, count]) => (
            <Cell key={status} value={String(count)} label={humanizeEnum(status)} />
          ))}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg text-ink">{t('leadsWeeklyTitle')}</h2>
        <LeadsChart weeks={data.leadsWeekly} />
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg text-ink">{t('waterBodyTitle')}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {data.totalsByWaterBody.map((entry) => (
            <Cell key={entry.value} value={String(entry.count)} label={humanizeEnum(entry.value)} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg text-ink">{t('dataQualityTitle')}</h2>
        <ul className="flex flex-col gap-1 text-sm text-graphite">
          <li>
            {t('missingFrontageCount', { count: data.dataQuality.missingFrontage })} —{' '}
            <Link
              href="/admin/collections/properties?where%5BwaterFrontageM%5D%5Bexists%5D=false"
              className="text-patina"
            >
              {t('editInAdmin')}
            </Link>
          </li>
          <li>
            {t('missingNauticalCount', { count: data.dataQuality.missingNautical })} —{' '}
            <Link
              href="/admin/collections/properties?where%5BmaxBoatLoaM%5D%5Bexists%5D=false"
              className="text-patina"
            >
              {t('editInAdmin')}
            </Link>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg text-ink">{t('topListingsTitle')}</h2>
        <ol className="flex flex-col gap-1 text-sm">
          {data.topByViews.map((listing) => (
            <li key={listing.id} className="flex justify-between border-b border-line py-1.5">
              <Link href={`/admin/collections/properties/${listing.id}`} className="text-patina">
                {listing.title}
              </Link>
              <span className="tabular-nums text-graphite">
                {listing.viewCount} {t('viewsLabel')}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg text-ink">{t('leaderboardTitle')}</h2>
        <ol className="flex flex-col gap-1 text-sm">
          {data.agencyLeaderboard.map((agency) => (
            <li key={agency.id} className="flex justify-between border-b border-line py-1.5">
              <span>{agency.name}</span>
              <span className="tabular-nums text-graphite">
                {agency.listings} · {agency.leads} {t('leadsLabel')}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard');
  const viewer = await resolveViewer();

  return (
    <>
      <SiteHeader />
      <main>
        {viewer == null ? (
          <div className="mx-auto flex max-w-md flex-col items-start gap-4 px-7 py-16">
            <h1 className="font-display text-2xl text-ink">{t('agencyTitle')}</h1>
            <p className="text-sm text-graphite">{t('signInPrompt')}</p>
            <Link
              href="/admin"
              className="bg-obsidian px-5 py-3 text-xs uppercase tracking-[0.14em] text-vellum"
            >
              {t('signInCta')}
            </Link>
          </div>
        ) : viewer.role === 'admin' || viewer.role === 'editor' ? (
          <AdminView />
        ) : viewer.agencyId != null ? (
          <AgencyView agencyId={viewer.agencyId} />
        ) : (
          <p className="px-7 py-8 text-sm text-graphite">{t('signInPrompt')}</p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
