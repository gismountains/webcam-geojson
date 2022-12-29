require('dotenv').config()
const fetch = require('node-fetch');
const fs = require('fs');

async function createWindyWebcamsGeoJson(title: string, ne_lat: number, ne_lng: number, sw_lat: number, sw_lng: number, minelevation: number, saveraw: boolean) {
    const starttime = new Date()
    const limit = 50 // max value = 50 (https://api.windy.com/webcams/docs#/list/limit)
    let offset = 0
    const directoryraw = './output/raw/'
    const directoryapi = './output/api/'


    // get the amount of available webcams
    const fullPath = `https://api.windy.com/api/webcams/v2/list/bbox=${ne_lat},${ne_lng},${sw_lat},${sw_lng}/limit=${limit},${offset}/?show=webcams:location`
    console.log(`Request: ${fullPath}`)
    const response = await fetch(fullPath, {
        headers: { 'Accept': 'application/json', 'x-windy-key': process.env.WINDYKEY }
    });
    const responsedata = await response.json();
    const totalWebcams = responsedata.result.total
    console.log(`Total Webcams: ${totalWebcams}`)
    if (saveraw) {
        fs.mkdirSync(directoryraw, { recursive: true }, (err: any) => {
            if (err) {
                return console.error(err);
            }
        });
    }

    // request the sliced webcam list with multi requests
    const maxcount = Math.ceil(totalWebcams / limit)
    const webcamFeatures = [] as any;
    for (let page = 1; page <= maxcount; page++) {
        const fullPath = `https://api.windy.com/api/webcams/v2/list/bbox=${ne_lat},${ne_lng},${sw_lat},${sw_lng}/limit=${limit},${offset}/?show=webcams:location`
        console.log(`${page} of ${maxcount} with ${fullPath}`)
        const startrequestwebcam = new Date().getTime();
        const response = await fetch(fullPath, {
            headers: { 'Accept': 'application/json', 'x-windy-key': process.env.WINDYKEY }
        });
        const webcamsdata = await response.json();
        const elapsedwebcam = (new Date().getTime() - startrequestwebcam) / 1000;
        console.log(`        Elapsed webcam request: ${elapsedwebcam}`)
        // save the raw data if wanted
        if (saveraw) {
            fs.writeFile(`${directoryraw}${title}_` + offset + ".json", JSON.stringify(webcamsdata, null, 4), function (err: any) {
                if (err) {
                    return console.error(err);
                }
            });
        }

        // request the elevation for the webcam position
        let locationArray = []
        for (const webcam of webcamsdata.result.webcams) {
            locationArray.push([webcam.location.longitude, webcam.location.latitude])
        }

        const elevationApiUrl = "https://elevation.arcgis.com/arcgis/rest/services/WorldElevation/Terrain/ImageServer/getSamples";
        const token = process.env.ARCGISAPIKEY;
        const geometry = encodeURI(`{"points":${JSON.stringify(locationArray)},"spatialReference":{"wkid":4326}}`)
        const geometryType = "esriGeometryMultipoint"
        const bodyString = `geometry=${geometry}&geometryType=${geometryType}&f=pjson&token=${token}`
        const startrequestelevation = new Date().getTime();
        const responseElevation = await fetch(elevationApiUrl, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
            body: bodyString
        });
        const responseElevationdata = await responseElevation.json();
        const elapsedelevation = (new Date().getTime() - startrequestelevation) / 1000;
        console.log(`        Elapsed elevat request: ${elapsedelevation}`)

        responseElevationdata.samples.sort((a: any, b: any) => {
            return a.locationId - b.locationId;
        });


        // add the elvation to the data and do simple checks to make sure the right elevation get's added
        for (let i = 0; i < webcamsdata.result.webcams.length; i++) {
            webcamsdata.result.webcams[i].location.elevation = Math.round(Number(responseElevationdata.samples[i].value))
            if (webcamsdata.result.webcams[i].location.latitude != responseElevationdata.samples[i].location.y) {
                console.log("Error latitude ")
            }
            if (webcamsdata.result.webcams[i].location.longitude != responseElevationdata.samples[i].location.x) {
                console.log("Error longitude ")
            }
        }

        // add the data to the array webcamFeatures
        for (let i = 0; i < webcamsdata.result.webcams.length; i++) {
            if (webcamsdata.result.webcams[i].location.elevation >= minelevation) {
                try {
                    const id = parseInt(webcamsdata.result.webcams[i].id)
                    const foundEntryWithId = webcamFeatures.some((feature: { id: number; }) => feature.id === id);
                    if (!foundEntryWithId) {
                        webcamFeatures.push(
                            {
                                id: id,
                                title: webcamsdata.result.webcams[i].title,
                                city: webcamsdata.result.webcams[i].location.city,
                                country_code: webcamsdata.result.webcams[i].location.country_code,
                                elevation: webcamsdata.result.webcams[i].location.elevation,
                                longitude: webcamsdata.result.webcams[i].location.longitude,
                                latitude: webcamsdata.result.webcams[i].location.latitude,
                            }
                        )
                    }  
                    else{
                        console.log(`Double entry for: ${id}`)
                    }                  
                } catch (error) {
                    console.log(error)
                    console.log(webcamsdata.result.webcams[i])
                }
            }
        }
        offset += limit;
    }

    // Print the amount of webcams 
    console.log(`Total Webcams above ${minelevation} meters: ${webcamFeatures.length}`)

    // sort on ID
    webcamFeatures.sort((a: { id: number; }, b: { id: number; }) => {
        return a.id - b.id;
    });

    // create geojson format
    const webcamFeaturesGeoJson = []
    for (let i = 0; i < webcamFeatures.length; i++) {
        webcamFeaturesGeoJson.push({
            type: "Feature",
            properties: {
                id: webcamFeatures[i].id,
                title: webcamFeatures[i].title,
                city: webcamFeatures[i].city,
                country_code: webcamFeatures[i].country_code,
                elevation: webcamFeatures[i].elevation,
            },
            geometry: {
                coordinates: [
                    webcamFeatures[i].longitude,
                    webcamFeatures[i].latitude,
                    webcamFeatures[i].elevation
                ],
                type: "Point"
            }
        })
    }

    // create geojson output
    const geojson = {
        type: "FeatureCollection",
        features: webcamFeaturesGeoJson
    }
    fs.mkdirSync(directoryapi, { recursive: true }, (err: any) => {
        if (err) {
            console.error(err);
        }
    });
    const filepathgeojson = `${directoryapi}${title}.geojson`
    fs.writeFile(filepathgeojson, JSON.stringify(geojson), (err: any) => {
        if (err) {
            console.error(err);
        }
    });
    const filepathgeojsonp = `${directoryapi}${title}-p.geojson`
    fs.writeFile(filepathgeojsonp, JSON.stringify(geojson, null, 2), (err: any) => {
        if (err) {
            console.error(err);
        }
    });

    const stoptime = new Date()
    const durationSeconds = (stoptime.getTime() - starttime.getTime()) / 1000;
    console.log(`Duration: ${durationSeconds} seconds`)
};

createWindyWebcamsGeoJson(`webcam-alps`, 48.3, 16.6, 43, 4.8, 300, false)
//createWindyWebcamsGeoJson(`webcam-alps-subset`, 48.3, 16.6, 48, 16, 300, false)