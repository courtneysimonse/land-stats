import { readFileSync, writeFile } from "fs";

const reqOpts = {
    headers: {
        'accept': 'application/json',
        'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjdIS204eF9UXzJhb3FfYmtRYVAzNjdTS3hVWSIsImtpZCI6IjdIS204eF9UXzJhb3FfYmtRYVAzNjdTS3hVWSJ9.eyJuYmYiOjE3MTgyMzE4MjksImV4cCI6MTcxODgzNjYyOSwiaXNzIjoiaHR0cHM6Ly9sYW5kLm91dHNldGEuY29tIiwiY2xpZW50X2lkIjoibGFuZC5vdXRzZXRhLmNvbS5yZXNvdXJjZS1vd25lciIsInNjb3BlIjpbIm9wZW5pZCIsIm91dHNldGEiLCJwcm9maWxlIl0sInN1YiI6InlXb1J6Sk45IiwiYXV0aF90aW1lIjoxNzE4MjMxODI4LCJpZHAiOiJpZHNydiIsImVtYWlsIjoibGFuZHN0YXRzMjAyM0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmFtaWx5X25hbWUiOiJTdGF0cyIsImdpdmVuX25hbWUiOiJMYW5kIiwibmFtZSI6IkxhbmQgU3RhdHMiLCJuYW1laWQiOiJ5V29SekpOOSIsIm91dHNldGE6YWNjb3VudFVpZCI6IjQ5Nmo4RzQ5Iiwib3V0c2V0YTppc1ByaW1hcnkiOiIxIiwib3V0c2V0YTpzdWJzY3JpcHRpb25VaWQiOiJSbTg3UDJaVyIsIm91dHNldGE6cGxhblVpZCI6IndRWHdibm1LIiwib3V0c2V0YTphZGRPblVpZHMiOltdLCJhbXIiOlsicGFzc3dvcmQiXSwiYXVkIjoibGFuZC5vdXRzZXRhLmNvbSIsImlhdCI6MTcxODIzMTgyOH0.H8y5jcSlDNXAIgpuIecK0hdvsVpgiyWVY1qcJCcwcwJ5R8b2uWS38QJHS6bFut-oNTelYhmgeEhauE-OEStot7wewkeNmQ9eluM3D4Vh0CxNTKqval12EEQgdznUFRWR8B46UYllu22Nmfqm0-QL5ZWek1-LtdA_nHHFbffGCZUFI5c5QCoJ0Gsl-BwEJqQNkgEEVmOHCov74sJXKjC0nm_Krz_pq9dT4sig7yQYhUMF92OYFce0yO06m2pundOueTxGMjFTachEzSvnQOac3_6LsR3eLJw8AulJ6aUNwXB0cho_UCmsD3iQuqupOWaarmuxjOcWpyHbN9rQreb7qA'
    }
}

const statesJson = JSON.parse(readFileSync('./states/states_w_bbox.geojson'));

const apiData = JSON.parse(readFileSync('./states_counties.json'));

// const zipsJson = JSON.parse(readFileSync('./zctas/zcta20_tl2023.geojson'));

let noData = [];

statesJson.features.forEach(s => {
    let props = s.properties;
    if (!apiData.states[props["STUSPS"]]) {
        noData.push(props["GEOID"]);
        return;
    }
    let data = apiData.states[props["STUSPS"]].statistics;

    if (!data) {
        data = {};
    }

    updatePropertiesWithData(props, data)

    s.properties = props;

});

function calculateBreaks(min, max, numBreaks) {
    let breaks = [];
    let interval = (max - min) / numBreaks;

    for (let i = 1; i < numBreaks; i++) {
        breaks.push(min + i * interval);
    }

    return breaks;
}

function getQuantileBreaks(values, numBreaks) {
    values.sort((a, b) => a - b);
    let breaks = [];
    for (let i = 1; i < numBreaks; i++) {
        let index = Math.floor(i * values.length / numBreaks);
        breaks.push(values[index]);
    }
    return breaks;
}

function removeOutliers(values) {
    values.sort((a, b) => a - b);
    let Q1 = values[Math.floor((values.length / 4))];
    let Q3 = values[Math.floor((values.length * (3 / 4)))];
    let IQR = Q3 - Q1;

    let lowerBound = Q1 - 2 * IQR;
    let upperBound = Q3 + 2 * IQR;

    return values.filter(value => value >= lowerBound && value <= upperBound);
}

