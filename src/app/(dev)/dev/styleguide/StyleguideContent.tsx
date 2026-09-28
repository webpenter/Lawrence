'use client';

import { useState, type ReactNode } from 'react';

import { AspectBox } from '@/components/ui/AspectBox';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/Modal';
import { OffMarketInvite } from '@/components/ui/OffMarketInvite';
import { SaveButton } from '@/components/ui/SaveButton';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-line pb-10">
      <h2 className="font-display text-2xl text-obsidian">{title}</h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

const CloseIcon = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
  </svg>
);

export function StyleguideContent() {
  const [modalOpen, setModalOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
      <header>
        <h1 className="font-display text-4xl text-obsidian">Lawrence styleguide</h1>
        <p className="mt-2 text-graphite">
          Dev-only reference for every base component in every state. Not indexed, not linked from
          the public site.
        </p>
      </header>

      <Section title="Button">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="primary" size="sm">
          Small
        </Button>
        <Button variant="primary" size="lg">
          Large
        </Button>
        <Button variant="primary" disabled>
          Disabled
        </Button>
        <Button variant="primary" loading>
          Loading
        </Button>
        <Button variant="secondary" href="/">
          As link
        </Button>
      </Section>

      <Section title="IconButton">
        <IconButton icon={CloseIcon} label="Close" />
        <IconButton icon={CloseIcon} label="Close (disabled)" disabled />
      </Section>

      <Section title="Input">
        <Input label="Destination" placeholder="e.g. Amalfi Coast" />
        <Input label="Boat length (m)" hint="Overall length, not draft." />
        <Input label="Email" error="Enter a valid email address." defaultValue="not-an-email" />
        <Input label="Disabled field" disabled defaultValue="Read only" />
      </Section>

      <Section title="Select">
        <Select
          label="Water body"
          options={[
            { value: 'sea', label: 'Sea' },
            { value: 'lake', label: 'Lake' },
            { value: 'river', label: 'River & canal' },
          ]}
        />
        <Select
          label="Water body (error)"
          error="Choose a water body."
          options={[{ value: '', label: 'Select…' }]}
        />
        <Select label="Water body (disabled)" disabled options={[{ value: 'sea', label: 'Sea' }]} />
      </Section>

      <Section title="Card">
        <Card className="w-64">Static card</Card>
        <Card interactive className="w-64">
          Interactive card (hover/focus for shadow)
        </Card>
      </Section>

      <Section title="Badge">
        <Badge tone="neutral">Neutral</Badge>
        <Badge tone="success">Verified access</Badge>
        <Badge tone="warning">Pending review</Badge>
        <Badge tone="danger">Expired</Badge>
        <Badge tone="sample">Sample</Badge>
      </Section>

      <Section title="OffMarketInvite">
        <OffMarketInvite
          className="w-full"
          label="Held off-market"
          message="41 properties are held off-market."
          ctaLabel="Create an account to view them."
          href="/join"
        />
      </Section>

      <Section title="SaveButton">
        <SaveButton
          saved={saved}
          saveLabel="Save this property"
          savedLabel="Saved — remove from your list"
          onToggle={() => setSaved((s) => !s)}
        />
        <SaveButton
          saved
          saveLabel="Save this property"
          savedLabel="Saved — remove from your list"
          onToggle={() => undefined}
        />
        <SaveButton
          saved={false}
          disabled
          saveLabel="Save this property"
          savedLabel="Saved — remove from your list"
          onToggle={() => undefined}
        />
      </Section>

      <Section title="Modal">
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          Open modal
        </Button>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Confirm enquiry">
          <p className="text-sm text-graphite">
            This is the modal body. Escape, the backdrop, and the close button all dismiss it.
          </p>
        </Modal>
      </Section>

      <Section title="Tabs">
        <Tabs
          className="w-full"
          items={[
            { id: 'overview', label: 'Overview', content: <p className="text-sm">Overview panel.</p> },
            { id: 'water', label: 'Water credentials', content: <p className="text-sm">Water credentials panel.</p> },
            { id: 'nautical', label: 'Nautical', content: <p className="text-sm">Nautical panel.</p>, disabled: true },
          ]}
        />
      </Section>

      <Section title="Skeleton">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-24 w-40" />
        <Skeleton className="h-10 w-10 rounded-sm" />
      </Section>

      <Section title="Loading state">
        <LoadingState />
      </Section>

      <Section title="Error state">
        <ErrorState
          title="Couldn't load listings"
          description="Check your connection and try again."
          onRetry={() => undefined}
        />
      </Section>

      <Section title="AspectBox">
        <AspectBox ratio="card" className="w-40 bg-patina/20">
          <span className="absolute inset-0 flex items-center justify-center text-xs text-graphite">
            3:2 card
          </span>
        </AspectBox>
        <AspectBox ratio="gallery" className="w-40 bg-patina/20">
          <span className="absolute inset-0 flex items-center justify-center text-xs text-graphite">
            3:2 gallery
          </span>
        </AspectBox>
        <AspectBox ratio="editorial" className="w-40 bg-patina/20">
          <span className="absolute inset-0 flex items-center justify-center text-xs text-graphite">
            16:9 editorial
          </span>
        </AspectBox>
        <AspectBox ratio="heroMobile" className="w-40 bg-patina/20">
          <span className="absolute inset-0 flex items-center justify-center text-xs text-graphite">
            4:5 hero mobile
          </span>
        </AspectBox>
      </Section>
    </main>
  );
}
