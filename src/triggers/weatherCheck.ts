import { logger, task } from "@trigger.dev/sdk/v3";
import { WillyWeatherService } from "../services/willyWeatherAPI";
import type { LocationWeatherWithDetailsResponse } from "../services/types";
import type { z } from "zod";
import { EmailService } from "../services/emailService";
import { z as zod } from "zod";

// Weather precis code validation
export const WeatherPrecisCode = zod.enum([
  "fine",
  "mostly-fine",
  "high-cloud",
  "partly-cloudy",
  "mostly-cloudy",
  "cloudy",
  "overcast",
  "shower-or-two",
  "chance-shower-fine",
  "chance-shower-cloud",
  "drizzle",
  "few-showers",
  "showers-rain",
  "heavy-showers-rain",
  "chance-thunderstorm-fine",
  "chance-thunderstorm-cloud",
  "chance-thunderstorm-showers",
  "thunderstorm",
  "chance-snow-fine",
  "chance-snow-cloud",
  "snow-and-rain",
  "light-snow",
  "snow",
  "heavy-snow",
  "wind",
  "frost",
  "fog",
  "hail",
  "dust",
]);

export type WeatherPrecisCode = z.infer<typeof WeatherPrecisCode>;

// Constants for fishing conditions
export const FISHING_CONDITIONS = {
  TIDE: {
    PASS_THRESHOLD: 0.4,
    PARTIAL_THRESHOLD: 0.6,
  },
  SWELL: {
    HEIGHT: {
      PASS_THRESHOLD: 1.0,
    },
    PERIOD: {
      PASS_THRESHOLD: 6,
      PARTIAL_THRESHOLD: 8,
    },
    DIRECTION: {
      FAIL: ["SE", "SSE", "ESE"],
      PARTIAL_FAIL: [], // No partial fails anymore
    },
  },
  WEATHER: {
    // Clear, stable conditions ideal for fishing
    PASS: [
      "fine",
      "mostly-fine",
      "high-cloud",
      "partly-cloudy",
    ] as WeatherPrecisCode[],
    // Light cloud or very light rain can still be okay
    PARTIAL: [
      "mostly-cloudy",
      "cloudy",
      "shower-or-two",
      "chance-shower-fine",
    ] as WeatherPrecisCode[],
    // Everything else is considered unsuitable
    // Heavy rain, storms, strong wind, etc.
  },
  MIN_HOURS_BEFORE_SUNSET: 2,
  MIN_HOURS_AFTER_SUNRISE: 0,
};

interface ConditionStatus {
  passed: "pass" | "partial" | "fail" | "hard_fail";
  value: number | string;
  threshold?: string;
  details?: string;
}

interface FishingMeasurement<T> {
  value: T;
  condition: ConditionStatus;
}

export interface FishingWindow {
  date: string;
  lowTide: FishingMeasurement<{
    height: number;
    time: string;
  }>;
  swell: {
    height: FishingMeasurement<number>;
    period: FishingMeasurement<number>;
    direction: FishingMeasurement<string>;
  };
  daylight: {
    afterSunrise: FishingMeasurement<{
      hours: number;
      time: string;
    }>;
    beforeSunset: FishingMeasurement<{
      hours: number;
      time: string;
    }>;
  };
  weather: FishingMeasurement<string>;
  sunsetTime: string;
  overallScore: number;
}

