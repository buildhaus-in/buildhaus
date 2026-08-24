import "server-only";
import * as React from "react";
import { Document, Page, View, Text, StyleSheet, Svg, Path } from "@react-pdf/renderer";
import { colors } from "@buildhaus/brand";
import { sqft, dateLabel } from "../format";

// NOTE: intentionally not reusing @buildhaus/utils' inr()/inrFull() here —
// those format with the "₹" glyph (U+20B9), which isn't in the WinAnsi
// encoding of PDF standard fonts like Helvetica. Rendered via
// @react-pdf/renderer without a bundled Unicode font, "₹" comes out as a
// broken/substitute glyph. Using "Rs." keeps the PDF readable without
// needing to embed a custom font just for one symbol.
function pdfInr(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return "Rs. 0";
  const v = Number(n);
  if (Math.abs(v) >= 10000000) return "Rs. " + (v / 10000000).toFixed(2) + " Cr";
  if (Math.abs(v) >= 100000) return "Rs. " + (v / 100000).toFixed(2) + " L";
  return "Rs. " + v.toLocaleString("en-IN");
}
function pdfInrFull(n: number | null | undefined): string {
  if (n == null) return "Rs. 0";
  return "Rs. " + Number(n).toLocaleString("en-IN");
}

// Deliberately NOT re-exported from ../../index.ts (the @buildhaus/utils
// barrel). @react-pdf/renderer pulls in Node-only internals (fs, stream,
// fontkit, ...) that have no business in a browser bundle, and per the
// project convention any "use client" component that imports the utils
// barrel must stay safe to ship to the client. Consumers reach this file via
// the package's separate "./pdf" export (see package.json) so a client
// component can still safely do `import { inr } from "@buildhaus/utils"`
// without ever touching this module.

export const QUOTATION_DISCLAIMER =
  "This quotation is an indicative estimate generated from the information provided by the customer. " +
  "Final pricing will be confirmed after site inspection, soil assessment, approved drawings, detailed " +
  "specifications, local market rates and BOQ preparation. This document is not a final construction agreement.";

export interface QuotationPdfCustomer {
  name: string;
  mobile: string;
  whatsapp?: string | null;
  email?: string | null;
  siteLocation: string;
  city?: string | null;
  state?: string | null;
}

export interface QuotationPdfBreakdownLine {
  label: string;
  percent: number;
  amount: number;
  optional?: boolean;
}

export interface QuotationPdfTimelineStage {
  name: string;
  months: number;
  startDate?: string | null;
  endDate?: string | null;
}

export interface QuotationPdfPaymentLine {
  milestone: string;
  percent: number;
  amount: number;
}

export interface QuotationPdfMaterial {
  name: string;
  spec: string;
}

export interface QuotationPdfData {
  quotationNo: string;
  status: string;
  generatedOn: string | null;
  validUntil: string | null;
  package: string | null;
  projectType: string | null;
  plotAreaSqft: number | null;
  builtupAreaSqft: number | null;
  floors: number | null;
  totalCost: number | null;
  costPerSqft: number | null;
  timelineLabel: string | null;
  customer: QuotationPdfCustomer;
  breakdown: QuotationPdfBreakdownLine[];
  timelineStages: QuotationPdfTimelineStage[];
  paymentSchedule: QuotationPdfPaymentLine[];
  inclusions: string[];
  exclusions: string[];
  assumptions: string[];
  materials: QuotationPdfMaterial[];
  terms?: string | null;
}

