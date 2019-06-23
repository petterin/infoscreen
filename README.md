# Infoscreen app

Web-based home info screen optimized for vertical Full HD displays (1080x1920) and modern web browsers.

**Features:**

- Display current time and date
- Show weather forecast from [Yr.no](https://www.yr.no/?spr=eng)
- Show weather observations from [Finnish Meteorological Institute](https://en.ilmatieteenlaitos.fi/open-data)
- Show temperature and humidity data from MQTT (to integrate custom IoT sensors)
- Public transportation information for [Helsinki Region](https://www.hsl.fi/en) (via [Digitransit API](https://digitransit.fi/en/))
- Localization for Finnish and English

Made with React and Express (Node.js).

![Screenshot](https://github.com/petterin/infoscreen/blob/master/resources/screenshot.png)

## Usage

**Prerequisites:** [Node.js](https://nodejs.org/) (8.x or later) and npm

### Development

    # Install dependencies
    npm install

    # Start app for development
    npm run watch

### Production mode

    # Install dependencies
    npm install

    # Build the frontend application
    npm run build

    # Start the Node backend
    NODE_ENV=production npm start

Open in web browser: http://localhost:3000/

## Configuration

In `config.json` you can configure:

- Display language and locale (`fi` or `en`)
- Locations for weather observations and forecasts
- Public transportation stops to display
- MQTT sensor details

Rebuild and restart the application after changing the file.

## Licences and usage restrictions

The weather data from The Finnish Meteorological Institute is licenced with [CC BY 4.0](https://en.ilmatieteenlaitos.fi/open-data-licence) and has a usage limit of 10000 request per day (<7 per minute) per user. More information: https://en.ilmatieteenlaitos.fi/open-data-manual

The weather data from [Yr (Norwegian Meteorological Institute and NRK)](https://hjelp.yr.no/hc/en-us/sections/360000421433-Free-weather-data) is free to use as long as it's credited, and it must be cached for 60 minutes. More information: https://hjelp.yr.no/hc/en-us/articles/360001946134-Data-access-and-terms-of-service

(The aforementioned request limits have been taken into account in this application by caching requests in the Infoscreen's Node.js backend.)

The source code in this repository is licenced with [MIT License](LICENSE).
