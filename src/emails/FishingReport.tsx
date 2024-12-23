import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
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
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "12px",
  },
  th: {
    backgroundColor: "#f8f9fa",
    padding: "8px",
    textAlign: "left" as const,
    borderBottom: "2px solid #dee2e6",
    whiteSpace: "nowrap" as const,
  },
  td: {
    padding: "8px",
    borderBottom: "1px solid #dee2e6",
    whiteSpace: "nowrap" as const,
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

const getStatusEmoji = (status: "pass" | "partial" | "fail") =>
  status === "pass" ? "✅" : status === "partial" ? "⚠️" : "❌";

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

const formatDaylightHours = (hours: number) => {
  const absHours = Math.abs(hours);
  return `${absHours.toFixed(1)}h`;
};

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

const weatherEmojis: Record<string, string> = {
  fine: "☀️",
  "mostly-fine": "🌤️",
  "high-cloud": "⛅",
  "partly-cloudy": "⛅",
  "mostly-cloudy": "🌥️",
  cloudy: "☁️",
  overcast: "☁️",
  "shower-or-two": "🌦️",
  "chance-shower-fine": "🌦️",
  "chance-shower-cloud": "🌧️",
  drizzle: "🌧️",
  "few-showers": "🌧️",
  "showers-rain": "🌧️",
  "heavy-showers-rain": "⛈️",
  "chance-thunderstorm-fine": "⛈️",
  "chance-thunderstorm-cloud": "⛈️",
  "chance-thunderstorm-showers": "⛈️",
  thunderstorm: "🌩️",
  "chance-snow-fine": "🌨️",
  "chance-snow-cloud": "🌨️",
  "snow-and-rain": "🌨️",
  "light-snow": "🌨️",
  snow: "❄️",
  "heavy-snow": "❄️",
  wind: "💨",
  frost: "❄️",
  fog: "🌫️",
  hail: "🌨️",
  dust: "💨",
};

export default function FishingReport({ windows }: Props) {
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

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Time</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Tide</th>
                <th style={styles.th}>Height</th>
                <th style={styles.th}>Period</th>
                <th style={styles.th}>Dir</th>
                <th style={styles.th}>Sunrise</th>
                <th style={styles.th}>Sunset</th>
                <th style={styles.th}>Weather</th>
              </tr>
            </thead>
            <tbody>
              {windows.map((window) => (
                <tr key={`${window.date}-${window.lowTide.value.time}`}>
                  <td style={styles.td}>{formatDate(window.date)}</td>
                  <td style={styles.td}>
                    {formatTime(window.lowTide.value.time)}
                  </td>
                  <td style={styles.td}>
                    {getStatusEmoji(
                      window.overallScore === 100
                        ? "pass"
                        : window.overallScore >= 50
                          ? "partial"
                          : "fail"
                    )}{" "}
                    {window.overallScore.toFixed(0)}%
                  </td>
                  <td style={styles.td}>
                    {getStatusEmoji(window.lowTide.condition.passed)}{" "}
                    {window.lowTide.value.height}m
                  </td>
                  <td style={styles.td}>
                    {getStatusEmoji(window.swell.height.condition.passed)}{" "}
                    {window.swell.height.value}m
                  </td>
                  <td style={styles.td}>
                    {getStatusEmoji(window.swell.period.condition.passed)}{" "}
                    {window.swell.period.value}s
                  </td>
                  <td style={styles.td}>
                    {getStatusEmoji(window.swell.direction.condition.passed)}{" "}
                    {window.swell.direction.value}
                  </td>
                  <td style={styles.td}>
                    {getStatusEmoji(
                      window.daylight.afterSunrise.condition.passed
                    )}{" "}
                    {formatDaylightHours(
                      window.daylight.afterSunrise.value.hours
                    )}
                  </td>
                  <td style={styles.td}>
                    {getStatusEmoji(
                      window.daylight.beforeSunset.condition.passed
                    )}{" "}
                    {formatDaylightHours(
                      window.daylight.beforeSunset.value.hours
                    )}
                  </td>
                  <td style={styles.td}>
                    {getStatusEmoji(window.weather.condition.passed)}{" "}
                    {weatherEmojis[window.weather.condition.value as string] ||
                      "❓"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Text style={styles.footer}>
            Generated at {new Date().toLocaleString()}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
