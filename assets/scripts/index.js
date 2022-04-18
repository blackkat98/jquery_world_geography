const tileLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: 'https://{1-4}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    }),
})

const vectorLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
        url: './assets/data/kml/timezones.kml',
        format: new ol.format.KML({
            extractStyles: false,
        }),
    }),
    style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: [0xff, 0xff, 0x33, 0.001],
        }),
        stroke: new ol.style.Stroke({
            color: '#99bbff',
        }),
    }),
})

const view = new ol.View({
    center: [0, 0],
    zoom: 2,
})

const map = new ol.Map({
    target: 'map',
    layers: [
        tileLayer,
        vectorLayer,
    ],
    view: view,
    moveTolerance: 5,
})

var visitorLocation = (async function () {
    return await getVisitorLocation()
}) ().then(async function (location) {
    var coordStr = location.loc.split(',').reverse()
    view.animate({
        center: ol.proj.fromLonLat(coordStr),
        zoom: 10,
    })
    await renderPageComponents(coordStr)
}).catch(function (error) {
    console.log(error)
    alert('Something went wrong while retrieving your location.')
})

// https://gis.stackexchange.com/questions/16906/how-do-i-get-the-coordinates-of-a-click-on-vector-feature-layer-in-openlayers2
map.on('click', async function(event) {
    console.time()

    var coords = event.coordinate
    coords = ol.proj.transform(coords, 'EPSG:3857', 'EPSG:4326')
    await renderPageComponents(coords)

    console.timeEnd()
})

async function renderPageComponents(coords) {
    var placeGeo = await getReversedGeocode(coords)
    var placeWeather = await getWeatherForecast(coords)
    
    $('input#longitude').val(coords[0])
    $('input#latitude').val(coords[1])
    $('textarea#display_name').attr('rows', placeGeo.display_name && (placeGeo.display_name.match(/,\s/g) || []).length + 3 || 3)
    $('textarea#display_name').val(placeGeo.display_name && placeGeo.display_name.replaceAll(', ', ',\n') || 'Unknown location' + '\n' + 'Or you are in the middle of the ocean')

    setInterval(function () {
        $('textarea#timezone').val(placeWeather.timezone + '\n' + moment.tz(placeWeather.timezone).format('ddd, D MMM YYYY, h:mm:ss.SSS a'))
    }, 10)

    $('td#temperature-measured').html(temperatureKtoC(placeWeather.current.temp) + ' °C (' + temperatureKtoF(placeWeather.current.temp) + ' °F)')
    $('td#temperature-feels-like').html(temperatureKtoC(placeWeather.current.feels_like) + ' °C (' + temperatureKtoF(placeWeather.current.feels_like) + ' °F)')
    $('td#humidity').text(placeWeather.current.humidity + ' %')
    $('td#pressure').text(placeWeather.current.pressure + ' hPa (' + pressureHpaToAtm(placeWeather.current.pressure) + ' atm)')
    $('td#wind-speed').text(placeWeather.current.wind_speed + ' m/s (' + speedMeterspsToMilesph(placeWeather.current.wind_speed) + ' Mph)')
    $('td#wind-direction').text(placeWeather.current.wind_deg + ' ° (' + angleDegreeToRadian(placeWeather.current.wind_deg) + ' rad)')
    $('td#wind-gust').text(placeWeather.current.wind_gust + ' m/s (' + speedMeterspsToMilesph(placeWeather.current.wind_gust) + ' Mph)')
    $('td#clouds').text(placeWeather.current.clouds + ' %')
    $('td#uv-index').text(placeWeather.current.uvi)
    $('td#visibility').text(placeWeather.current.visibility + ' m (' + lengthMetersToMiles(placeWeather.current.visibility) + ' Miles)')
}

async function getVisitorLocation() {
    const url = `https://ipinfo.io/json`

    return await $.getJSON(url, function (response) {
        return response
    })
}

// https://stackoverflow.com/questions/50882125/open-layers-maps-with-longitude-and-latitude-get-address
async function getReversedGeocode(coords) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lon=${coords[0]}&lat=${coords[1]}`

    return await $.getJSON(url, function (response) {
        return response
    })
}

async function getWeatherForecast(coords) {
    const apiKey = 'e6c67e6d24ed10099b1136d1b903a5f8'
    const expludedParts = ''
    const url = `https://api.openweathermap.org/data/2.5/onecall?lon=${coords[0]}&lat=${coords[1]}&exclude=${expludedParts}&appid=${apiKey}`

    return await $.getJSON(url, function (response) {
        return response
    })
}

function temperatureKtoC(degreeK) {
    return (degreeK - 273.15).toFixed(2)
}

function temperatureKtoF(degreeK) {
    return (degreeK * 9 / 5 - 459.67).toFixed(2)
}

function pressureHpaToAtm(pressureHpa) {
    return (pressureHpa / 1013.25).toFixed(2)
}

function speedMeterspsToMilesph(speedMeterps) {
    return (speedMeterps * 2.23694).toFixed(2)
}

function lengthMetersToMiles(lengthMeters) {
    return (lengthMeters / 1609.344).toFixed(2)
}

function angleDegreeToRadian(degree) {
    return (degree * Math.PI / 180).toFixed(2)
}
