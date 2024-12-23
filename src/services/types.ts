import { z } from "zod";

export const LocationResponse = z.object({
  units: z.object({
    distance: z.string(),
  }),
  location: z.object({
    id: z.number(),
    name: z.string(),
    region: z.string(),
    state: z.string(),
    postcode: z.string(),
    timeZone: z.string(),
    lat: z.number(),
    lng: z.number(),
    typeId: z.number(),
    distance: z.number(),
  }),
});

export type LocationDetails = z.infer<typeof LocationResponse>;

export const LocationWeatherWithDetailsResponse = z.object({
  success: z.boolean().optional(),
  location: z.object({
    id: z.number(),
    name: z.string(),
    region: z.string(),
    state: z.string(),
    postcode: z.string(),
    timeZone: z.string(),
    lat: z.number(),
    lng: z.number(),
    typeId: z.number(),
    distance: z.number().optional(),
  }),
  weather: z
    .object({
      location: z.object({
        id: z.number(),
        name: z.string(),
        region: z.string(),
        state: z.string(),
        postcode: z.string(),
        timeZone: z.string(),
        lat: z.number(),
        lng: z.number(),
        typeId: z.number(),
      }),
      forecasts: z.object({
        weather: z.object({
          days: z.array(
            z.object({
              dateTime: z.string(),
              entries: z.array(
                z.object({
                  dateTime: z.string(),
                  precisCode: z.string(),
                  precis: z.string(),
                  precisOverlayCode: z.string(),
                  night: z.boolean(),
                  min: z.number(),
                  max: z.number(),
                })
              ),
            })
          ),
          units: z.object({ temperature: z.string() }),
          issueDateTime: z.string(),
        }),
        tides: z.object({
          days: z.array(
            z.object({
              dateTime: z.string(),
              entries: z.array(
                z.object({
                  dateTime: z.string(),
                  height: z.number(),
                  type: z.string(),
                })
              ),
            })
          ),
          units: z.object({ height: z.string() }),
          issueDateTime: z.string(),
          carousel: z.object({ size: z.number(), start: z.number() }),
        }),
        swell: z.object({
          days: z.array(
            z.object({
              dateTime: z.string(),
              entries: z.array(
                z.object({
                  dateTime: z.string(),
                  direction: z.number(),
                  directionText: z.string(),
                  height: z.number(),
                  period: z.number(),
                })
              ),
            })
          ),
          units: z.object({ height: z.string(), period: z.string() }),
          issueDateTime: z.string(),
          carousel: z.object({ size: z.number(), start: z.number() }),
        }),
        sunrisesunset: z.object({
          days: z.array(
            z.object({
              dateTime: z.string(),
              entries: z.array(
                z.object({
                  firstLightDateTime: z.string(),
                  riseDateTime: z.string(),
                  setDateTime: z.string(),
                  lastLightDateTime: z.string(),
                })
              ),
            })
          ),
          carousel: z.object({ size: z.number(), start: z.number() }),
        }),
      }),
    })
    .optional(),
});
