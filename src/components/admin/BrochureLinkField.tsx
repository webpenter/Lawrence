/* eslint-disable waterlineI18n/no-literal-jsx-text -- Payload backoffice UI is English-only, like every admin.description string */
'use client';

import * as React from 'react';
import { useDocumentInfo, useFormFields } from '@payloadcms/ui';

/**
 * §22-11B admin action: one click from the property document to its
 * generated brochure (opens the API route; the PDF is rendered on demand).
 */
export function BrochureLinkField() {
  const { id } = useDocumentInfo();
  const slug = useFormFields(
    ([fields]: [Record<string, { value?: unknown }>, unknown]) =>
      fields?.slug?.value as string | undefined,
  );
  if (!id || !slug) return null;
  return (
    <a
      href={`/api/property/${slug}/brochure.pdf`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'inline-block', marginTop: 8, textDecoration: 'underline' }}
    >
      Generate brochure (PDF)
    </a>
  );
}

export default BrochureLinkField;
