import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import * as React from 'react';

import { humanizeEnum } from '@/lib/humanize';
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
  provenance: {
    backgroundColor: tokens.color.obsidian,
    padding: 10,
    marginTop: 10,
  },
  provenanceTitle: {
    fontFamily: 'Times-Roman',
    fontSize: pt(tokens.size.sm),
    color: tokens.color.vellum,
    marginBottom: 6,
  },
  provenanceText: { color: tokens.color.vellum, lineHeight: 1.5 },
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
  /** §3.2 provenance narrative as plain text, or null when absent. */
  provenance?: string | null;
  /** Absolute image URLs: [cover, ...gallery(≤6)]. Empty → placeholder blocks. */
  imageUrls: string[];
  mapUrl?: string | null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function BrochureDocument({
  property,
  labels,
  priceLabel,
  provenance,
  imageUrls,
  mapUrl,
}: BrochureProps) {
  const [cover, ...gallery] = imageUrls;
  const locality = [property.location?.locality, property.location?.region, property.location?.country]
    .filter(Boolean)
    .join(' · ');

  // §11.3 fact table — Lawrence facts only; unset fields never render.
  const facts: Array<[string, string]> = [];
  if (property.bedrooms != null) facts.push([labels.factBedrooms, String(property.bedrooms)]);
  if (property.bathrooms != null) facts.push([labels.factBathrooms, String(property.bathrooms)]);
  if (property.receptionRooms != null)
    facts.push([labels.factReceptions, String(property.receptionRooms)]);
  if (property.builtAreaSqm != null) facts.push([labels.factBuiltArea, `${property.builtAreaSqm} m²`]);
  if (property.plotAreaSqm != null) {
    const ha = property.plotAreaHa ?? Math.round((property.plotAreaSqm / 10_000) * 100) / 100;
    facts.push([labels.factPlotArea, ha >= 0.5 ? `${property.plotAreaSqm} m² (${ha} ha)` : `${property.plotAreaSqm} m²`]);
  }
  if (property.terraceAreaSqm != null)
    facts.push([labels.factTerrace, `${property.terraceAreaSqm} m²`]);
  if (property.yearBuilt != null) facts.push([labels.factYearBuilt, String(property.yearBuilt)]);
  if (property.renovatedYear != null)
    facts.push([labels.factRenovated, String(property.renovatedYear)]);
  if (property.condition) facts.push([labels.factCondition, humanizeEnum(property.condition)]);
  if (property.tenure) facts.push([labels.factTenure, humanizeEnum(property.tenure)]);
  if (property.heritageStatus && property.heritageStatus !== 'none')
    facts.push([labels.factHeritage, humanizeEnum(property.heritageStatus)]);
  if (property.architect) facts.push([labels.factArchitect, property.architect]);
  if (property.reference) facts.push([labels.factReference, property.reference]);

  const factsLeft = facts.slice(0, Math.ceil(facts.length / 2));
  const factsRight = facts.slice(Math.ceil(facts.length / 2));

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
            <Text style={styles.sectionTitle}>{labels.keyFactsTitle}</Text>
            {factsLeft.map(([label, value]) => (
              <Row key={label} label={label} value={value} />
            ))}
          </View>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}> </Text>
            {factsRight.map(([label, value]) => (
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

        {provenance ? (
          <View style={styles.provenance}>
            <Text style={styles.provenanceTitle}>{labels.provenanceTitle}</Text>
            <Text style={styles.provenanceText}>{provenance}</Text>
          </View>
        ) : null}

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
