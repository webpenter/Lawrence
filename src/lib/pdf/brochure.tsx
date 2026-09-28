import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import * as React from 'react';

import { humanizeEnum } from '@/components/property/WaterChips';
import { brand } from '@/config/brand';
import type { Property } from '@/payload-types';
import { tokens } from '@/tokens/tokens';

import type { BrochureLabels } from './labels';

/**
 * §22 Prompt 15A: localised A4 brochure. Every colour and the type scale come
 * from /src/tokens — changing tokens.ts restyles the PDF along with the site
 * (§9.2 acceptance). Display face maps to Times-Roman and body to Helvetica
 * (the PDF-native stand-ins) until the self-hosted WOFF ladder is registered;
 * see DECISIONS.md.
 */

const pt = (rem: string): number => Math.round(parseFloat(rem) * 12 * 10) / 10;

const styles = StyleSheet.create({
  page: {
    backgroundColor: tokens.color.bone,
    color: tokens.color.ink,
    fontFamily: 'Helvetica',
    fontSize: pt(tokens.size.xs),
    padding: 36,
  },
  wordmark: {
    fontFamily: 'Times-Roman',
    fontSize: pt(tokens.size.base),
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: tokens.color.obsidian,
  },
  cover: {
    height: 240,
    marginTop: 12,
    backgroundColor: tokens.color.obsidian,
    position: 'relative',
    overflow: 'hidden',
  },
  coverImage: { width: '100%', height: '100%', objectFit: 'cover' },
  horizon: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '46%',
    height: 1,
    backgroundColor: tokens.color.patinaSoft,
  },
  sampleBanner: {
    backgroundColor: tokens.color.patinaSoft,
    color: tokens.color.obsidian,
    padding: 6,
    fontSize: pt(tokens.size.xs) - 2,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.line,
  },
  title: {
    fontFamily: 'Times-Roman',
    fontSize: pt(tokens.size.xl),
    color: tokens.color.ink,
    maxWidth: 360,
  },
  price: {
    fontFamily: 'Times-Roman',
    fontSize: pt(tokens.size.lg),
    color: tokens.color.ink,
  },
  locality: {
    marginTop: 4,
    fontSize: pt(tokens.size.xs) - 1,
    color: tokens.color.graphite,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  columns: { flexDirection: 'row', gap: 18, marginTop: 14 },
  column: { flex: 1 },
  sectionTitle: {
    fontFamily: 'Times-Roman',
    fontSize: pt(tokens.size.sm),
    marginBottom: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: tokens.color.ink,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.color.line,
  },
  rowLabel: { color: tokens.color.graphite },
  rowValue: { color: tokens.color.ink },
  nautical: {
    backgroundColor: tokens.color.obsidian,
    padding: 10,
    marginTop: 10,
  },
  nauticalTitle: {
    fontFamily: 'Times-Roman',
    fontSize: pt(tokens.size.sm),
    color: tokens.color.vellum,
    marginBottom: 6,
  },
  nauticalLabel: { color: tokens.color.patinaSoft },
  nauticalValue: { color: tokens.color.vellum },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  galleryCell: {
    width: '32%',
    height: 84,
    backgroundColor: tokens.color.patina,
    position: 'relative',
    overflow: 'hidden',
  },
  map: { height: 140, marginTop: 14 },
  agency: {
    marginTop: 14,
    padding: 10,
    backgroundColor: tokens.color.vellum,
    borderWidth: 1,
    borderColor: tokens.color.line,
  },
  agencyName: { fontFamily: 'Times-Roman', fontSize: pt(tokens.size.sm) },
  footer: {
    position: 'absolute',
    left: 36,
    right: 36,
    bottom: 20,
    fontSize: 6.5,
    color: tokens.color.graphite,
    borderTopWidth: 0.5,
    borderTopColor: tokens.color.line,
    paddingTop: 6,
  },
});

export interface BrochureProps {
  property: Property;
  labels: BrochureLabels;
  priceLabel: string;
  /** Absolute image URLs: [cover, ...gallery(≤6)]. Empty → placeholder blocks. */
  imageUrls: string[];
  mapUrl?: string | null;
}

function Row({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <View style={[styles.row, dark ? { borderBottomColor: tokens.color.patina } : {}]}>
      <Text style={dark ? styles.nauticalLabel : styles.rowLabel}>{label}</Text>
      <Text style={dark ? styles.nauticalValue : styles.rowValue}>{value}</Text>
    </View>
  );
}

