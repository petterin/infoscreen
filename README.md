# Infoscreen app

Web-based home info screen optimized for vertical Full HD displays (1080x1920) and modern web browsers.

**Features:**

- Display current time and date
- Display current location's sunrise and sunset times (from [MET Norway](https://docs.api.met.no/doc/sunrise/celestial.html))
- Show weather forecast from [Yr.no](https://www.yr.no/en)
- Show weather observations from [Finnish Meteorological Institute](https://en.ilmatieteenlaitos.fi/open-data)
- Show custom IoT sensor data from MQTT (e.g. current temperature and humidity)
- Public transportation information from [Digitransit API](https://digitransit.fi/en/) (for e.g. [Helsinki Region](https://www.hsl.fi/en))
- Localization for Finnish and English

Made with React and Express (Node.js).

![Screenshot](https://github.com/petterin/infoscreen/blob/master/resources/screenshot.png)

## Usage

**Prerequisites:** [Node.js](https://nodejs.org/) (18.14 LTS or later) and npm

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

Copy `config.sample.json` as `config.json` and make your own changes there.

In `config.json` you can configure:

- Display language (`fi-FI` or `en-US`)
- Locations for weather observations and forecasts
- Public transportation stops to display (and Digitransit API key to use)
- MQTT sensor details

Restart the backend (and refresh the browser window) after changing the file.

## Licences and usage restrictions

The public transportation data from [Digitransit](https://digitransit.fi/en/) is [licensed](https://digitransit.fi/en/developers/apis/6-terms-of-use/) with [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Fetching the data **[requires a free registration](https://digitransit.fi/en/developers/api-registration/) by the user** and adding your API key to `config.json` (as `digitransitKey`). More information about the API: https://digitransit.fi/en/developers/

The weather observation data from [The Finnish Meteorological Institute](https://en.ilmatieteenlaitos.fi/) is [licenced](https://en.ilmatieteenlaitos.fi/open-data-licence) with [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) and the API has a [usage limit](https://en.ilmatieteenlaitos.fi/open-data-manual-fmi-wfs-services) of 10000 request per day (<7 per minute) per user. More information: https://en.ilmatieteenlaitos.fi/open-data-manual

The weather forecast data from [Yr (Norwegian Meteorological Institute and NRK)](https://developer.yr.no/) is [licensed](https://developer.yr.no/doc/License/) with [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) and it must be cached to prevent unnecessary requests (maximum limit 20 request/second per _application_ and usage of HTTP caching headers). API requests must also include an identifying "User-Agent" header. More information: https://developer.yr.no/doc/TermsOfService

(The aforementioned request limits have been taken into account in this application by caching requests in the Infoscreen's Node.js backend.)

The source code in this repository is licenced with [MIT License](LICENSE).
