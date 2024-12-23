import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import type { FishingWindow } from "../triggers/weatherCheck";
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
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "16px",
  },
  windowCard: {
    padding: "16px",
    marginBottom: "16px",
    borderRadius: "8px",
    backgroundColor: "#f8f9fa",
    border: "1px solid #dee2e6",
  },
  dateTime: {
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "8px",
  },
  measurement: {
    marginBottom: "4px",
  },
  statusBadge: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "bold",
    display: "inline-block",
    marginLeft: "8px",
  },
  pass: {
    backgroundColor: "#d4edda",
    color: "#155724",
  },
  partial: {
    backgroundColor: "#fff3cd",
    color: "#856404",
  },
  fail: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
  },
  noData: {
    textAlign: "center" as const,
    padding: "24px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    color: "#6c757d",
  },
  footer: {
    color: "#666",
    fontSize: "12px",
    marginTop: "24px",
  },
};

interface Props {
  windows: FishingWindow[];
}

const getStatusBadge = (status: "pass" | "partial" | "fail") => ({
  ...styles.statusBadge,
  ...(status === "pass"
    ? styles.pass
    : status === "partial"
      ? styles.partial
      : styles.fail),
});

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

export default function FishingReport({ windows }: Props) {
  const passed = windows.filter((w) => w.overallScore === 100);
  const partial = windows.filter(
    (w) => w.overallScore >= 50 && w.overallScore < 100
  );
  const failed = windows.filter((w) => w.overallScore < 50);

  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "system-ui" }}>
        <Container style={styles.container}>
          <Text style={styles.title}>Fishing Conditions Report</Text>
          <Text style={styles.subtitle}>
            Here's your latest fishing conditions report for Norah Head
          </Text>

          <Section>
            <Text style={styles.sectionTitle}>✅ Optimal Conditions</Text>
            {passed.length > 0 ? (
              passed.map((window) => (
                <Section
                  key={window.date + window.lowTide.value.time}
                  style={styles.windowCard}
                >
                  <Text style={styles.dateTime}>
                    {formatDate(window.date)} at{" "}
                    {formatTime(window.lowTide.value.time)}
                  </Text>
                  <Text style={styles.measurement}>
                    Tide: {window.lowTide.value.height}m
                  </Text>
                  <Text style={styles.measurement}>
                    Swell: {window.swell.height.value}m{" "}
                    {window.swell.period.value}s {window.swell.direction.value}
                  </Text>
                  <Text style={styles.measurement}>
                    Daylight:{" "}
                    {window.daylight.afterSunrise.value.hours.toFixed(1)}hrs
                    after sunrise,{" "}
                    {window.daylight.beforeSunset.value.hours.toFixed(1)}hrs
                    before sunset
                  </Text>
                  <Text style={styles.measurement}>
                    Weather: {window.weather}
                  </Text>
                </Section>
              ))
            ) : (
              <Text style={styles.noData}>
                No optimal fishing windows found for this period
              </Text>
            )}
          </Section>

          <Hr />

          <Section>
            <Text style={styles.sectionTitle}>⚠️ Partial Conditions</Text>
            {partial.length > 0 ? (
              partial.map((window) => (
                <Section
                  key={window.date + window.lowTide.value.time}
                  style={styles.windowCard}
                >
                  <Text style={styles.dateTime}>
                    {formatDate(window.date)} at{" "}
                    {formatTime(window.lowTide.value.time)}
                    <span style={styles.statusBadge}>
                      {window.overallScore.toFixed(1)}%
                    </span>
                  </Text>
                  <Text style={styles.measurement}>
                    Tide: {window.lowTide.value.height}m
                    <span
                      style={getStatusBadge(window.lowTide.condition.passed)}
                    >
                      {window.lowTide.condition.passed}
                    </span>
                  </Text>
                  <Text style={styles.measurement}>
                    Swell Height: {window.swell.height.value}m
                    <span
                      style={getStatusBadge(
                        window.swell.height.condition.passed
                      )}
                    >
                      {window.swell.height.condition.passed}
                    </span>
                  </Text>
                  <Text style={styles.measurement}>
                    Swell Period: {window.swell.period.value}s
                    <span
                      style={getStatusBadge(
                        window.swell.period.condition.passed
                      )}
                    >
                      {window.swell.period.condition.passed}
                    </span>
                  </Text>
                  <Text style={styles.measurement}>
                    Swell Direction: {window.swell.direction.value}
                    <span
                      style={getStatusBadge(
                        window.swell.direction.condition.passed
                      )}
                    >
                      {window.swell.direction.condition.passed}
                    </span>
                  </Text>
                  <Text style={styles.measurement}>
                    After Sunrise:{" "}
                    {window.daylight.afterSunrise.value.hours.toFixed(1)}hrs
                    <span
                      style={getStatusBadge(
                        window.daylight.afterSunrise.condition.passed
                      )}
                    >
                      {window.daylight.afterSunrise.condition.passed}
                    </span>
                  </Text>
                  <Text style={styles.measurement}>
                    Before Sunset:{" "}
                    {window.daylight.beforeSunset.value.hours.toFixed(1)}hrs
                    <span
                      style={getStatusBadge(
                        window.daylight.beforeSunset.condition.passed
                      )}
                    >
                      {window.daylight.beforeSunset.condition.passed}
                    </span>
                  </Text>
                </Section>
              ))
            ) : (
              <Text style={styles.noData}>
                No partial matches found for this period
              </Text>
            )}
          </Section>

          <Hr />

          <Section>
            <Text style={styles.sectionTitle}>❌ Unsuitable Conditions</Text>
            {failed.length > 0 ? (
              failed.map((window) => (
                <Section
                  key={window.date + window.lowTide.value.time}
                  style={styles.windowCard}
                >
                  <Text style={styles.dateTime}>
                    {formatDate(window.date)} at{" "}
                    {formatTime(window.lowTide.value.time)}
                    <span style={styles.statusBadge}>
                      {window.overallScore.toFixed(1)}%
                    </span>
                  </Text>
                  {window.lowTide.condition.passed === "fail" && (
                    <Text style={styles.measurement}>
                      <span style={styles.fail}>
                        Tide: {window.lowTide.value.height}m
                      </span>
                    </Text>
                  )}
                  {window.swell.height.condition.passed === "fail" && (
                    <Text style={styles.measurement}>
                      <span style={styles.fail}>
                        Swell Height: {window.swell.height.value}m
                      </span>
                    </Text>
                  )}
                  {window.swell.period.condition.passed === "fail" && (
                    <Text style={styles.measurement}>
                      <span style={styles.fail}>
                        Swell Period: {window.swell.period.value}s
                      </span>
                    </Text>
                  )}
                  {window.swell.direction.condition.passed === "fail" && (
                    <Text style={styles.measurement}>
                      <span style={styles.fail}>
                        Swell Direction: {window.swell.direction.value}
                      </span>
                    </Text>
                  )}
                  {window.daylight.afterSunrise.condition.passed === "fail" && (
                    <Text style={styles.measurement}>
                      <span style={styles.fail}>
                        Before Sunrise:{" "}
                        {window.daylight.afterSunrise.value.hours.toFixed(1)}hrs
                      </span>
                    </Text>
                  )}
                  {window.daylight.beforeSunset.condition.passed === "fail" && (
                    <Text style={styles.measurement}>
                      <span style={styles.fail}>
                        After Sunset:{" "}
                        {window.daylight.beforeSunset.value.hours.toFixed(1)}hrs
                      </span>
                    </Text>
                  )}
                </Section>
              ))
            ) : (
              <Text style={styles.noData}>
                No unsuitable conditions found for this period
              </Text>
            )}
          </Section>

          <Text style={styles.footer}>
            Generated at {new Date().toLocaleString()}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
