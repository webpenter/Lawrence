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
import { humanizeEnum } from '@/lib/humanize';
import { relationId, staffUser } from '@/payload/access/tenant';

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
    const staff = staffUser(user);
    if (!staff?.role) return null;
    return {
      role: staff.role,
      agencyId: relationId(staff.agency ?? null),
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
    missing_market: t('reasonMissingMarket'),
    missing_value: t('reasonMissingValue'),
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

  const conversion =
    data.members.total > 0
      ? `${Math.round((data.members.confirmed / data.members.total) * 100)}%`
      : '\u2014';

  const quality: Array<[string, number, string]> = [
    [t('qualityMissingImages'), data.dataQuality.missingImages, '/admin/collections/properties'],
    [
      t('qualityShortDescriptions'),
      data.dataQuality.shortDescriptions,
      '/admin/collections/properties',
    ],
    [
      t('qualityMissingMarket'),
      data.dataQuality.missingMarket,
      '/admin/collections/properties?where%5Blocation.market%5D%5Bexists%5D=false',
    ],
    [t('qualityExpiringSoon'), data.dataQuality.expiringSoon, '/admin/collections/properties'],
  ];

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

      {/* §9.2 — inventory by channel, market, value tier and status. */}
      <section aria-label={t('inventoryTitle')}>
        <h2 className="mb-3 font-display text-lg text-ink">{t('inventoryTitle')}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Object.entries(data.inventory.byChannel).map(([channel, count]) => (
            <Cell key={`c-${channel}`} value={String(count)} label={humanizeEnum(channel)} />
          ))}
          {Object.entries(data.inventory.byValueTier).map(([tier, count]) => (
            <Cell key={`t-${tier}`} value={String(count)} label={humanizeEnum(tier)} />
          ))}
          {Object.entries(data.inventory.byStatus)
            .filter(([, count]) => count > 0)
            .map(([status, count]) => (
              <Cell key={`s-${status}`} value={String(count)} label={humanizeEnum(status)} />
            ))}
        </div>
        {data.inventory.byMarket.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2 text-xs text-graphite">
            {data.inventory.byMarket.map((market) => (
              <li key={market.name} className="border border-line px-2 py-1">
                {market.name} · {market.count}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* §9.2 — members over time with source breakdown + conversion. */}
      <section aria-label={t('membersTitle')}>
        <h2 className="mb-3 font-display text-lg text-ink">{t('membersTitle')}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Cell value={String(data.members.total)} label={t('membersTotal')} />
          <Cell value={String(data.members.confirmed)} label={t('membersConfirmed')} />
          <Cell value={conversion} label={t('membersConversion')} />
        </div>
        <ul className="mt-3 flex flex-wrap gap-2 text-xs text-graphite">
          {data.members.weekly.map((week) => (
            <li key={week.weekOf} className="border border-line px-2 py-1 tabular-nums">
              {week.weekOf.slice(5)} · {week.total}
            </li>
          ))}
        </ul>
        <ul className="mt-2 flex flex-wrap gap-2 text-xs text-graphite">
          {Object.entries(data.members.bySource).map(([source, count]) => (
            <li key={source} className="border border-line px-2 py-1">
              {humanizeEnum(source)} · {count}
            </li>
          ))}
        </ul>
      </section>

      {/* §9.2 — off-market views and document downloads per listing. */}
      <section aria-label={t('offMarketDemandTitle')}>
        <h2 className="mb-3 font-display text-lg text-ink">{t('offMarketDemandTitle')}</h2>
        {data.offMarketDemand.length === 0 ? (
          <p className="text-sm text-graphite">{t('offMarketDemandEmpty')}</p>
        ) : (
          <ol className="flex flex-col gap-1 text-sm">
            {data.offMarketDemand.map((listing) => (
              <li key={listing.id} className="flex justify-between border-b border-line py-1.5">
                <Link href={`/admin/collections/properties/${listing.id}`} className="text-patina">
                  {listing.title}
                </Link>
                <span className="tabular-nums text-graphite">
                  {listing.views} {t('viewsLabel')} · {listing.downloads} {t('downloadsLabel')}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* §9.2 — enquiries per week by source with response status. */}
      <section aria-label={t('leadsWeeklyTitle')}>
        <h2 className="mb-3 font-display text-lg text-ink">{t('leadsWeeklyTitle')}</h2>
        <LeadsChart weeks={data.enquiries.weekly} />
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          {Object.entries(data.enquiries.byResponseStatus).map(([status, count]) => (
            <Cell key={status} value={String(count)} label={humanizeEnum(status)} />
          ))}
          <Cell
            value={
              data.enquiries.averageResponseHours != null
                ? t('responseTimeHours', { hours: data.enquiries.averageResponseHours })
                : t('responseTimeNone')
            }
            label={t('responseTimeTitle')}
          />
        </div>
      </section>

      {/* §9.2 — requirements board with matches. */}
      <section aria-label={t('requirementsBoardTitle')}>
        <h2 className="mb-3 font-display text-lg text-ink">{t('requirementsBoardTitle')}</h2>
        {data.requirementsBoard.length === 0 ? (
          <p className="text-sm text-graphite">{t('requirementsEmpty')}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {data.requirementsBoard.map((row) => (
              <li key={row.id} className="flex justify-between border-b border-line py-1.5">
                <span>
                  {row.memberEmail}
                  <span className="ml-2 text-xs text-graphite">€{row.budget}</span>
                </span>
                <span className="tabular-nums text-graphite">
                  {row.matches} {t('matchesLabel')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* §9.2 — data quality. */}
      <section aria-label={t('dataQualityTitle')}>
        <h2 className="mb-3 font-display text-lg text-ink">{t('dataQualityTitle')}</h2>
        <ul className="flex flex-col gap-1 text-sm text-graphite">
          {quality.map(([label, count, href]) => (
            <li key={label}>
              {label}: <span className="tabular-nums">{count}</span> —{' '}
              <Link href={href} className="text-patina">
                {t('editInAdmin')}
              </Link>
            </li>
          ))}
        </ul>
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
