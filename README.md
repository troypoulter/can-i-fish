# Can I Fish? 🐟

[![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)

An automated fishing conditions monitoring system for Norah Head, NSW. This service checks various conditions including tides, swell, and weather to determine optimal fishing windows and sends email reports.

## Motivation

This was a fun holiday project to build for my SIL who wanted to know when the best time to go fishing was at her favourite spot. I focused on making it as simple as possible to use and deploy and getting it done quickly.

If you're reading through this and the code, I hope you find it useful!

## Features

- Daily weather and conditions monitoring
- Automated email reports with fishing window recommendations
- Considers multiple factors:
  - Tide height and timing
  - Swell height, period, and direction
  - Weather conditions
  - Daylight hours (sunrise/sunset)
- Configurable scoring system for fishing conditions
- Email reports with detailed breakdowns of conditions

## Prerequisites

- Node.js (v18 or higher recommended)
- [Trigger.dev](https://trigger.dev) account
- [Willy Weather API](https://www.willyweather.com.au/info/api.html) key
- [Resend](https://resend.com) account for email delivery

## Setup

1. Clone the repository:
```bash
git clone https://github.com/troypoulter/can-i-fish.git
cd can-i-fish
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
WILLY_WEATHER_API_KEY=your_willy_weather_api_key
RESEND_API_KEY=your_resend_api_key
EMAIL_RECIPIENTS=email1@example.com,email2@example.com
ALWAYS_SEND=true  # Set to false to only send on Sundays or when conditions are good
```

## Configuration

### Fishing Conditions

The fishing conditions criteria can be adjusted in `src/triggers/weatherCheck.ts`. The default settings are:

```typescript
export const FISHING_CONDITIONS = {
  SCORING: {
    PASS_THRESHOLD: 70,
    PARTIAL_THRESHOLD: 40,
  },
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
  },
  // ... other conditions
};
```

### Email Schedule

By default, the service runs at 6 AM Sydney time daily. This can be modified in the `weatherCheckTask` configuration in `src/triggers/weatherCheck.ts`:

```typescript
cron: {
  pattern: "0 6 * * *", // Run at 6am every day
  timezone: "Australia/Sydney"
}
```

## Development

To run the service locally:

1. Set up your [Trigger.dev](https://trigger.dev) development environment following their [documentation](https://trigger.dev/docs/documentation/quickstart)
2. Start the development server:
```bash
npm run trigger:dev
```

### Code Quality

The project uses [Biome](https://biomejs.dev/) for code formatting and linting. You can run the following command to auto-fix your code:

```bash
npm run biome
```

### Deployment

To deploy to Trigger.dev:

```bash
npm run trigger:deploy
```

## License

This project is licensed under the MIT License - for the full license text, see the [LICENSE](LICENSE) file.

## Contributing

I'm not sure why you'd want to contribute to this highly specific project, but if you do, they are welcome! Please feel free to submit a pull request!