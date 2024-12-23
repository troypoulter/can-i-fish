import { logger, task } from "@trigger.dev/sdk/v3";
import { WillyWeatherService } from "../services/willyWeatherAPI";
import type { LocationWeatherWithDetailsResponse } from "../services/types";
import type { z } from "zod";

// Constants for fishing conditions
const FISHING_CONDITIONS = {
  MAX_LOW_TIDE_HEIGHT: 0.4, // meters
  MAX_SWELL_HEIGHT: 1.0, // meters
  MAX_SWELL_PERIOD: 6, // seconds
  EXCLUDED_SWELL_DIRECTION: "SE",
  MIN_HOURS_BEFORE_SUNSET: 2,
  MIN_HOURS_AFTER_SUNRISE: 0, // Must be after sunrise
};

interface ConditionStatus {
  passed: boolean;
  value: number | string;
  threshold?: number | string;
  details?: string;
}

interface FishingMeasurement<T> {
  value: T;
  condition: ConditionStatus;
}

interface FishingWindow {
  date: string;
  lowTide: FishingMeasurement<{
    time: string;
    height: number;
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
      sunriseTime: string;
    }>;
    beforeSunset: FishingMeasurement<{
      hours: number;
      time: string;
      sunsetTime: string;
    }>;
  };
  weather: string;
  sunsetTime: string;
  overallScore: number;
}