// All colors come from @buildhaus/brand (the light identity): navy headings
// and bands, vibrant orange accents, light grounds. `brandTint`/`navyTint`
// are the only local values — flat light tints of brand/sky used where a
// translucent overlay isn't possible in PDF.
const brandTint = "#FDEBE4"; // light ground for the highlighted stat card (brand orange at ~10%)
const skyTint = colors.skySoft;

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 44,
    paddingHorizontal: 40,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: colors.ink,
  },
  // Navy brand band — mark + wordmark left, quotation ref right.
  headerBand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { fontSize: 17, fontWeight: 700, color: "#FFFFFF", letterSpacing: 0.2 },
  brandTag: { fontSize: 6.5, letterSpacing: 1.5, color: colors.sky, marginTop: 2 },
  refLabel: { fontSize: 7, textTransform: "uppercase", letterSpacing: 1, color: colors.sky, textAlign: "right" },
  refValue: { fontSize: 13, fontWeight: 700, color: "#FFFFFF", textAlign: "right", marginTop: 2 },
  statusBadge: {
    marginTop: 4,
    alignSelf: "flex-end",
    fontSize: 7.5,
    fontWeight: 700,
    color: "#FFFFFF",
    backgroundColor: colors.brand,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 3,
    textTransform: "uppercase",
  },
  twoCol: { flexDirection: "row", gap: 20, marginBottom: 14 },
  col: { flex: 1 },
  sectionLabel: {
    fontSize: 7.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.muted,
    marginBottom: 4,
  },
  lineText: { fontSize: 9.5, color: colors.ink, marginBottom: 2, lineHeight: 1.35 },
  statRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16, gap: 8 },
  statCard: {
    flexGrow: 1,
    minWidth: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
  },
  statCardBrand: { backgroundColor: brandTint, borderColor: colors.brand },
  statLabel: { fontSize: 6.5, textTransform: "uppercase", letterSpacing: 0.6, color: colors.muted },
  statValue: { fontSize: 10.5, fontWeight: 700, color: colors.navy, marginTop: 2 },
  statValueBrand: { color: colors.brand },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.navy,
    marginTop: 6,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.sky,
  },
  table: { marginBottom: 4 },
  tableHeadRow: { flexDirection: "row", paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: colors.navy },
  tableRow: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  tableTotalRow: { flexDirection: "row", paddingTop: 5, marginTop: 2 },
  th: { fontSize: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: colors.sand },
  td: { fontSize: 9, color: colors.ink },
  colLabel: { flex: 3 },
  colPercent: { flex: 1, textAlign: "right" },
  colAmount: { flex: 2, textAlign: "right" },
  colDates: { flex: 2, textAlign: "right" },
  totalLabel: { flex: 3, fontSize: 10, fontWeight: 700, color: colors.navy },
  totalAmount: { flex: 2, textAlign: "right", fontSize: 10, fontWeight: 700, color: colors.brand },
  paymentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  paymentCard: {
    flexGrow: 1,
    minWidth: 85,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 6,
    textAlign: "center",
    backgroundColor: "#FFFFFF",
  },
  paymentMilestone: { fontSize: 6.5, color: colors.muted },
  paymentPercent: { fontSize: 10, fontWeight: 700, color: colors.brand, marginTop: 1 },
  paymentAmount: { fontSize: 8, color: colors.ink, marginTop: 1 },
  bullet: { fontSize: 8.5, color: colors.ink, marginBottom: 2.5, lineHeight: 1.35 },
  bulletMuted: { fontSize: 8.5, color: colors.sand, marginBottom: 2.5, lineHeight: 1.35 },
  materialItem: { fontSize: 7.5, color: colors.sand, marginBottom: 2, width: "50%" },
  materialName: { color: colors.navy },
  disclaimer: {
    marginTop: 16,
    padding: 9,
    borderWidth: 1,
    borderColor: colors.sky,
    borderRadius: 4,
    backgroundColor: skyTint,
    fontSize: 7.5,
    lineHeight: 1.4,
    color: colors.sandLight,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: colors.muted,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
});

// The BuildHaus "B" monogram, drawn with react-pdf's Svg/Path primitives.
// The two path d-strings are the same geometry as packages/ui/src/logo.tsx
// (BrandMark) — keep them in sync if the mark ever changes.
function PdfBrandMark({ size = 22 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
      <Path d="M14 8 H61 A19.5 19.5 0 0 1 61 47 H49.5 L14 8 Z" fill={colors.brand} />
      <Path d="M14 92 L57 53 H63.5 A19.5 19.5 0 0 1 63.5 92 H14 Z" fill={colors.brand} />
    </Svg>
  );
}

