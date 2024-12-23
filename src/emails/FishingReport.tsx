import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Row,
  Column,
} from "@react-email/components";
import type { FishingWindow } from "../triggers/weatherCheck";
import { FISHING_CONDITIONS } from "../triggers/weatherCheck";
import React from "react";

const styles = {
  container: {
    margin: "0 auto",
    padding: "20px 0 48px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "16px",
  },
  subtitle: {
    color: "#666",
    marginBottom: "24px",
  },
  header: {
    backgroundColor: "#f8f9fa",
    padding: "8px",
    fontSize: "12px",
    color: "#666",
    fontWeight: "bold",
  },
  row: {
    borderBottom: "1px solid #dee2e6",
    padding: "8px 0",
  },
  dateColumn: {
    width: "120px",
    padding: "8px",
    verticalAlign: "top",
  },
  conditionColumn: {
    padding: "8px",
    verticalAlign: "top",
  },
  score: {
    fontWeight: "bold",
    marginLeft: "4px",
  },
  footer: {
    color: "#666",
    fontSize: "12px",
    marginTop: "24px",
  },
  conditionLabel: {
    color: "#666",
    width: "80px",
    display: "inline-block",
  },
  conditionValue: {
    display: "inline-block",
    marginRight: "8px",
  },
};

interface Props {
  windows: FishingWindow[];
}

const getStatusEmoji = (status: "pass" | "partial" | "fail") =>
  status === "pass" ? "✅" : status === "partial" ? "⚠️" : "❌";

const getScoreEmoji = (score: number) =>
  score === 100 ? "✅" : score >= 50 ? "⚠️" : "❌";

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (timeStr: string) => {
  const time = new Date(timeStr);
  return time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const WindowCondition = ({
  label,
  value,
  status,
}: {
  label: string;
  value: string | number;
  status: "pass" | "partial" | "fail";
}) => (
  <Text style={{ fontSize: "12px", margin: "2px 0" }}>
    <span style={styles.conditionLabel}>{label}:</span>
    <span style={styles.conditionValue}>
      {getStatusEmoji(status)} {value}
    </span>
  </Text>
);

const ConditionsSummary = () => (
  <Section
    style={{
      marginBottom: "24px",
      backgroundColor: "#f8f9fa",
      padding: "16px",
      borderRadius: "8px",
    }}
  >
    <Text style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>
      🎣 Fishing Conditions Guide:
    </Text>
    <Text style={{ fontSize: "12px", margin: "4px 0" }}>
      • Tide: Optimal ≤{FISHING_CONDITIONS.TIDE.PASS_THRESHOLD}m, Acceptable ≤
      {FISHING_CONDITIONS.TIDE.PARTIAL_THRESHOLD}m
    </Text>
    <Text style={{ fontSize: "12px", margin: "4px 0" }}>
      • Swell Height: Optimal ≤{FISHING_CONDITIONS.SWELL.HEIGHT.PASS_THRESHOLD}
      m, Acceptable ≤{FISHING_CONDITIONS.SWELL.HEIGHT.PARTIAL_THRESHOLD}m
    </Text>
    <Text style={{ fontSize: "12px", margin: "4px 0" }}>
      • Swell Period: Optimal ≤{FISHING_CONDITIONS.SWELL.PERIOD.PASS_THRESHOLD}
      s, Acceptable ≤{FISHING_CONDITIONS.SWELL.PERIOD.PARTIAL_THRESHOLD}s
    </Text>
    <Text style={{ fontSize: "12px", margin: "4px 0" }}>
      • Swell Direction: Avoid {FISHING_CONDITIONS.SWELL.DIRECTION.FAIL},
      Caution with{" "}
      {FISHING_CONDITIONS.SWELL.DIRECTION.PARTIAL_FAIL.join(" or ")}
    </Text>
    <Text style={{ fontSize: "12px", margin: "4px 0" }}>
      • Daylight: Must be after sunrise and at least{" "}
      {FISHING_CONDITIONS.MIN_HOURS_BEFORE_SUNSET} hours before sunset
    </Text>
    <Text style={{ fontSize: "12px", margin: "4px 0" }}>
      • Weather: Best conditions are{" "}
      {FISHING_CONDITIONS.WEATHER.PASS.join(", ")}, Acceptable conditions are{" "}
      {FISHING_CONDITIONS.WEATHER.PARTIAL.join(", ")}
    </Text>
    <Text
      style={{ fontSize: "12px", margin: "8px 0 0 0", fontStyle: "italic" }}
    >
      ✅ Optimal • ⚠️ Acceptable • ❌ Unsuitable
    </Text>
  </Section>
);

const WindowsSummary = ({ windows }: { windows: FishingWindow[] }) => {
  const optimal = windows.filter((w) => w.overallScore === 100);
  const acceptable = windows.filter(
    (w) => w.overallScore >= 50 && w.overallScore < 100
  );
  const unsuitable = windows.filter((w) => w.overallScore < 50);

  return (
    <Section
      style={{
        marginBottom: "24px",
        backgroundColor: "#f0f8ff",
        padding: "16px",
        borderRadius: "8px",
      }}
    >
      <Text
        style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}
      >
        🎯 Quick Summary:
      </Text>
      <Text style={{ fontSize: "13px", margin: "4px 0" }}>
        ✅ {optimal.length} Optimal Periods
        {optimal.length > 0 && ":"}
      </Text>
      {optimal.length > 0 && (
        <Text
          style={{
            fontSize: "12px",
            margin: "4px 0 8px 16px",
            color: "#2d5a27",
          }}
        >
          {optimal
            .map(
              (w) =>
                `${formatDate(w.date)} at ${formatTime(w.lowTide.value.time)}`
            )
            .join("\n")}
        </Text>
      )}
      <Text style={{ fontSize: "13px", margin: "4px 0" }}>
        ⚠️ {acceptable.length} Acceptable Periods
      </Text>
      <Text style={{ fontSize: "13px", margin: "4px 0" }}>
        ❌ {unsuitable.length} Unsuitable Periods
      </Text>
    </Section>
  );
};

