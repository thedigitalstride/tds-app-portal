import React from 'react';
import { Document, Page, Text, View, StyleSheet, Svg, Polygon } from '@react-pdf/renderer';
import { markdownToPdfElements } from './markdown-to-pdf';
import { getSectionConfig } from './prd-section-config';
import type { IPrdData, IIdeaScoring, IdeaStatus } from '../types';

const styles = StyleSheet.create({
  page: {
    paddingTop: 60,
    paddingBottom: 60,
    paddingLeft: 50,
    paddingRight: 50,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#374151',
  },
  // Cover
  coverTag: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1A6B3C',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  coverTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
    lineHeight: 1.2,
  },
  coverSummary: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 1.6,
    marginBottom: 16,
  },
  coverMeta: {
    fontSize: 9,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  coverDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginTop: 20,
    marginBottom: 20,
  },
  // Scoring
  scoringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  scoringOverall: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoringOverallNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  scoringOverallLabel: {
    fontSize: 7,
    color: '#9CA3AF',
  },
  scoringDim: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  scoringDimLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  scoringDimScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  recommendBadge: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1A6B3C',
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  // Sections
  sectionContainer: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 6,
  },
  sectionNumber: {
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#9CA3AF',
  },
});

const RECOMMENDATION_PDF_LABELS: Record<string, string> = {
  'strong-go': 'Strong Go',
  go: 'Go',
  conditional: 'Conditional',
  reconsider: 'Reconsider',
  'no-go': 'No Go',
};

function TDSLogoPdf({ height = 28 }: { height?: number }) {
  const width = height * (377 / 475);
  return (
    <Svg viewBox="0 0 377 475" style={{ width, height }}>
      <Polygon points="324.76,252.39 196.6,474.36 248.63,474.36 376.78,252.39 324.76,252.39" fill="#1689ff" />
      <Polygon points="239.29,252.39 111.14,474.36 163.16,474.36 291.32,252.39 239.29,252.39" fill="#1689ff" />
      <Polygon points="153.83,252.39 25.67,474.36 77.7,474.36 205.86,252.39 153.83,252.39" fill="#1689ff" />
      <Polygon points="299.08,0 170.93,221.97 222.95,221.97 351.11,0 299.08,0" fill="#1689ff" />
      <Polygon points="213.62,0 85.46,221.97 137.49,221.97 265.65,0 213.62,0" fill="#1689ff" />
      <Polygon points="128.16,0 0,221.97 52.03,221.97 180.18,0 128.16,0" fill="#1689ff" />
    </Svg>
  );
}

interface PrdPdfDocumentProps {
  prdData: IPrdData;
  ideaTitle: string;
  ideaStatus: IdeaStatus;
  scoring?: IIdeaScoring;
  updatedAt?: string;
}

export function PrdPdfDocument({ prdData, ideaTitle, ideaStatus, scoring, updatedAt }: PrdPdfDocumentProps) {
  const title = prdData.title || ideaTitle;
  const sections = prdData.sections || [];
  const dateFmt = { day: 'numeric', month: 'long', year: 'numeric' } as const;
  const dateStr = prdData.generatedAt
    ? new Date(prdData.generatedAt).toLocaleDateString('en-GB', dateFmt)
    : updatedAt
      ? new Date(updatedAt).toLocaleDateString('en-GB', dateFmt)
      : new Date().toLocaleDateString('en-GB', dateFmt);

  return (
    <Document title={`${title} - PRD`} author="TDS Ideation Tool">
      {/* Cover page */}
      <Page size="A4" style={styles.page}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <TDSLogoPdf height={28} />
          <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#031a43' }}>
            The Digital Stride
          </Text>
        </View>
        <Text style={styles.coverTag}>Product Requirements Document</Text>
        <Text style={styles.coverTitle}>{title}</Text>

        {prdData.summary && <Text style={styles.coverSummary}>{prdData.summary}</Text>}

        <Text style={styles.coverMeta}>Status: {ideaStatus}</Text>
        <Text style={styles.coverMeta}>Generated: {dateStr}</Text>

        {scoring && (
          <>
            <View style={styles.coverDivider} />
            <View style={styles.scoringRow}>
              <View style={styles.scoringOverall}>
                <Text style={styles.scoringOverallNumber}>{scoring.overall.score}</Text>
                <Text style={styles.scoringOverallLabel}>/10</Text>
              </View>
              <View style={styles.scoringDim}>
                <Text style={styles.scoringDimLabel}>Viability</Text>
                <Text style={styles.scoringDimScore}>{scoring.viability.score}</Text>
              </View>
              <View style={styles.scoringDim}>
                <Text style={styles.scoringDimLabel}>Uniqueness</Text>
                <Text style={styles.scoringDimScore}>{scoring.uniqueness.score}</Text>
              </View>
              <View style={styles.scoringDim}>
                <Text style={styles.scoringDimLabel}>Effort</Text>
                <Text style={styles.scoringDimScore}>{scoring.effort.score}</Text>
              </View>
            </View>
            <Text style={styles.recommendBadge}>
              {RECOMMENDATION_PDF_LABELS[scoring.overall.recommendation] || scoring.overall.recommendation}
            </Text>
          </>
        )}

        <View style={styles.coverDivider} />

        {/* Table of Contents */}
        {sections.length > 0 && (
          <View>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>Contents</Text>
            {sections.map((s, i) => (
              <Text key={i} style={{ fontSize: 9, color: '#4B5563', marginBottom: 3 }}>
                {i + 1}. {s.title}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text>Generated by TDS Ideation Tool</Text>
          <Text>{dateStr}</Text>
        </View>
      </Page>

      {/* Content pages */}
      {sections.length > 0 ? (
        <Page size="A4" style={styles.page} wrap>
          {sections.map((section, i) => {
            const config = getSectionConfig(section.title);
            return (
              <View key={i} style={styles.sectionContainer} wrap={false}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionNumber, { color: config.color }]}>
                    {i + 1}.
                  </Text>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
                {markdownToPdfElements(section.content)}
              </View>
            );
          })}
          <View style={styles.footer} fixed>
            <Text>Generated by TDS Ideation Tool</Text>
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
        </Page>
      ) : prdData.fullMarkdown ? (
        <Page size="A4" style={styles.page} wrap>
          {markdownToPdfElements(prdData.fullMarkdown)}
          <View style={styles.footer} fixed>
            <Text>Generated by TDS Ideation Tool</Text>
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
        </Page>
      ) : null}
    </Document>
  );
}