function logFishingWindowsSummary(fishingWindows: FishingWindow[]) {
  const passThreshold = 100; // Only windows with 100% score are considered fully passed
  const partialThreshold = 50; // Windows with 50% or more are considered partial passes

  const passed = fishingWindows.filter((w) => w.overallScore === passThreshold);
  const partial = fishingWindows.filter(
    (w) => w.overallScore >= partialThreshold && w.overallScore < passThreshold
  );
  const failed = fishingWindows.filter(
    (w) => w.overallScore < partialThreshold
  );

  logger.info("\n=== Fishing Windows Summary ===", {
    total: fishingWindows.length,
    passed: passed.length,
    partial: partial.length,
    failed: failed.length,
  });

  if (passed.length > 0) {
    logger.info("\n✅ PASSED Windows:", {
      windows: passed.map((w) => ({
        date: w.date,
        time: w.lowTide.value.time,
        tide: `${w.lowTide.value.height}m`,
        swell: `${w.swell.height.value}m ${w.swell.period.value}s ${w.swell.direction.value}`,
        daylight: `${w.daylight.afterSunrise.value.hours.toFixed(1)}hrs after sunrise, ${w.daylight.beforeSunset.value.hours.toFixed(1)}hrs before sunset`,
        weather: w.weather,
      })),
    });
  }

  if (partial.length > 0) {
    logger.info("\n⚠️ PARTIAL Windows:", {
      windows: partial.map((w) => ({
        date: w.date,
        score: `${w.overallScore.toFixed(1)}%`,
        time: w.lowTide.value.time,
        conditions: {
          tide: {
            status: w.lowTide.condition.passed,
            value: `${w.lowTide.value.height}m`,
          },
          swell: {
            height: {
              status: w.swell.height.condition.passed,
              value: `${w.swell.height.value}m`,
            },
            period: {
              status: w.swell.period.condition.passed,
              value: `${w.swell.period.value}s`,
            },
            direction: {
              status: w.swell.direction.condition.passed,
              value: w.swell.direction.value,
            },
          },
          daylight: {
            afterSunrise: {
              status: w.daylight.afterSunrise.condition.passed,
              value: `${w.daylight.afterSunrise.value.hours.toFixed(1)}hrs`,
            },
            beforeSunset: {
              status: w.daylight.beforeSunset.condition.passed,
              value: `${w.daylight.beforeSunset.value.hours.toFixed(1)}hrs`,
            },
          },
        },
      })),
    });
  }

  if (failed.length > 0) {
    logger.info("\n❌ FAILED Windows:", {
      windows: failed.map((w) => ({
        date: w.date,
        score: `${w.overallScore.toFixed(1)}%`,
        time: w.lowTide.value.time,
        failedConditions: [
          w.lowTide.condition.passed === "fail"
            ? `Tide: ${w.lowTide.value.height}m`
            : null,
          w.swell.height.condition.passed === "fail"
            ? `Swell Height: ${w.swell.height.value}m`
            : null,
          w.swell.period.condition.passed === "fail"
            ? `Swell Period: ${w.swell.period.value}s`
            : null,
          w.swell.direction.condition.passed === "fail"
            ? `Swell Direction: ${w.swell.direction.value}`
            : null,
          w.daylight.afterSunrise.condition.passed === "fail"
            ? `After Sunrise: ${w.daylight.afterSunrise.value.hours.toFixed(1)}hrs`
            : null,
          w.daylight.beforeSunset.condition.passed === "fail"
            ? `Before Sunset: ${w.daylight.beforeSunset.value.hours.toFixed(1)}hrs`
            : null,
        ].filter(Boolean),
      })),
    });
  }
}

