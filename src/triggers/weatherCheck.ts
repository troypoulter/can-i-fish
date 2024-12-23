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

interface FishingWindow {
  date: string;
  lowTideTime: string;
  lowTideHeight: number;
  swellHeight: number;
  swellPeriod: number;
  swellDirection: string;
  weather: string;
  sunsetTime: string;
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
    logger.info("Found low tides for day", {
      date: dateStr,
      lowTidesCount: lowTides.length,
    });

    for (const lowTide of lowTides) {
      // Check tide height
      if (lowTide.height > FISHING_CONDITIONS.MAX_LOW_TIDE_HEIGHT) {
        logger.info("Skipping high tide", {
          date: dateStr,
          tideHeight: lowTide.height,
          maxAllowed: FISHING_CONDITIONS.MAX_LOW_TIDE_HEIGHT,
        });
        continue;
      }

      const lowTideTime = new Date(lowTide.dateTime);
      const sunsetTime = new Date(sunsetDay.entries[0].setDateTime);

      // Check if low tide is at least 2 hours before sunset
      const hoursBeforeSunset =
        (sunsetTime.getTime() - lowTideTime.getTime()) / (1000 * 60 * 60);

      if (hoursBeforeSunset < FISHING_CONDITIONS.MIN_HOURS_BEFORE_SUNSET) {
        logger.info("Skipping tide too close to sunset", {
          date: dateStr,
          lowTideTime: lowTide.dateTime,
          sunsetTime: sunsetDay.entries[0].setDateTime,
          hoursBeforeSunset,
          minRequired: FISHING_CONDITIONS.MIN_HOURS_BEFORE_SUNSET,
        });
        continue;
      }

      // Find closest swell reading to low tide time
      const closestSwellEntry = findClosestEntry(swellDay.entries, lowTideTime);
      if (!closestSwellEntry) {
        logger.info("No swell data found for time", {
          date: dateStr,
          lowTideTime: lowTide.dateTime,
        });
        continue;
      }

      // Check swell conditions
      if (
        closestSwellEntry.height > FISHING_CONDITIONS.MAX_SWELL_HEIGHT ||
        closestSwellEntry.period > FISHING_CONDITIONS.MAX_SWELL_PERIOD ||
        closestSwellEntry.directionText ===
          FISHING_CONDITIONS.EXCLUDED_SWELL_DIRECTION
      ) {
        logger.info("Skipping unfavorable swell conditions", {
          date: dateStr,
          swellHeight: closestSwellEntry.height,
          swellPeriod: closestSwellEntry.period,
          swellDirection: closestSwellEntry.directionText,
          maxHeight: FISHING_CONDITIONS.MAX_SWELL_HEIGHT,
          maxPeriod: FISHING_CONDITIONS.MAX_SWELL_PERIOD,
          excludedDirection: FISHING_CONDITIONS.EXCLUDED_SWELL_DIRECTION,
        });
        continue;
      }

      // Find closest weather reading to low tide time
      const closestWeatherEntry = findClosestEntry(
        weatherDay.entries,
        lowTideTime
      );
      if (!closestWeatherEntry) {
        logger.info("No weather data found for time", {
          date: dateStr,
          lowTideTime: lowTide.dateTime,
        });
        continue;
      }

      logger.info("Found suitable fishing window", {
        date: dateStr,
        lowTideTime: lowTide.dateTime,
        lowTideHeight: lowTide.height,
        swellHeight: closestSwellEntry.height,
        swellPeriod: closestSwellEntry.period,
        swellDirection: closestSwellEntry.directionText,
        weather: closestWeatherEntry.precis,
        sunsetTime: sunsetDay.entries[0].setDateTime,
      });

      // Add fishing window if all conditions are met
      fishingWindows.push({
        date: dateStr,
        lowTideTime: lowTide.dateTime,
        lowTideHeight: lowTide.height,
        swellHeight: closestSwellEntry.height,
        swellPeriod: closestSwellEntry.period,
        swellDirection: closestSwellEntry.directionText,
        weather: closestWeatherEntry.precis,
        sunsetTime: sunsetDay.entries[0].setDateTime,
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
