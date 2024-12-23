import { logger } from "@trigger.dev/sdk/v3";
import { LocationResponse, LocationWeatherWithDetailsResponse } from "./types";

export class WillyWeatherService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.willyweather.com.au/v2";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getLocationDetails(lat: number, lng: number) {
    const response = await fetch(
      `${this.baseUrl}/${this.apiKey}/search.json?lat=${lat}&lng=${lng}&distance=km`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return LocationResponse.parse(data);
  }

  async getWeatherData(locationId: number) {
    const response = await fetch(
      `${this.baseUrl}/${
        this.apiKey
      }/locations/${locationId}/weather.json?forecasts=weather,tides,swell,sunrisesunset`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();

    return LocationWeatherWithDetailsResponse.parse(data);
  }
}