export function BrochureDocument({ property, labels, priceLabel, imageUrls, mapUrl }: BrochureProps) {
  const [cover, ...gallery] = imageUrls;
  const locality = [property.location?.locality, property.location?.region, property.location?.country]
    .filter(Boolean)
    .join(' · ');

  const water: Array<[string, string]> = [];
  if (property.waterBodyType) water.push([labels.labelWaterBody, humanizeEnum(property.waterBodyType)]);
  if (property.waterAccessType?.length)
    water.push([labels.labelAccess, property.waterAccessType.map(humanizeEnum).join(' · ')]);
  if (property.waterFrontageM != null) water.push([labels.labelFrontage, `${property.waterFrontageM} m`]);
  if (property.distanceToWaterM != null)
    water.push([labels.labelDistanceToWater, `${property.distanceToWaterM} m`]);
  if (property.orientation) water.push([labels.labelOrientation, property.orientation]);

  const nautical: Array<[string, string]> = [];
  if (property.mooringType && property.mooringType !== 'none')
    nautical.push([labels.labelMooring, humanizeEnum(property.mooringType)]);
  if (property.maxBoatLoaM != null) nautical.push([labels.labelMaxBoatLength, `${property.maxBoatLoaM} m`]);
  if (property.waterDepthAtBerthM != null)
    nautical.push([labels.labelDepthAtBerth, `${property.waterDepthAtBerthM} m`]);
  if (property.navigableToOpenSea != null)
    nautical.push([labels.labelNavigableToOpenSea, property.navigableToOpenSea ? labels.yes : labels.no]);

  const facts: Array<[string, string]> = [];
  if (property.bedrooms != null) facts.push([labels.factBedrooms, String(property.bedrooms)]);
  if (property.bathrooms != null) facts.push([labels.factBathrooms, String(property.bathrooms)]);
  if (property.builtAreaSqm != null) facts.push([labels.factBuiltArea, `${property.builtAreaSqm} m²`]);
  if (property.plotAreaSqm != null) facts.push([labels.factPlotArea, `${property.plotAreaSqm} m²`]);
  if (property.yearBuilt != null) facts.push([labels.factYearBuilt, String(property.yearBuilt)]);
  if (property.reference) facts.push([labels.factReference, property.reference]);

  const agency = typeof property.agency === 'object' ? property.agency : null;

  return (
    <Document title={property.title} author={brand.name}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.wordmark}>{brand.name}</Text>
        {property.isSample ? <Text style={styles.sampleBanner}>{labels.sampleBadge}</Text> : null}

        <View style={styles.cover}>
          {cover ? (
            /* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */
            <Image style={styles.coverImage} src={cover} />
          ) : (
            <View style={styles.horizon} />
          )}
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>{property.title}</Text>
          <Text style={styles.price}>{priceLabel}</Text>
        </View>
        <Text style={styles.locality}>{locality}</Text>

        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>{labels.waterCredentialsTitle}</Text>
            {water.map(([label, value]) => (
              <Row key={label} label={label} value={value} />
            ))}
            {nautical.length > 0 ? (
              <View style={styles.nautical}>
                <Text style={styles.nauticalTitle}>{labels.nauticalTitle}</Text>
                {nautical.map(([label, value]) => (
                  <Row key={label} label={label} value={value} dark />
                ))}
              </View>
            ) : null}
          </View>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>{labels.keyFactsTitle}</Text>
            {facts.map(([label, value]) => (
              <Row key={label} label={label} value={value} />
            ))}
            {agency ? (
              <View style={styles.agency}>
                <Text style={styles.agencyName}>{agency.name}</Text>
                {agency.email ? <Text>{agency.email}</Text> : null}
                {agency.phone ? <Text>{agency.phone}</Text> : null}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.gallery}>
          {(gallery.length > 0 ? gallery.slice(0, 6) : Array.from({ length: 6 }, () => null)).map(
            (url, index) => (
              <View key={index} style={styles.galleryCell}>
                {url ? (
                  /* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */
                  <Image style={styles.coverImage} src={url} />
                ) : (
                  <View style={styles.horizon} />
                )}
              </View>
            ),
          )}
        </View>

        {mapUrl ? (
          /* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */
          <Image style={styles.map} src={mapUrl} />
        ) : null}

        <Text style={styles.footer}>
          {labels.disclaimer} — {brand.legalName} · {brand.domain}
        </Text>
      </Page>
    </Document>
  );
}
