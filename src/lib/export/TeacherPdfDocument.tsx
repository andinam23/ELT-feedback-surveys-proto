import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { CategoryStat, TeacherStats, TeacherSummary } from "../types";

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
  narrative: { fontSize: 11, lineHeight: 1.5 },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  categoryLabel: { width: 220, fontSize: 9 },
  barTrack: { flex: 1, height: 6, backgroundColor: "#eee", borderRadius: 3 },
  barFill: { height: 6, backgroundColor: "#111", borderRadius: 3 },
  categoryValue: { width: 70, fontSize: 9, textAlign: "right" },
  themeChip: {
    fontSize: 8,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 7,
    marginRight: 4,
    marginBottom: 4,
  },
  concernBox: {
    borderWidth: 1,
    borderColor: "#e5b3b3",
    backgroundColor: "#fdf0f0",
    borderRadius: 4,
    padding: 8,
    marginBottom: 4,
  },
  concernText: { fontSize: 9, color: "#8a2c2c", marginBottom: 2 },
  pdItem: { fontSize: 10, marginBottom: 6, lineHeight: 1.4 },
  commentItem: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 3,
    padding: 6,
    marginBottom: 4,
  },
  commentText: { fontSize: 9, marginBottom: 2 },
  commentMeta: { fontSize: 7.5, color: "#888" },
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

const SENTIMENT_COLOR: Record<string, { bg: string; fg: string }> = {
  positive: { bg: "#e3f5e6", fg: "#276a36" },
  negative: { bg: "#fbe4e4", fg: "#8a2c2c" },
  mixed: { bg: "#fdf1da", fg: "#8a5a12" },
};

export function TeacherPdfDocument({
  teacherName,
  termLabel,
  stats,
  summary,
  comments,
}: {
  teacherName: string;
  termLabel: string;
  stats: TeacherStats;
  summary: TeacherSummary | null;
  comments: { question: string; className: string; text: string }[];
}) {
  const maxAvg = Math.max(...stats.categories.map((c: CategoryStat) => c.average), 1);

  return (
    <Document title={`${teacherName} - Feedback Report - ${termLabel}`}>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>{teacherName}</Text>
        <Text style={styles.subtitle}>
          {termLabel} · {stats.responseCount} responses across {stats.classCount} class
          {stats.classCount === 1 ? "" : "es"} · overall avg {stats.overallAverage.toFixed(2)}/5
        </Text>

        <Text style={styles.sectionTitle}>Rating categories</Text>
        {stats.categories.map((c) => (
          <View key={c.question} style={styles.categoryRow}>
            <Text style={styles.categoryLabel}>{c.question}</Text>
            <View style={styles.barTrack}>
              <View style={{ ...styles.barFill, width: `${(c.average / maxAvg) * 100}%` }} />
            </View>
            <Text style={styles.categoryValue}>
              {c.average.toFixed(2)} (sd {c.stdDev.toFixed(2)})
            </Text>
          </View>
        ))}

        {summary && (
          <>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.narrative}>{summary.narrative}</Text>

            {summary.themes.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
                {summary.themes.map((t, i) => {
                  const c = SENTIMENT_COLOR[t.sentiment] ?? { bg: "#eee", fg: "#333" };
                  return (
                    <Text
                      key={i}
                      style={{ ...styles.themeChip, backgroundColor: c.bg, color: c.fg }}
                    >
                      {t.theme} ×{t.mentions}
                    </Text>
                  );
                })}
              </View>
            )}

            {summary.flaggedConcerns.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ ...styles.sectionTitle, marginTop: 0, color: "#8a2c2c" }}>
                  Flagged concerns
                </Text>
                {summary.flaggedConcerns.map((c, i) => (
                  <View key={i} style={styles.concernBox}>
                    <Text style={styles.concernText}>{c}</Text>
                  </View>
                ))}
              </View>
            )}

            {summary.pdActions.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Professional development suggestions</Text>
                {summary.pdActions.map((a, i) => (
                  <Text key={i} style={styles.pdItem}>
                    {i + 1}. {a}
                  </Text>
                ))}
              </View>
            )}
          </>
        )}

        {comments.length > 0 && (
          <View break>
            <Text style={styles.sectionTitle}>Student comments</Text>
            {comments.map((c, i) => (
              <View key={i} style={styles.commentItem}>
                <Text style={styles.commentText}>&ldquo;{c.text}&rdquo;</Text>
                <Text style={styles.commentMeta}>
                  {c.question} · {c.className}
                </Text>
              </View>
            ))}
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