function logFishingWindowsSummary(fishingWindows: FishingWindow[]) {
  const passThreshold = 100; // Only windows with 100% score are considered fully passed
  const passed = fishingWindows.filter((w) => w.overallScore === passThreshold);
  const partial = fishingWindows.filter(
    (w) => w.overallScore > 0 && w.overallScore < passThreshold
  );
  const failed = fishingWindows.filter((w) => w.overallScore === 0);

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
        score: `${w.overallScore}%`,
        time: w.lowTide.value.time,
        passedConditions: [
          w.lowTide.condition.passed
            ? `✓ Tide: ${w.lowTide.value.height}m`
            : null,
          w.swell.height.condition.passed
            ? `✓ Swell Height: ${w.swell.height.value}m`
            : null,
          w.swell.period.condition.passed
            ? `✓ Swell Period: ${w.swell.period.value}s`
            : null,
          w.swell.direction.condition.passed
            ? `✓ Swell Direction: ${w.swell.direction.value}`
            : null,
          w.daylight.afterSunrise.condition.passed
            ? `✓ After Sunrise: ${w.daylight.afterSunrise.value.hours.toFixed(1)}hrs`
            : null,
          w.daylight.beforeSunset.condition.passed
            ? `✓ Before Sunset: ${w.daylight.beforeSunset.value.hours.toFixed(1)}hrs`
            : null,
        ].filter(Boolean),
        failedConditions: [
          !w.lowTide.condition.passed
            ? `✗ Tide: ${w.lowTide.value.height}m`
            : null,
          !w.swell.height.condition.passed
            ? `✗ Swell Height: ${w.swell.height.value}m`
            : null,
          !w.swell.period.condition.passed
            ? `✗ Swell Period: ${w.swell.period.value}s`
            : null,
          !w.swell.direction.condition.passed
            ? `✗ Swell Direction: ${w.swell.direction.value}`
            : null,
          !w.daylight.afterSunrise.condition.passed
            ? `✗ After Sunrise: ${w.daylight.afterSunrise.value.hours.toFixed(1)}hrs`
            : null,
          !w.daylight.beforeSunset.condition.passed
            ? `✗ Before Sunset: ${w.daylight.beforeSunset.value.hours.toFixed(1)}hrs`
            : null,
        ].filter(Boolean),
      })),
    });
  }

  if (failed.length > 0) {
    logger.info("\n❌ FAILED Windows:", {
      windows: failed.map((w) => ({
        date: w.date,
        time: w.lowTide.value.time,
        failedConditions: [
          !w.lowTide.condition.passed
            ? `Tide: ${w.lowTide.value.height}m`
            : null,
          !w.swell.height.condition.passed
            ? `Swell Height: ${w.swell.height.value}m`
            : null,
          !w.swell.period.condition.passed
            ? `Swell Period: ${w.swell.period.value}s`
            : null,
          !w.swell.direction.condition.passed
            ? `Swell Direction: ${w.swell.direction.value}`
            : null,
          !w.daylight.afterSunrise.condition.passed
            ? `After Sunrise: ${w.daylight.afterSunrise.value.hours.toFixed(1)}hrs`
            : null,
          !w.daylight.beforeSunset.condition.passed
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
          passed: lowTide.height <= FISHING_CONDITIONS.MAX_LOW_TIDE_HEIGHT,
          value: lowTide.height,
          threshold: FISHING_CONDITIONS.MAX_LOW_TIDE_HEIGHT,
          details: "Maximum allowable low tide height",
        },
      };

      const swellMeasurement = {
        height: {
          value: closestSwellEntry.height,
          condition: {
            passed:
              closestSwellEntry.height <= FISHING_CONDITIONS.MAX_SWELL_HEIGHT,
            value: closestSwellEntry.height,
            threshold: FISHING_CONDITIONS.MAX_SWELL_HEIGHT,
            details: "Maximum allowable swell height",
          },
        },
        period: {
          value: closestSwellEntry.period,
          condition: {
            passed:
              closestSwellEntry.period <= FISHING_CONDITIONS.MAX_SWELL_PERIOD,
            value: closestSwellEntry.period,
            threshold: FISHING_CONDITIONS.MAX_SWELL_PERIOD,
            details: "Maximum allowable swell period",
          },
        },
        direction: {
          value: closestSwellEntry.directionText,
          condition: {
            passed:
              closestSwellEntry.directionText !==
              FISHING_CONDITIONS.EXCLUDED_SWELL_DIRECTION,
            value: closestSwellEntry.directionText,
            threshold: FISHING_CONDITIONS.EXCLUDED_SWELL_DIRECTION,
            details: "Excluded swell direction",
          },
        },
      };

      const daylightMeasurement = {
        afterSunrise: {
          value: {
            hours: hoursAfterSunrise,
            time: lowTideTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
            sunriseTime: sunriseTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
          },
          condition: {
            passed:
              hoursAfterSunrise >= FISHING_CONDITIONS.MIN_HOURS_AFTER_SUNRISE,
            value: `${lowTideTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })} (${hoursAfterSunrise.toFixed(1)}hrs after ${sunriseTime.toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }
            )})`,
            threshold: `≥${FISHING_CONDITIONS.MIN_HOURS_AFTER_SUNRISE} hours after sunrise`,
            details: "Minimum hours required after sunrise",
          },
        },
        beforeSunset: {
          value: {
            hours: hoursBeforeSunset,
            time: lowTideTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
            sunsetTime: sunsetTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
          },
          condition: {
            passed:
              hoursBeforeSunset >= FISHING_CONDITIONS.MIN_HOURS_BEFORE_SUNSET,
            value: `${lowTideTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })} (${hoursBeforeSunset.toFixed(1)}hrs before ${sunsetTime.toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }
            )})`,
            threshold: `≥${FISHING_CONDITIONS.MIN_HOURS_BEFORE_SUNSET} hours before sunset`,
            details: "Minimum hours required before sunset",
          },
        },
      };

      // Calculate overall score
      const conditions = [
        lowTideMeasurement.condition,
        swellMeasurement.height.condition,
        swellMeasurement.period.condition,
        swellMeasurement.direction.condition,
        daylightMeasurement.afterSunrise.condition,
        daylightMeasurement.beforeSunset.condition,
      ];
      const passedConditions = conditions.filter((c) => c.passed).length;
      const overallScore = (passedConditions / conditions.length) * 100;

      logger.info("Processed fishing window", {
        date: dateStr,
        lowTide: lowTideMeasurement,
        swell: swellMeasurement,
        daylight: daylightMeasurement,
        overallScore,
      });

      // Add fishing window with all measurements and conditions
      fishingWindows.push({
        date: dateStr,
        lowTide: lowTideMeasurement,
        swell: swellMeasurement,
        daylight: daylightMeasurement,
        weather: closestWeatherEntry.precis,
        sunsetTime: sunsetDay.entries[0].setDateTime,
        overallScore,
      });
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

      return {
        success: true,
        location: locationResponse.location,
        fishingWindows,
        weather: weatherData,
      };
    } catch (error) {
      logger.error("Error fetching weather data", { error });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});