function processWeatherData(
  data: z.infer<typeof LocationWeatherWithDetailsResponse>
): FishingWindow[] {
  const fishingWindows: FishingWindow[] = [];

  logger.info("Starting to process weather data", {
    totalDays: data.forecasts.tides.days.length,
    conditions: FISHING_CONDITIONS,
  });

  // Process each day
  for (const tideDay of data.forecasts.tides.days) {
    const dateStr = tideDay.dateTime.split("T")[0];
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });
    const monthDay = dateObj.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });

    logger.info(`Processing ${dayOfWeek}, ${monthDay}`, { date: dateStr });

    // Get corresponding weather, swell, and sunset data for this day
    const weatherDay = data.forecasts.weather.days.find(
      (d) => d.dateTime.split("T")[0] === dateStr
    );
    const swellDay = data.forecasts.swell.days.find(
      (d) => d.dateTime.split("T")[0] === dateStr
    );
    const sunsetDay = data.forecasts.sunrisesunset.days.find(
      (d) => d.dateTime.split("T")[0] === dateStr
    );

    if (!weatherDay || !swellDay || !sunsetDay) {
      logger.info("Missing data for day", {
        date: dateStr,
        hasWeather: !!weatherDay,
        hasSwell: !!swellDay,
        hasSunset: !!sunsetDay,
      });
      continue;
    }

    // Process each low tide for the day
    const lowTides = tideDay.entries.filter((entry) => entry.type === "low");
    logger.info(`Found ${lowTides.length} low tides`, {
      date: dateStr,
      lowTidesCount: lowTides.length,
    });

    for (const lowTide of lowTides) {
      const lowTideTime = new Date(lowTide.dateTime);
      const sunsetTime = new Date(sunsetDay.entries[0].setDateTime);
      const sunriseTime = new Date(sunsetDay.entries[0].riseDateTime);

      const hoursBeforeSunset =
        (sunsetTime.getTime() - lowTideTime.getTime()) / (1000 * 60 * 60);
      const hoursAfterSunrise =
        (lowTideTime.getTime() - sunriseTime.getTime()) / (1000 * 60 * 60);

      // Find closest swell and weather readings
      const closestSwellEntry = findClosestEntry(swellDay.entries, lowTideTime);
      const closestWeatherEntry = findClosestEntry(
        weatherDay.entries,
        lowTideTime
      );

      if (!closestSwellEntry || !closestWeatherEntry) {
        logger.info("Missing swell or weather data", {
          date: dateStr,
          hasSwell: !!closestSwellEntry,
          hasWeather: !!closestWeatherEntry,
        });
        continue;
      }

      // Create measurements with conditions
      const lowTideMeasurement: FishingMeasurement<{
        time: string;
        height: number;
      }> = {
        value: {
          time: lowTide.dateTime,
          height: lowTide.height,
        },
        condition: {
          passed:
            lowTide.height <= FISHING_CONDITIONS.TIDE.PASS_THRESHOLD
              ? "pass"
              : lowTide.height <= FISHING_CONDITIONS.TIDE.PARTIAL_THRESHOLD
                ? "partial"
                : "fail",
          value: lowTide.height,
          threshold: `Pass ≤${FISHING_CONDITIONS.TIDE.PASS_THRESHOLD}m, Partial ≤${FISHING_CONDITIONS.TIDE.PARTIAL_THRESHOLD}m`,
          details: "Maximum allowable low tide height",
        },
      };

      const swellMeasurement = {
        height: {
          value: closestSwellEntry.height,
          condition: {
            passed:
              closestSwellEntry.height <=
              FISHING_CONDITIONS.SWELL.HEIGHT.PASS_THRESHOLD
                ? "pass"
                : "hard_fail",
            value: closestSwellEntry.height,
            threshold: `Pass ≤${FISHING_CONDITIONS.SWELL.HEIGHT.PASS_THRESHOLD}m`,
            details: "Maximum allowable swell height",
          },
        },
        period: {
          value: closestSwellEntry.period,
          condition: {
            passed:
              closestSwellEntry.period <=
              FISHING_CONDITIONS.SWELL.PERIOD.PASS_THRESHOLD
                ? "pass"
                : closestSwellEntry.period <=
                    FISHING_CONDITIONS.SWELL.PERIOD.PARTIAL_THRESHOLD
                  ? "partial"
                  : "fail",
            value: closestSwellEntry.period,
            threshold: `Pass ≤${FISHING_CONDITIONS.SWELL.PERIOD.PASS_THRESHOLD}s, Partial ≤${FISHING_CONDITIONS.SWELL.PERIOD.PARTIAL_THRESHOLD}s`,
            details: "Maximum allowable swell period",
          },
        },
        direction: {
          value: closestSwellEntry.directionText,
          condition: {
            passed: FISHING_CONDITIONS.SWELL.DIRECTION.FAIL.includes(
              closestSwellEntry.directionText
            )
              ? "fail"
              : "pass",
            value: closestSwellEntry.directionText,
            threshold: `Fail: ${FISHING_CONDITIONS.SWELL.DIRECTION.FAIL.join(", ")}`,
            details: "Excluded swell directions",
          },
        },
      };

      const daylightMeasurement = {
        afterSunrise: {
          value: {
            hours: hoursAfterSunrise,
            time: sunriseTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
          },
          condition: {
            passed:
              hoursAfterSunrise >= FISHING_CONDITIONS.MIN_HOURS_AFTER_SUNRISE
                ? "pass"
                : "hard_fail",
            value: `${lowTideTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })} (${
              hoursAfterSunrise >= 0
                ? `${Math.abs(hoursAfterSunrise).toFixed(1)}hrs after`
                : `${Math.abs(hoursAfterSunrise).toFixed(1)}hrs before`
            } ${sunriseTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })})`,
            threshold: `≥${FISHING_CONDITIONS.MIN_HOURS_AFTER_SUNRISE} hours after sunrise`,
            details: "Minimum hours required after sunrise",
          },
        },
        beforeSunset: {
          value: {
            hours: hoursBeforeSunset,
            time: sunsetTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
          },
          condition: {
            passed:
              hoursBeforeSunset >= FISHING_CONDITIONS.MIN_HOURS_BEFORE_SUNSET
                ? "pass"
                : "hard_fail",
            value: `${lowTideTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })} (${
              hoursBeforeSunset >= 0
                ? `${Math.abs(hoursBeforeSunset).toFixed(1)}hrs before`
                : `${Math.abs(hoursBeforeSunset).toFixed(1)}hrs after`
            } ${sunsetTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })})`,
            threshold: `≥${FISHING_CONDITIONS.MIN_HOURS_BEFORE_SUNSET} hours before sunset`,
            details: "Minimum hours required before sunset",
          },
        },
      };

      const weatherMeasurement: FishingMeasurement<string> = {
        value: closestWeatherEntry.precis,
        condition: {
          passed: FISHING_CONDITIONS.WEATHER.PASS.includes(
            closestWeatherEntry.precisCode as WeatherPrecisCode
          )
            ? "pass"
            : FISHING_CONDITIONS.WEATHER.PARTIAL.includes(
                  closestWeatherEntry.precisCode as WeatherPrecisCode
                )
              ? "partial"
              : "fail",
          value: closestWeatherEntry.precisCode,
          threshold: `Pass: ${FISHING_CONDITIONS.WEATHER.PASS.join(", ")}, Partial: ${FISHING_CONDITIONS.WEATHER.PARTIAL.join(", ")}`,
          details: "Weather conditions suitable for fishing",
        },
      };

      // Calculate overall score with weighted conditions
      const conditions = [
        { condition: lowTideMeasurement.condition, weight: 1 },
        { condition: swellMeasurement.height.condition, weight: 1 },
        { condition: swellMeasurement.period.condition, weight: 1 },
        { condition: swellMeasurement.direction.condition, weight: 1 },
        { condition: weatherMeasurement.condition, weight: 1 },
      ];

      // Check if there are any hard failures - if so, set overall score to 0
      const hasHardFail =
        daylightMeasurement.afterSunrise.condition.passed === "hard_fail" ||
        daylightMeasurement.beforeSunset.condition.passed === "hard_fail" ||
        swellMeasurement.height.condition.passed === "hard_fail";

      let overallScore = 0;
      if (!hasHardFail) {
        const totalWeight = conditions.reduce(
          (sum, { weight }) => sum + weight,
          0
        );
        const score = conditions.reduce((sum, { condition, weight }) => {
          let multiplier = 0;
          if (condition.passed === "pass") multiplier = 1;
          else if (condition.passed === "partial") multiplier = 0.5;
          return sum + weight * multiplier;
        }, 0);

        overallScore = (score / totalWeight) * 100;
      }

      // Add fishing window with all measurements and conditions
      const fishingWindow: FishingWindow = {
        date: dateStr,
        lowTide: lowTideMeasurement,
        swell: swellMeasurement as FishingWindow["swell"],
        daylight: daylightMeasurement as FishingWindow["daylight"],
        weather: weatherMeasurement,
        sunsetTime: sunsetDay.entries[0].setDateTime,
        overallScore,
      };

      // Update logging to show partial passes
      logger.info("Processed fishing window", {
        date: dateStr,
        conditions: {
          tide: {
            value: lowTideMeasurement.value.height,
            status: lowTideMeasurement.condition.passed,
          },
          swell: {
            height: {
              value: swellMeasurement.height.value,
              status: swellMeasurement.height.condition.passed,
            },
            period: {
              value: swellMeasurement.period.value,
              status: swellMeasurement.period.condition.passed,
            },
            direction: {
              value: swellMeasurement.direction.value,
              status: swellMeasurement.direction.condition.passed,
            },
          },
          daylight: {
            afterSunrise: {
              value: hoursAfterSunrise,
              status: daylightMeasurement.afterSunrise.condition.passed,
            },
            beforeSunset: {
              value: hoursBeforeSunset,
              status: daylightMeasurement.beforeSunset.condition.passed,
            },
          },
        },
        overallScore,
      });

      fishingWindows.push(fishingWindow);
    }
  }

  logger.info("Completed processing weather data", {
    totalFishingWindows: fishingWindows.length,
  });

  // Add summary logging
  logFishingWindowsSummary(fishingWindows);

  return fishingWindows;
}

