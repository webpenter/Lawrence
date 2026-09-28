import { withPayload } from '@payloadcms/next/withPayload';
import withBundleAnalyzer from '@next/bundle-analyzer';
import createNextIntlPlugin from 'next-intl/plugin';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    // §16.1 mitigation (see DECISIONS.md): this codebase deliberately serves
    // photography via upload-time variant ladders (<img srcSet>), never
    // next/image — disabling the optimizer removes the /_next/image attack
    // surface (GHSA-2xp9-vwfh-vxw4 RCE, patched only beyond the pinned Next
    // 15.4 line). Re-enable with the Next 16 bump if next/image returns.
    unoptimized: true,
    // §12.2 rule 2: AVIF first, then WebP (takes effect when the optimizer
    // returns).
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudflare.com',
      },
      {
        protocol: 'https',
        hostname: 'images.lawrenceprivatecollection.com',
      },
    ],
  },
  async headers() {
    return [
      {
        // Immutable caching for hashed assets (§12.1)
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Listing detail: ISR 600s + edge stale-while-revalidate (§10.3, §12.1)
        source: '/:locale(en|it|fr|de|es|ru)/property/:slug',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Programmatic landing: ISR 3600s + edge stale-while-revalidate (§10.4, §12.1)
        source: '/:locale(en|it|fr|de|es|ru)/waterfront/:combo',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Destination hubs: ISR 900s (§10.4)
        source: '/:locale(en|it|fr|de|es|ru)/destinations/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=900, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Journal: ISR 3600s (§10.5)
        source: '/:locale(en|it|fr|de|es|ru)/journal/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
};

export default bundleAnalyzer(withNextIntl(withPayload(nextConfig)));