function getMinMaxAndBreaks(geojsonData, numBreaks = 3, method = 'equal') {
    // Initialize a Map to store min, max, and breaks for each property
    let propertiesMap = new Map();
    
    // Collect all values for each property
    let valuesMap = new Map();

    geojsonData.features.forEach(feature => {
        for (let prop in feature.properties) {
            if (feature.properties.hasOwnProperty(prop)) {
                let value = feature.properties[prop];
                if (!propertiesMap.has(prop)) {
                    // If property is not in the Map, add it with the initial min and max values
                    propertiesMap.set(prop, { min: value, max: value, breaks: [] });
                    valuesMap.set(prop, [value]);
                } else {
                    // If property is already in the Map, update its min and max values
                    let minMax = propertiesMap.get(prop);
                    minMax.min = Math.min(minMax.min, value);
                    minMax.max = Math.max(minMax.max, value);
                    propertiesMap.set(prop, minMax); // Update the Map with new min and max
                    valuesMap.get(prop).push(value);
                }
            }
        }
    });

    // Calculate breaks for each property, removing outliers first
    propertiesMap.forEach((minMax, prop) => {
        let values = valuesMap.get(prop);
        let filteredValues = removeOutliers(values);

        if (filteredValues.length > 0) {
            minMax.min = Math.min(...filteredValues);
            minMax.max = Math.max(...filteredValues);

            if (method === 'equal') {
                minMax.breaks = calculateBreaks(minMax.min, minMax.max, numBreaks);
            } else if (method === 'quantile') {
                minMax.breaks = getQuantileBreaks(filteredValues, numBreaks);
            }
        }
        propertiesMap.set(prop, minMax); // Update the Map with breaks
    });

    return propertiesMap;
}



let numBreaks = 3; // For example, 3 breaks

statesJson.features = statesJson.features.filter(x=> !noData.includes(x.properties["GEOID"]))

const stateMinMax = getMinMaxAndBreaks(statesJson, numBreaks, 'quantile');

// Convert Map to Object
let stateMinMaxObject = Object.fromEntries(stateMinMax);

writeFile('./states/state_properties.json', JSON.stringify(stateMinMaxObject, null, 2), (err) => {
    if (err) throw err;
});

writeFile('./states/states_w_data.geojson', JSON.stringify(statesJson), () => {
    console.log('done writing file');
})

// counties

const countiesJson = JSON.parse(readFileSync('./counties/counties-10m.geojson'));

countiesJson.features = countiesJson.features.filter(x=> !noData.includes(x.properties["ST_GEOID"]))

noData = [];

// const zipsData = [];

async function processCounties () {
    for (const c of countiesJson.features) {
        let props = c.properties;
        let stusps = getStateAbbreviation(props["ST_GEOID"]);

        if (!stusps || !apiData.states[stusps] || !apiData.states[stusps].counties[c.id]) {
            noData.push(c.id);
            continue;
        }

        let data = apiData.states[stusps].counties[c.id] || {};
        c.properties = updatePropertiesWithData(props, data);

        // let zipData = await fetchZipcodeData(c.id);
        // zipsData.push(zipData)
    }
};

await processCounties();

console.log(countiesJson.features.filter(x=> noData.includes(x.id)));

countiesJson.features = countiesJson.features.filter(x=> !noData.includes(x.id))

const countiesMinMax = getMinMaxAndBreaks(countiesJson, numBreaks, 'quantile');

// Convert Map to Object
let countiesMinMaxObject = Object.fromEntries(countiesMinMax);

writeFile('./counties/counties_properties.json', JSON.stringify(countiesMinMaxObject, null, 2), (err) => {
    if (err) throw err;
});


writeFile('./counties/counties_w_data.geojson', JSON.stringify(countiesJson), () => {
    console.log('done writing file');
});

// split counties into two files
let counties1 = {
    "type": "FeatureCollection",
    "features": []
}

let counties2 = {
    "type": "FeatureCollection",
    "features": []
}

countiesJson.features.forEach((f,i) => {
    if (i % 2 == 0) {
        counties1.features.push(f);
    } else {
        counties2.features.push(f)
    }
})

writeFile('./counties/counties1_w_data.geojson', JSON.stringify(counties1), () => {
    console.log('done writing file');
});
writeFile('./counties/counties2_w_data.geojson', JSON.stringify(counties2), () => {
    console.log('done writing file');
});


function getStateAbbreviation(geoId) {
    let state = statesJson.features.find(x => x.properties["GEOID"] == geoId);
    return state ? state.properties["STUSPS"] : null;
}

function updatePropertiesWithData(properties, data) {
    Object.entries(data).forEach(([acres, stats]) => {
        Object.entries(stats).forEach(([time, statList]) => {
            Object.entries(statList).forEach(([stat, value]) => {
                let key = `${acres}.${time}.${stat}`;
                
                if (stat.includes('price')) {
                    value = Math.round(value);
                } else {
                    value = Math.round(value * 10) / 10
                }
                properties[key] = value;
            });
        });
    });

    return properties;
}

// async function fetchZipcodeData(countyGEOID) {
//     try {
//         let response = await fetch(`https://land-stats-dev.narf.ai/api/v1/zillow/heat_map_zipcodes/?county=${countyGEOID}`, 
//                                 reqOpts
//         );
//         let data = await response.json();

//         return data;
//     } catch (error) {
//         console.error('Error fetching zipcode data:', error);
//     }
// }