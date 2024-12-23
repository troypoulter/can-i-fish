import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Preview,
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

const formatDateRange = (windows: FishingWindow[]) => {
  const dates = windows.map((w) => new Date(w.date));
  const startDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const endDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  return {
    start: startDate.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }),
    end: endDate.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }),
  };
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
  const dateRange = formatDateRange(windows);

  const passingConditions = windows.filter(
    (window) => window.overallScore === 100
  ).length;
  const summaryText =
    passingConditions > 0
      ? `Good news Fiona! There ${passingConditions === 1 ? "is" : "are"} ${passingConditions} good fishing ${passingConditions === 1 ? "time" : "times"} coming up.`
      : "No ideal fishing conditions in this period Fiona.";

  return (
    <Html>
      <Head />
      <Preview>{summaryText}</Preview>
      <Body style={{ fontFamily: "system-ui" }}>
        <Container style={styles.container}>
          <Text style={styles.title}>
            Norah Head Fishing Conditions Report for {dateRange.start} -{" "}
            {dateRange.end}
          </Text>
          <Text style={styles.subtitle}>{summaryText}</Text>

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
        </Container>
      </Body>
    </Html>
  );
}
