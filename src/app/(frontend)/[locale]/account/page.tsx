import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

import {
  DeleteAccountButton,
  PreferencesForm,
  RequirementsForm,
  TotpSection,
  type AccountLabels,
} from '@/components/auth/AccountForms';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Link } from '@/i18n/navigation';
import { isActiveMember } from '@/lib/access/viewer';
import { getCurrentViewer } from '@/lib/auth';
import { getPayloadClient } from '@/lib/db';
import type { Member, Property, Requirement } from '@/payload-types';

// §5.3: member routes are dynamic, noindex, never cached.
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return { robots: { index: false, follow: false } };
}

export default async function AccountPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const viewer = await getCurrentViewer();
  if (!isActiveMember(viewer)) {
    redirect(`/${locale}/join`);
  }
  const memberId = viewer.kind === 'member' ? viewer.id : '';

  const t = await getTranslations('account');
  const tj = await getTranslations('join');
  const tOff = await getTranslations('offMarket');

  const payload = await getPayloadClient();
  const [member, saved, requirement] = await Promise.all([
    payload.findByID({ collection: 'members', id: memberId, overrideAccess: true }) as Promise<Member>,
    payload.find({
      collection: 'saved-listings',
      where: { member: { equals: memberId } },
      sort: '-savedAt',
      depth: 1,
      limit: 50,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'requirements',
      where: { and: [{ member: { equals: memberId } }, { status: { equals: 'active' } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  const labels: AccountLabels = {
    reqBudgetMin: t('reqBudgetMin'),
    reqBudgetMax: t('reqBudgetMax'),
    reqTimeline: t('reqTimeline'),
    reqNotify: t('reqNotify'),
    reqSave: t('reqSave'),
    reqSaved: t('reqSaved'),
    prefMarketing: t('prefMarketing'),
    prefSave: t('prefSave'),
    totpTitle: t('totpTitle'),
    totpIntro: t('totpIntro'),
    totpStart: t('totpStart'),
    totpSecretLabel: t('totpSecretLabel'),
    totpCode: t('totpCode'),
    totpConfirm: t('totpConfirm'),
    totpEnabled: t('totpEnabled'),
    deleteTitle: t('deleteTitle'),
    deleteConfirm: t('deleteConfirm'),
    genericError: tj('genericError'),
  };

  const timelineLabels: Record<string, string> = {
    immediate: t('timelineImmediate'),
    '6_months': t('timeline6Months'),
    '12_months': t('timeline12Months'),
    opportunistic: t('timelineOpportunistic'),
  };

  return (
    <>
      <SiteHeader />
      <main className="bg-bone min-h-screen pb-24 pt-10">
        <div className="mx-auto max-w-4xl px-5">
          <h1 className="mb-2 font-display text-3xl text-ink">{t('title')}</h1>
          <p className="mb-8 text-sm text-graphite">
            {t('signedInAs', { email: member.email })}
          </p>

          {/* §11.7 saved listings with private notes. */}
          <section className="mb-12">
            <h2 className="mb-4 font-display text-xl text-ink">{t('savedTitle')}</h2>
            {saved.docs.length === 0 ? (
              <div className="border border-line bg-vellum p-6">
                <p className="text-sm text-graphite">{t('savedEmpty')}</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {saved.docs.map((entry) => {
                  const property =
                    typeof entry.property === 'object' ? (entry.property as Property) : null;
                  if (!property) return null;
                  const href = property.slug
                    ? `/property/${property.slug}`
                    : `/off-market/${property.id}`;
                  return (
                    <li key={entry.id} className="border border-line bg-vellum p-4">
                      <Link
                        href={href}
                        className="font-display text-lg text-ink hover:text-patina"
                      >
                        {property.title}
                      </Link>
                      {property.channel === 'off_market' ? (
                        <p className="mt-1 text-[length:var(--text-xs)] uppercase tracking-label text-graphite">
                          {tOff('indexTitle')}
                        </p>
                      ) : null}
                      {entry.note ? (
                        <p className="mt-2 text-sm text-graphite">{entry.note}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* §8.5 step 5 — requirements profile. */}
          <section className="mb-12">
            <h2 className="mb-1 font-display text-xl text-ink">{t('requirementsTitle')}</h2>
            <p className="mb-4 text-sm text-graphite">{tj('requirementsPromptSub')}</p>
            <div className="border border-line bg-vellum p-6">
              <RequirementsForm
                labels={labels}
                initial={(requirement.docs[0] as Requirement | undefined) ?? null}
                timelineLabels={timelineLabels}
              />
            </div>
          </section>

          {/* §11.7 email preferences. */}
          <section className="mb-12">
            <h2 className="mb-4 font-display text-xl text-ink">{t('preferencesTitle')}</h2>
            <div className="border border-line bg-vellum p-6">
              <PreferencesForm labels={labels} marketingConsent={Boolean(member.marketingConsent)} />
            </div>
          </section>

          {/* §8.5 optional TOTP. */}
          <section className="mb-12">
            <h2 className="mb-4 font-display text-xl text-ink">{t('totpTitle')}</h2>
            <div className="border border-line bg-vellum p-6">
              <TotpSection labels={labels} enabled={Boolean(member.twoFactorEnabled)} />
            </div>
          </section>

          {/* §8.5 step 6 — deletion. */}
          <section className="border-t border-line pt-8">
            <h2 className="mb-2 font-display text-xl text-danger">{t('deleteTitle')}</h2>
            <p className="mb-4 max-w-[60ch] text-sm text-graphite">{t('deleteBody')}</p>
            <DeleteAccountButton labels={labels} locale={locale} />
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
