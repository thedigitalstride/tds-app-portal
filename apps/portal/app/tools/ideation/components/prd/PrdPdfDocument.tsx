import React from 'react';
import { Document, Page, Text, View, StyleSheet, Svg, Path, Polygon } from '@react-pdf/renderer';
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
    marginBottom: 12,
    lineHeight: 1.3,
  },
  coverSummary: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 1.6,
    marginBottom: 20,
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
    marginBottom: 24,
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

function TDSLogoPdf({ height = 42 }: { height?: number }) {
  const width = height * (1250.47 / 476.91);
  const textFill = '#031a43';
  return (
    <Svg viewBox="0 0 1250.47 476.91" style={{ width, height }}>
      {/* "THE" */}
      <Path fill={textFill} d="M481.95,12.61h-30.5V0h74.49v12.61h-30.5v88.57h-13.49V12.61Z" />
      <Path fill={textFill} d="M547.92,0h13.49v43.99h56.31V0h13.49v101.18h-13.49v-44.58h-56.31v44.58h-13.49V0Z" />
      <Path fill={textFill} d="M653.2,0h64.82v12.61h-51.33v31.38h46.48v12.61h-46.48v31.97h52.06v12.61h-65.55V0Z" />
      {/* "DIGITAL" */}
      <Path fill={textFill} d="M458.9,148.92h54.76c40.46,0,70.87,29.79,70.87,69.45s-30.41,69.46-70.87,69.46h-54.76v-138.91ZM490.1,178.32v80.13h22.75c22.75,0,39.66-17.32,39.66-40.07s-16.91-40.06-39.66-40.06h-22.75Z" />
      <Path fill={textFill} d="M609.47,148.92h31.2v138.91h-31.2v-138.91Z" />
      <Path fill={textFill} d="M667.55,218.38c0-40.87,31.6-71.87,73.48-71.87,33.22,0,60.8,19.53,68.25,46.91h-34.83c-6.84-10.27-18.93-16.91-33.42-16.91-23.55,0-41.48,17.92-41.48,41.88s17.92,41.88,41.48,41.88c17.51,0,32.01-9.46,37.45-23.75h-33.22v-28.19h67.25v10.67c0,40.66-30,71.27-71.47,71.27s-73.48-31.01-73.48-71.88Z" />
      <Path fill={textFill} d="M842.15,148.92h31.2v138.91h-31.2v-138.91Z" />
      <Path fill={textFill} d="M938.37,178.32h-36.44v-29.39h104.09v29.39h-36.44v109.52h-31.21v-109.52Z" />
      <Path fill={textFill} d="M1051.66,148.92h36.84l52.34,138.91h-34.22l-8.46-24.36h-56.57l-8.66,24.36h-33.42l52.15-138.91ZM1087.89,234.69l-18.12-51.33-18.11,51.33h36.23Z" />
      <Path fill={textFill} d="M1163.29,148.92h31.2v109.52h55.97v29.39h-87.17v-138.91Z" />
      {/* "STRIDE" */}
      <Path fill={textFill} d="M451.85,432.82h32.02c0,9.06,9.46,16.31,21.34,16.31,10.67,0,19.53-5.64,19.53-13.49,0-21.74-70.67-12.28-70.67-59.39,0-26.18,21.95-43.09,49.93-43.09s50.73,18.12,50.73,42.28h-32.02c0-8.25-8.25-14.49-18.92-14.49-9.67,0-17.72,4.83-17.72,12.68,0,21.95,70.66,10.07,70.66,58.38,0,27.18-22.75,44.9-51.94,44.9s-52.95-19.33-52.95-44.09Z" />
      <Path fill={textFill} d="M609.47,364.97h-36.44v-29.39h104.09v29.39h-36.44v109.52h-31.21v-109.52Z" />
      <Path fill={textFill} d="M703.47,335.58h62.61c27.58,0,48.32,19.93,48.32,46.5,0,19.53-11.47,35.03-28.79,41.67l33.02,50.73h-38.65l-29.19-47.51h-16.11v47.51h-31.2v-138.91ZM734.67,364.97v34.83h30.81c9.66,0,16.91-7.45,16.91-17.32s-7.25-17.51-16.91-17.51h-30.81Z" />
      <Path fill={textFill} d="M842.15,335.58h31.2v138.91h-31.2v-138.91Z" />
      <Path fill={textFill} d="M903.99,335.58h54.76c40.46,0,70.87,29.79,70.87,69.45s-30.41,69.46-70.87,69.46h-54.76v-138.91ZM935.19,364.97v80.13h22.75c22.75,0,39.66-17.31,39.66-40.07s-16.91-40.06-39.66-40.06h-22.75Z" />
      <Path fill={textFill} d="M1057.58,335.58h92.2v29.39h-61v24.97h54.36v29.39h-54.36v25.77h62.01v29.39h-93.21v-138.91Z" />
      {/* Blue chevrons */}
      <Polygon fill="#1689ff" points="324.76 252.39 196.6 474.36 248.63 474.36 376.78 252.39 324.76 252.39" />
      <Polygon fill="#1689ff" points="239.29 252.39 111.14 474.36 163.16 474.36 291.32 252.39 239.29 252.39" />
      <Polygon fill="#1689ff" points="153.83 252.39 25.67 474.36 77.7 474.36 205.86 252.39 153.83 252.39" />
      <Polygon fill="#1689ff" points="299.08 0 170.93 221.97 222.95 221.97 351.11 0 299.08 0" />
      <Polygon fill="#1689ff" points="213.62 0 85.46 221.97 137.49 221.97 265.65 0 213.62 0" />
      <Polygon fill="#1689ff" points="128.16 0 0 221.97 52.03 221.97 180.18 0 128.16 0" />
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
        <View style={{ marginBottom: 16 }}>
          <TDSLogoPdf height={42} />
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