function StatCard({ label, value, brand }: { label: string; value: string; brand?: boolean }) {
  return (
    <View style={brand ? [styles.statCard, styles.statCardBrand] : [styles.statCard]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={brand ? [styles.statValue, styles.statValueBrand] : [styles.statValue]}>{value}</Text>
    </View>
  );
}

export function QuotationDocument({ data }: { data: QuotationPdfData }) {
  const {
    quotationNo, status, generatedOn, validUntil, package: pkg, projectType,
    plotAreaSqft, builtupAreaSqft, floors, totalCost, costPerSqft, timelineLabel,
    customer, breakdown, timelineStages, paymentSchedule, inclusions, exclusions,
    assumptions, materials, terms,
  } = data;

  return (
    <Document title={`Buildhaus Quotation ${quotationNo}`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerBand}>
          <View style={styles.logoRow}>
            <PdfBrandMark />
            <View>
              <Text style={styles.brand}>Buildhaus</Text>
              <Text style={styles.brandTag}>CONSTRUCTION, END TO END · NELLORE, AP</Text>
            </View>
          </View>
          <View>
            <Text style={styles.refLabel}>Quotation Ref</Text>
            <Text style={styles.refValue}>{quotationNo}</Text>
            <Text style={styles.statusBadge}>{status}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Customer</Text>
            <Text style={styles.lineText}>{customer.name}</Text>
            <Text style={styles.lineText}>
              {customer.mobile}
              {customer.whatsapp && customer.whatsapp !== customer.mobile ? `  ·  WhatsApp: ${customer.whatsapp}` : ""}
            </Text>
            {customer.email ? <Text style={styles.lineText}>{customer.email}</Text> : null}
            <Text style={styles.lineText}>
              {customer.siteLocation}
              {customer.city ? `, ${customer.city}` : ""}
              {customer.state ? `, ${customer.state}` : ""}
            </Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Quotation details</Text>
            <Text style={styles.lineText}>Generated: {dateLabel(generatedOn)}</Text>
            <Text style={styles.lineText}>Valid until: {dateLabel(validUntil)}</Text>
            <Text style={styles.lineText}>Package: {pkg ? pkg.replace(/_/g, " ") : "—"}</Text>
            <Text style={styles.lineText}>Building type: {projectType ?? "—"}</Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <StatCard label="Built-up area" value={sqft(builtupAreaSqft)} />
          {plotAreaSqft ? <StatCard label="Plot area" value={sqft(plotAreaSqft)} /> : null}
          {floors ? <StatCard label="Floors" value={String(floors)} /> : null}
          <StatCard label="Total indicative cost" value={pdfInr(totalCost)} brand />
          <StatCard label="Cost / sqft" value={`Rs. ${Number(costPerSqft ?? 0).toLocaleString("en-IN")}`} />
          <StatCard label="Approx. duration" value={timelineLabel ?? "—"} />
        </View>

        <Text style={styles.sectionTitle}>Cost breakdown</Text>
        <View style={styles.table}>
          <View style={styles.tableHeadRow}>
            <Text style={[styles.th, styles.colLabel]}>Component</Text>
            <Text style={[styles.th, styles.colPercent]}>Share</Text>
            <Text style={[styles.th, styles.colAmount]}>Amount</Text>
          </View>
          {breakdown.map((b, i) => (
            <View style={styles.tableRow} key={`${b.label}-${i}`}>
              <Text style={[styles.td, styles.colLabel]}>{b.label}{b.optional ? " (optional)" : ""}</Text>
              <Text style={[styles.td, styles.colPercent]}>{b.optional ? "+" : ""}{b.percent}%</Text>
              <Text style={[styles.td, styles.colAmount]}>{pdfInrFull(b.amount)}</Text>
            </View>
          ))}
          <View style={styles.tableTotalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <View style={styles.colPercent} />
            <Text style={styles.totalAmount}>{pdfInrFull(totalCost)}</Text>
          </View>
        </View>

        {timelineStages.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Stage-wise indicative timeline</Text>
            <View style={styles.table}>
              <View style={styles.tableHeadRow}>
                <Text style={[styles.th, styles.colLabel]}>Stage</Text>
                <Text style={[styles.th, styles.colPercent]}>Duration</Text>
                <Text style={[styles.th, styles.colDates]}>Approx window</Text>
              </View>
              {timelineStages.map((t, i) => (
                <View style={styles.tableRow} key={`${t.name}-${i}`}>
                  <Text style={[styles.td, styles.colLabel]}>{t.name}</Text>
                  <Text style={[styles.td, styles.colPercent]}>{t.months} mo</Text>
                  <Text style={[styles.td, styles.colDates]}>
                    {t.startDate ? dateLabel(t.startDate) : "—"} - {t.endDate ? dateLabel(t.endDate) : "—"}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {paymentSchedule.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Suggested payment schedule</Text>
            <View style={styles.paymentGrid}>
              {paymentSchedule.map((p, i) => (
                <View style={styles.paymentCard} key={`${p.milestone}-${i}`}>
                  <Text style={styles.paymentMilestone}>{p.milestone}</Text>
                  <Text style={styles.paymentPercent}>{p.percent}%</Text>
                  <Text style={styles.paymentAmount}>{pdfInr(p.amount)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Inclusions</Text>
            {inclusions.map((i, idx) => <Text style={styles.bullet} key={idx}>+ {i}</Text>)}
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Exclusions</Text>
            {exclusions.map((e, idx) => <Text style={styles.bulletMuted} key={idx}>- {e}</Text>)}
          </View>
        </View>

        {materials.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Material specification highlights</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {materials.map((m, i) => (
                <Text style={styles.materialItem} key={`${m.name}-${i}`}>
                  <Text style={styles.materialName}>{m.name}</Text> - {m.spec}
                </Text>
              ))}
            </View>
          </>
        )}

        {assumptions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Assumptions</Text>
            {assumptions.map((a, idx) => <Text style={styles.bulletMuted} key={idx}>* {a}</Text>)}
          </>
        )}

        {terms ? (
          <>
            <Text style={styles.sectionTitle}>Terms</Text>
            <Text style={styles.bulletMuted}>{terms}</Text>
          </>
        ) : null}

        <Text style={styles.disclaimer}>{QUOTATION_DISCLAIMER}</Text>

        <View style={styles.footer} fixed>
          <Text>Buildhaus Constructions · Nellore, Andhra Pradesh</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