export default function FishingReport({ windows }: Props) {
  // Group windows by date
  const windowsByDate = windows.reduce(
    (acc, window) => {
      const date = window.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(window);
      return acc;
    },
    {} as Record<string, FishingWindow[]>
  );

  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "system-ui" }}>
        <Container style={styles.container}>
          <Text style={styles.title}>Fishing Conditions Report</Text>
          <Text style={styles.subtitle}>
            Here's your latest fishing conditions report for Norah Head
          </Text>

          <WindowsSummary windows={windows} />

          <ConditionsSummary />

          <Section>
            <Row style={styles.header}>
              <Column style={styles.dateColumn}>Date</Column>
              <Column style={styles.conditionColumn}>Low Tide Windows</Column>
            </Row>

            {Object.entries(windowsByDate).map(([date, dayWindows]) => (
              <Row key={date} style={styles.row}>
                <Column style={styles.dateColumn}>
                  <Text style={{ fontSize: "14px", fontWeight: "bold" }}>
                    {formatDate(date)}
                  </Text>
                </Column>
                <Column style={styles.conditionColumn}>
                  {dayWindows.map((window) => (
                    <Section
                      key={window.lowTide.value.time}
                      style={{ marginBottom: "16px" }}
                    >
                      <Text
                        style={{
                          fontSize: "13px",
                          fontWeight: "bold",
                          marginBottom: "6px",
                        }}
                      >
                        {getScoreEmoji(window.overallScore)}{" "}
                        {formatTime(window.lowTide.value.time)} -{" "}
                        <span style={styles.score}>
                          {window.overallScore.toFixed(0)}%
                        </span>
                      </Text>

                      <WindowCondition
                        label="Tide"
                        value={`${window.lowTide.value.height}m`}
                        status={window.lowTide.condition.passed}
                      />

                      <WindowCondition
                        label="Swell Height"
                        value={`${window.swell.height.value}m`}
                        status={window.swell.height.condition.passed}
                      />
                      <WindowCondition
                        label="Swell Period"
                        value={`${window.swell.period.value}s`}
                        status={window.swell.period.condition.passed}
                      />
                      <WindowCondition
                        label="Direction"
                        value={window.swell.direction.value}
                        status={window.swell.direction.condition.passed}
                      />

                      <WindowCondition
                        label="Sunrise"
                        value={`${window.daylight.afterSunrise.value.hours.toFixed(1)}hrs after`}
                        status={window.daylight.afterSunrise.condition.passed}
                      />
                      <WindowCondition
                        label="Sunset"
                        value={`${window.daylight.beforeSunset.value.hours.toFixed(1)}hrs before`}
                        status={window.daylight.beforeSunset.condition.passed}
                      />

                      <WindowCondition
                        label="Weather"
                        value={window.weather.value}
                        status={window.weather.condition.passed}
                      />
                    </Section>
                  ))}
                </Column>
              </Row>
            ))}
          </Section>

          <Text style={styles.footer}>
            Generated at {new Date().toLocaleString()}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
