import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ExecutiveReport, ExecutiveStats } from "../types";
import { pdfSafe } from "./pdfText";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#555", marginBottom: 16 },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#666",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 6,
  },
  statsRow: { flexDirection: "row", marginBottom: 4 },
  statBox: { flex: 1, borderWidth: 1, borderColor: "#eee", borderRadius: 4, padding: 10, marginRight: 8 },
  statValue: { fontSize: 18, fontWeight: 700 },
  statLabel: { fontSize: 8, color: "#777", marginTop: 2 },
  narrative: { fontSize: 11, lineHeight: 1.5 },
  takeaway: { fontSize: 10, marginBottom: 5, lineHeight: 1.4 },
  twoCol: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
  listRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  listLabel: { fontSize: 9, flex: 1 },
  listValue: { fontSize: 9, fontWeight: 700 },
  concernBox: {
    borderWidth: 1,
    borderColor: "#e5b3b3",
    backgroundColor: "#fdf0f0",
    borderRadius: 4,
    padding: 8,
    marginBottom: 4,
  },
  concernTitle: { fontSize: 9, fontWeight: 700, color: "#8a2c2c" },
  concernText: { fontSize: 8.5, color: "#8a2c2c", marginTop: 1 },
  table: { marginTop: 4 },
  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ccc", paddingBottom: 3, marginBottom: 3 },
  tableRow: { flexDirection: "row", paddingVertical: 2 },
  tableCellQuestion: { flex: 3, fontSize: 8.5 },
  tableCellNum: { flex: 1, fontSize: 8.5, textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 7.5,
    color: "#aaa",
    textAlign: "center",
  },
});

export function ExecutivePdfDocument({
  termLabel,
  stats,
  report,
}: {
  termLabel: string;
  stats: ExecutiveStats;
  report: ExecutiveReport | null;
}) {
  return (
    <Document title={`Executive Feedback Report - ${termLabel}`}>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>Executive Feedback Report</Text>
        <Text style={styles.subtitle}>{pdfSafe(termLabel)}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalResponses}</Text>
            <Text style={styles.statLabel}>Responses</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalTeachers}</Text>
            <Text style={styles.statLabel}>Teachers</Text>
          </View>
          <View style={{ ...styles.statBox, marginRight: 0 }}>
            <Text style={styles.statValue}>{stats.overallAverage.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Overall average / 5</Text>
          </View>
        </View>

        {report && (
          <>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.narrative}>{pdfSafe(report.narrative)}</Text>
            <View style={{ marginTop: 8 }}>
              {report.keyTakeaways.map((t, i) => (
                <Text key={i} style={styles.takeaway}>
                  • {pdfSafe(t)}
                </Text>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Category performance</Text>
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={{ fontSize: 8.5, fontWeight: 700, marginBottom: 3 }}>Top-performing</Text>
            {stats.topCategories.map((c) => (
              <View key={c.question} style={styles.listRow}>
                <Text style={styles.listLabel}>{pdfSafe(c.question)}</Text>
                <Text style={styles.listValue}>{c.average.toFixed(2)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.col}>
            <Text style={{ fontSize: 8.5, fontWeight: 700, marginBottom: 3 }}>Lowest-scoring</Text>
            {stats.bottomCategories.map((c) => (
              <View key={c.question} style={styles.listRow}>
                <Text style={styles.listLabel}>{pdfSafe(c.question)}</Text>
                <Text style={styles.listValue}>{c.average.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Teachers</Text>
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={{ fontSize: 8.5, fontWeight: 700, marginBottom: 3 }}>Top by average</Text>
            {stats.topTeachers.map((t) => (
              <View key={t.teacherName} style={styles.listRow}>
                <Text style={styles.listLabel}>{pdfSafe(t.teacherName)}</Text>
                <Text style={styles.listValue}>{t.overallAverage.toFixed(2)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.col}>
            <Text style={{ fontSize: 8.5, fontWeight: 700, marginBottom: 3 }}>Lowest by average</Text>
            {stats.bottomTeachers.map((t) => (
              <View key={t.teacherName} style={styles.listRow}>
                <Text style={styles.listLabel}>{pdfSafe(t.teacherName)}</Text>
                <Text style={styles.listValue}>{t.overallAverage.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </View>

        {stats.flaggedTeachers.length > 0 && (
          <View>
            <Text style={{ ...styles.sectionTitle, color: "#8a2c2c" }}>Flagged for attention</Text>
            {stats.flaggedTeachers.map((f) => (
              <View key={f.teacherName} style={styles.concernBox}>
                <Text style={styles.concernTitle}>
                  {pdfSafe(f.teacherName)} — avg {f.overallAverage.toFixed(2)}
                </Text>
                {f.reasons.map((r, i) => (
                  <Text key={i} style={styles.concernText}>
                    • {pdfSafe(r)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {stats.termComparison && (
          <View break>
            <Text style={styles.sectionTitle}>
              Term-over-term vs. {pdfSafe(stats.termComparison.previousTermLabel)}
            </Text>
            <Text style={{ fontSize: 10, marginBottom: 6 }}>
              Overall: {stats.termComparison.overallPrevious.toFixed(2)} to{" "}
              {stats.termComparison.overallCurrent.toFixed(2)} (
              {stats.termComparison.overallDelta >= 0 ? "+" : ""}
              {stats.termComparison.overallDelta.toFixed(2)})
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={{ ...styles.tableCellQuestion, fontWeight: 700 }}>Category</Text>
                <Text style={{ ...styles.tableCellNum, fontWeight: 700 }}>Prev</Text>
                <Text style={{ ...styles.tableCellNum, fontWeight: 700 }}>Current</Text>
                <Text style={{ ...styles.tableCellNum, fontWeight: 700 }}>Change</Text>
              </View>
              {stats.termComparison.categories.map((c) => (
                <View key={c.question} style={styles.tableRow}>
                  <Text style={styles.tableCellQuestion}>{pdfSafe(c.question)}</Text>
                  <Text style={styles.tableCellNum}>{c.previous?.toFixed(2) ?? "—"}</Text>
                  <Text style={styles.tableCellNum}>{c.current?.toFixed(2) ?? "—"}</Text>
                  <Text style={styles.tableCellNum}>
                    {c.delta !== null ? `${c.delta >= 0 ? "+" : ""}${c.delta.toFixed(2)}` : "—"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
