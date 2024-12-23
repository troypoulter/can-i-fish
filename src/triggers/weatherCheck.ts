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

  // Process each day
  for (const tideDay of data.forecasts.tides.days) {
    const date = tideDay.dateTime.split("T")[0];

    // Get corresponding weather, swell, and sunset data for this day
    const weatherDay = data.forecasts.weather.days.find(
      (d) => d.dateTime.split("T")[0] === date
    );
    const swellDay = data.forecasts.swell.days.find(
      (d) => d.dateTime.split("T")[0] === date
    );
    const sunsetDay = data.forecasts.sunrisesunset.days.find(
      (d) => d.dateTime.split("T")[0] === date
    );

    if (!weatherDay || !swellDay || !sunsetDay) continue;

    // Process each low tide for the day
    const lowTides = tideDay.entries.filter((entry) => entry.type === "low");

    for (const lowTide of lowTides) {
      if (lowTide.height > FISHING_CONDITIONS.MAX_LOW_TIDE_HEIGHT) continue;

      const lowTideTime = new Date(lowTide.dateTime);
      const sunsetTime = new Date(sunsetDay.entries[0].setDateTime);

      // Check if low tide is at least 2 hours before sunset
      const hoursBeforeSunset =
        (sunsetTime.getTime() - lowTideTime.getTime()) / (1000 * 60 * 60);
      if (hoursBeforeSunset < FISHING_CONDITIONS.MIN_HOURS_BEFORE_SUNSET)
        continue;

      // Find closest swell reading to low tide time
      const closestSwellEntry = findClosestEntry(swellDay.entries, lowTideTime);
      if (!closestSwellEntry) continue;

      // Check swell conditions
      if (
        closestSwellEntry.height > FISHING_CONDITIONS.MAX_SWELL_HEIGHT ||
        closestSwellEntry.period > FISHING_CONDITIONS.MAX_SWELL_PERIOD ||
        closestSwellEntry.directionText ===
          FISHING_CONDITIONS.EXCLUDED_SWELL_DIRECTION
      )
        continue;

      // Find closest weather reading to low tide time
      const closestWeatherEntry = findClosestEntry(
        weatherDay.entries,
        lowTideTime
      );
      if (!closestWeatherEntry) continue;

      // Add fishing window if all conditions are met
      fishingWindows.push({
        date,
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
