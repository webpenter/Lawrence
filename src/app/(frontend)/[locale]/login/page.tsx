import { getTranslations } from 'next-intl/server';

// Auth surfaces render per-request (§5.3 spirit): no SSG, no cache.
export const dynamic = 'force-dynamic';
import { LoginForm } from '@/components/auth/LoginForm';
import { Section } from '@/components/ui/Section';

export default async function LoginPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'join' });

  return (
    <main className="bg-bone min-h-screen pt-24 pb-32">
      <Section className="flex justify-center">
        <LoginForm
          locale={params.locale}
          labels={{
            title: t('signInTitle'),
            fieldEmail: t('fieldEmail'),
            fieldPassword: t('fieldPassword'),
            magicLinkAlternative: t('magicLinkAlternative'),
            submit: t('signInTitle'),
            sending: '…',
            error: t('loginError'),
          }}
        />
      </Section>
    </main>
  );
}