function findClosestEntry<T extends { dateTime: string }>(
  entries: T[],
  targetTime: Date
): T | null {
  if (entries.length === 0) return null;

  return entries.reduce((closest, current) => {
    if (!closest) return current;

    const currentDiff = Math.abs(
      new Date(current.dateTime).getTime() - targetTime.getTime()
    );
    const closestDiff = Math.abs(
      new Date(closest.dateTime).getTime() - targetTime.getTime()
    );

    return currentDiff < closestDiff ? current : closest;
  });
}

const NORAH_HEAD = {
  lat: -33.28225,
  lng: 151.57825,
};

export const weatherCheckTask = task({
  id: "check-norah-head-weather",
  maxDuration: 300,
  run: async (payload, { ctx }) => {
    const apiKey = process.env.WILLY_WEATHER_API_KEY;

    if (!apiKey) {
      logger.error("Missing WILLY_WEATHER_API_KEY environment variable");
      return {
        error: "Configuration error: Missing API key",
        success: false,
      };
    }

    const weatherService = new WillyWeatherService(apiKey);
    const emailService = new EmailService();

    logger.info("Starting weather check for coordinates", {
      latitude: NORAH_HEAD.lat,
      longitude: NORAH_HEAD.lng,
    });

    try {
      // Get location details and store full response
      const locationResponse = await weatherService.getLocationDetails(
        NORAH_HEAD.lat,
        NORAH_HEAD.lng
      );

      logger.info("Location details", {
        name: locationResponse.location.name,
        region: locationResponse.location.region,
        state: locationResponse.location.state,
        distance: `${locationResponse.location.distance}${locationResponse.units.distance}`,
        timezone: locationResponse.location.timeZone,
      });

      // Get weather data using the location ID
      const weatherData = await weatherService.getWeatherData(
        locationResponse.location.id
      );

      // Process the weather data to find suitable fishing windows
      const fishingWindows = processWeatherData(weatherData);

      // Send email report
      const emailResult = await emailService.sendFishingReport(fishingWindows);

      return {
        success: true,
        location: locationResponse.location,
        fishingWindows,
        weather: weatherData,
        emailResult,
      };
    } catch (error) {
      logger.error("Error processing weather data", { error });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});
