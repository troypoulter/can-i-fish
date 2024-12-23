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
import React from "react";

const styles = {
  container: {
    margin: "0 auto",
    padding: "20px 0 48px",
  },
  mainMessage: {
    fontSize: "20px",
    marginBottom: "24px",
    color: "#333",
  },
  funMessage: {
    fontSize: "20px",
    color: "#666",
    fontStyle: "italic",
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
  tdPass: {
    padding: "8px",
    borderBottom: "1px solid #dee2e6",
    whiteSpace: "nowrap" as const,
    backgroundColor: "#e6ffe6",
  },
  tdPartial: {
    padding: "8px",
    borderBottom: "1px solid #dee2e6",
    whiteSpace: "nowrap" as const,
    backgroundColor: "#fff3cd",
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
    }),
    end: endDate.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "numeric",
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

const passingPhrases = [
  "Time to dust off those fishing rods! 🎣",
  "Fish, here we come! 🏃‍♀️",
  "The fish are practically jumping into the boat! 🚣‍♀️",
  "Better call in sick tomorrow... 😉",
  "The fish are sending their RSVP! 📨",
  "Looks like fish is on the menu! 🍽️",
  "The stars have aligned for a perfect catch! ⭐",
  "Time to show those fish who's boss! 💪",
  "Get ready for some epic fish stories! 📚",
  "The fish are waiting for your invitation! 🎟️",
  "Hope you've got enough room in the freezer! ❄️",
  "The fish are having a party and you're invited! 🎉",
  "The fish are literally begging to be caught! 🙏",
  "Time to become a local fishing legend! 👑",
  "Your fishing rod is doing a happy dance! 💃",
  "The fish have been training for this moment! 🏋️‍♀️",
  "Your lucky fishing hat's time to shine! 🧢",
  "The fish are writing their farewell speeches! 📝",
  "Your tackle box is tingling with excitement! ✨",
  "The fish are practicing their poses for photos! 📸",
  "Time to make the other fishers jealous! 😎",
  "The fish are rolling out the red carpet! 🎯",
  "Your fishing skills are about to pay off! 💰",
  "The fish are setting personal records today! 🏆",
  "The bait is feeling extra attractive! 🪱",
  "The fish are planning their grand entrance! 🎭",
  "Your fishing line is ready for action! 🎬",
  "The fish are wearing their fancy scales! ✨",
  "Time to write a new chapter in your fishing diary! 📖",
  "The fish are practicing their surrender moves! 🏳️",
  "Your fishing spot has VIP access today! 🌟",
  "The fish are leaving their 'Gone Fishing' signs! 🎣",
];

const failingPhrases = [
  "The fish are on vacation today! 🏖️",
  "Time to practice your casting in the backyard instead! 🎯",
  "Netflix and chill might be a better option... 📺",
  "The fish are having a union meeting! 👔",
  "The fish are social distancing! 😷",
  "Even the seagulls are staying home! 🦅",
  "The fish are busy updating their Instagram! 📱",
  "Time to browse the fishing catalogue instead! 📖",
  "The fish are having a spa day! 💆‍♀️",
  "Looks like it's fish and chips from the shop today! 🍟",
  "The fish are attending a motivational seminar! 📢",
  "They're all at an underwater yoga retreat! 🧘‍♀️",
  "The fish are binge-watching Finding Nemo! 🎬",
  "They're practicing their synchronized swimming! 🏊‍♀️",
  "The fish are having a book club meeting! 📚",
  "They're all at an underwater music festival! 🎵",
  "The fish are taking a digital detox! 📵",
  "Time to update your fishing memes collection! 😂",
  "The fish are having their annual awards ceremony! 🏆",
  "They're attending a marine fashion show! 👗",
  "The fish are in witness protection today! 🕵️‍♀️",
  "They're filming their own reality TV show! 📺",
  "The fish are having a group therapy session! 🛋️",
  "They're all at an underwater comedy club! 🎭",
  "The fish are doing their taxes today! 📊",
  "They're having a underwater protest! ✊",
  "The fish are attending cooking classes! 👨‍🍳",
  "They're all at their high school reunion! 🎓",
  "The fish are having a mindfulness retreat! 🧘‍♂️",
];

export default function FishingReport({ windows }: Props) {
  const passingConditions = windows.filter(
    (window) => window.overallScore === 100
  ).length;

  const baseMessage =
    passingConditions > 0
      ? `😀 Great news Fiona & Josh! There ${passingConditions === 1 ? "is a" : "are"} ${passingConditions} good fishing ${passingConditions === 1 ? "time" : "times"} coming up.`
      : "😞 Bummer! No ideal fishing conditions this week Fiona & Josh, maybe next week!";

  const funPhrase =
    passingConditions > 0
      ? passingPhrases[Math.floor(Math.random() * passingPhrases.length)]
      : failingPhrases[Math.floor(Math.random() * failingPhrases.length)];

  return (
    <Html>
      <Head />
      <Preview>{baseMessage}</Preview>
      <Body style={{ fontFamily: "system-ui" }}>
        <Container style={styles.container}>
          <Text style={styles.mainMessage}>{baseMessage}</Text>
          <Text style={styles.funMessage}>{funPhrase}</Text>

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
              {windows.map((window) => {
                const rowStyle =
                  window.overallScore === 100
                    ? styles.tdPass
                    : window.overallScore >= 50
                      ? styles.tdPartial
                      : styles.td;

                return (
                  <tr key={`${window.date}-${window.lowTide.value.time}`}>
                    <td style={rowStyle}>{formatDate(window.date)}</td>
                    <td style={rowStyle}>
                      {formatTime(window.lowTide.value.time)}
                    </td>
                    <td style={rowStyle}>
                      {getStatusEmoji(
                        window.overallScore === 100
                          ? "pass"
                          : window.overallScore >= 50
                            ? "partial"
                            : "fail"
                      )}{" "}
                      {window.overallScore.toFixed(0)}%
                    </td>
                    <td style={rowStyle}>
                      {getStatusEmoji(window.lowTide.condition.passed)}{" "}
                      {window.lowTide.value.height}m
                    </td>
                    <td style={rowStyle}>
                      {getStatusEmoji(window.swell.height.condition.passed)}{" "}
                      {window.swell.height.value}m
                    </td>
                    <td style={rowStyle}>
                      {getStatusEmoji(window.swell.period.condition.passed)}{" "}
                      {window.swell.period.value}s
                    </td>
                    <td style={rowStyle}>
                      {getStatusEmoji(window.swell.direction.condition.passed)}{" "}
                      {window.swell.direction.value}
                    </td>
                    <td style={rowStyle}>
                      {getStatusEmoji(
                        window.daylight.afterSunrise.condition.passed
                      )}{" "}
                      {formatDaylightHours(
                        window.daylight.afterSunrise.value.hours
                      )}
                    </td>
                    <td style={rowStyle}>
                      {getStatusEmoji(
                        window.daylight.beforeSunset.condition.passed
                      )}{" "}
                      {formatDaylightHours(
                        window.daylight.beforeSunset.value.hours
                      )}
                    </td>
                    <td style={rowStyle}>
                      {getStatusEmoji(window.weather.condition.passed)}{" "}
                      {weatherEmojis[
                        window.weather.condition.value as string
                      ] || "❓"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Container>
      </Body>
    </Html>
  );
}
