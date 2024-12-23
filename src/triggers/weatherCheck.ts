import { logger, task } from "@trigger.dev/sdk/v3";
import { WillyWeatherService } from "../services/willyWeatherAPI";

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

      return {
        success: true,
        location: locationResponse.location,
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
