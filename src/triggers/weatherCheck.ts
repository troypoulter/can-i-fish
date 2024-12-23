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
  swell: FishingMeasurement<{
    height: number;
    period: number;
    direction: string;
  }>;
  timeBeforeSunset: FishingMeasurement<{
    hours: number;
    time: string;
    sunsetTime: string;
  }>;
  weather: string;
  sunsetTime: string;
  overallScore: number; // Percentage of conditions that passed
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
      const hoursBeforeSunset =
        (sunsetTime.getTime() - lowTideTime.getTime()) / (1000 * 60 * 60);

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

      const swellMeasurement: FishingMeasurement<{
        height: number;
        period: number;
        direction: string;
      }> = {
        value: {
          height: closestSwellEntry.height,
          period: closestSwellEntry.period,
          direction: closestSwellEntry.directionText,
        },
        condition: {
          passed:
            closestSwellEntry.height <= FISHING_CONDITIONS.MAX_SWELL_HEIGHT &&
            closestSwellEntry.period <= FISHING_CONDITIONS.MAX_SWELL_PERIOD &&
            closestSwellEntry.directionText !==
              FISHING_CONDITIONS.EXCLUDED_SWELL_DIRECTION,
          value: `${closestSwellEntry.height}m ${closestSwellEntry.period}s ${closestSwellEntry.directionText}`,
          threshold: `≤${FISHING_CONDITIONS.MAX_SWELL_HEIGHT}m ≤${FISHING_CONDITIONS.MAX_SWELL_PERIOD}s !${FISHING_CONDITIONS.EXCLUDED_SWELL_DIRECTION}`,
          details: "Swell conditions within acceptable ranges",
        },
      };

      const timeBeforeSunsetMeasurement: FishingMeasurement<{
        hours: number;
        time: string;
        sunsetTime: string;
      }> = {
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
      };

      // Calculate overall score
      const conditions = [
        lowTideMeasurement.condition,
        swellMeasurement.condition,
        timeBeforeSunsetMeasurement.condition,
      ];
      const passedConditions = conditions.filter((c) => c.passed).length;
      const overallScore = (passedConditions / conditions.length) * 100;

      logger.info("Processed fishing window", {
        date: dateStr,
        lowTide: lowTideMeasurement,
        swell: swellMeasurement,
        timeBeforeSunset: timeBeforeSunsetMeasurement,
        overallScore,
      });

      // Add fishing window with all measurements and conditions
      fishingWindows.push({
        date: dateStr,
        lowTide: lowTideMeasurement,
        swell: swellMeasurement,
        timeBeforeSunset: timeBeforeSunsetMeasurement,
        weather: closestWeatherEntry.precis,
        sunsetTime: sunsetDay.entries[0].setDateTime,
        overallScore,
      });
    }
  }

  logger.info("Completed processing weather data", {
    totalFishingWindows: fishingWindows.length,
  });

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
