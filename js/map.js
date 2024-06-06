import * as d3 from "https://cdn.jsdelivr.net/npm/d3-fetch@3/+esm";
import LegendControl from "./LegendControl.js";
import ZoomDisplayControl from "./ZoomDisplayControl.js";

let colors = [
    "#0f9b4a",
    "#fecc08",
    "#f69938",
    "#f3663a"
]

let statCats = {
    "Sold": {
        "Inventory Count": "sold_count",
        "Median Price": "sold_median_price",
        "Median Price/Acre": "sold_median_price_per_acre",
        "Days on Market": "sold_median_days_on_market",
        "List/Sale Ratio": "list_sale_ratio",
        "Absorption Rate": "absorption_rate",
        "Months of Supply": "months_of_supply"
    },
    "For Sale": {
        "Inventory Count": "for_sale_count",
        "Median Price": "for_sale_median_price",
        "Median Price/Acre": "for_sale_median_price_per_acre",
        "Days on Market": "for_sale_median_days_on_market",
        "List/Sale Ratio": "list_sale_ratio",
        "Absorption Rate": "absorption_rate",
        "Months of Supply": "months_of_supply"
    }
}

let selectedStatus = "Sold";
let selectedStat = statCats[selectedStatus]["Inventory Count"];

const statusSelect = document.getElementById('status-select');
const statsSelect = document.getElementById('stats-select');

addStatuses(statusSelect, statCats);
statusSelect.value = selectedStatus;

function addStatuses(selectEl, data) {
    Object.entries(data).forEach(([status, stats]) => {

        let el = document.createElement('option');
        el.value = status;
        el.textContent = status;

        selectEl.appendChild(el);
        
    });

}

updateStatsOpts(statsSelect, statCats[selectedStatus]);
statsSelect.value = selectedStat;

function updateStatsOpts(selectEl, data) {
    selectEl.innerHTML = '';
    Object.entries(data).forEach(([statLbl, statVar]) => {

        let el = document.createElement('option');
        el.value = statVar;
        el.textContent = statLbl;

        selectEl.appendChild(el);
        
    });
}

let timeFrames = {
    "7 days": "7d",
    "30 days": "30d",
    "90 days": "90d",
    "6 months": "6M",
    "12 months": "12M",
    "24 months": "24M",
    "36 months": "36M",
    "Pending": "PENDING"
}

let selectedTime = "12 months";

const timeSelect = document.getElementById('time-select');

addStatuses(timeSelect, timeFrames);
timeSelect.value = selectedTime;

let acreageRanges = {
    "0-1 acres": "0-1",
    "1-2 acres": "1-2",
    "2-5 acres": "2-5",
    "5-10 acres": "5-10",
    "10-20 acres": "10-20",
    "20-50 acres": "20-50",
    "50-100 acres": "50-100",
    "100+ acres": "100+",
    "All Acreages": "TOTAL"
}

let selectedAcres = "All Acreages";

const acresSelect = document.getElementById('acres-select');

addStatuses(acresSelect, acreageRanges);
acresSelect.value = selectedAcres;

mapboxgl.accessToken = 'pk.eyJ1IjoibGFuZHN0YXRzIiwiYSI6ImNsbHd1cDV5czBmNjQzb2xlbnE4c2F6MDkifQ.8VJ8wEZCS_jJFbvtOXwSng';

const map = new mapboxgl.Map({
	container: 'map', // container ID
	style: 'mapbox://styles/landstats/clvfmorch02dd01pecuq9e0hr', // style URL
	bounds: [[-128, 22], [-63, 55]],
    projection: 'mercator'
});

const countyZoomThreshold = 5;
const zipZoomThreshold = 9;


let selectedState;
let selectedStateId;
let selectedCounty;
let selectedCountyId;
let hoverState;
let hoverCounty;

let selectedLayer = "State";

let filters = {};

// load CSVs
const states = await d3.csv('./data/states.csv');
const counties = await d3.csv('./data/counties.csv');

// load propertyMinMaxs
const statesMinMax = await d3.json('./data/state_properties.json');
const countiesMinMax = await d3.json('./data/counties_properties.json');

// // add options to filters
// const stateSelect = document.getElementById('state-select');
// addOptions(stateSelect, states);

// const countySelect = document.getElementById('county-select');

map.on('load', () => {
    map.addControl(new ZoomDisplayControl(), 'bottom-right')

    const defaultStateColors = map.getPaintProperty('states-totals', 'fill-color');
    const defaultCountyColors = map.getPaintProperty('counties-totals', 'fill-color')
    // Add the control to the map.
    map.addControl(
        new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl,
            // localGeocoder: forwardGeocoder
        }),
        'bottom-left'
    );

    const legendControl = new LegendControl(calcBreaks(statesMinMax[`${acreageRanges[selectedAcres]}.${timeFrames[selectedTime]}.${selectedStat}`]), colors)
    map.addControl(legendControl, 'bottom-right');

    // change variable displayed on selections
    statusSelect.addEventListener('change', (e) => {
        updateStatsOpts(statsSelect, statCats[e.target.value]);

        updateColors();
    });

    timeSelect.addEventListener('change', (e) => {
        updateColors();
    });

    acresSelect.addEventListener('change', (e) => {
        updateColors();
    });

    statsSelect.addEventListener('change', (e) => {
        updateColors();
    })

    function updateColors() {
        let colorExps = setNewVariable();
        map.setPaintProperty('states-totals', 'fill-color', colorExps.state);
        map.setPaintProperty('counties-totals', 'fill-color', colorExps.county);
    }

    // function forwardGeocoder(query) {
    //     var matchingFeatures = [];
    //     for (var i = 0; i < customData.features.length; i++) {
    //         var feature = customData.features[i];
    //         // handle queries with different capitalization than the source data by calling toLowerCase()
    //         if (
    //             feature.properties.title
    //                 .toLowerCase()
    //                 .search(query.toLowerCase()) !== -1
    //         ) {
    //             
    //             // using carmen geojson format: https://github.com/mapbox/carmen/blob/master/carmen-geojson.md
    //             feature['place_name'] = feature.properties.name;
    //             feature['center'] = feature.geometry.coordinates;
    //             feature['place_type'] = ['park'];
    //             matchingFeatures.push(feature);
    //         }
    //     }
    //     return matchingFeatures;
    // }

    // stateSelect.addEventListener('change', (e) => {
    //     if (!selectedCounty) {

    //         selectedCounty = null;
    //         // map.fitBounds(turf.bbox(e.features[0]), {padding: 50});

    //         selectedState = e.target.value;

    //         // add options to sidebar filter
    //         addOptions(countySelect, counties);
    //         countySelect.removeAttribute('disabled');

    //         filterState(selectedState);
            
    //     } else {
            
    //     }
    // })

    map.on('zoomend', () => {
        let statName = Object.keys(statCats[selectedStatus]).find(key => statCats[selectedStatus][key] === selectedStat);

        // if (map.getZoom() >= zipZoomThreshold || selectedCounty != null) {
        //     map.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'visible');
        //     map.setLayoutProperty('counties-totals', 'visibility', 'none');
        //     map.setLayoutProperty('states-totals', 'visibility', 'none');
        //     map.setFilter('states-totals', null);
        // } else 
        if (map.getZoom() >= countyZoomThreshold || selectedState != null) {
            selectedLayer = "County";

            map.setLayoutProperty('counties-totals', 'visibility', 'visible');
            map.setLayoutProperty('counties-lines', 'visibility', 'visible');
            // map.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'none');
            map.setLayoutProperty('states-totals', 'visibility', 'none');
            map.setFilter('states-totals', null);

            legendControl.updateScale(calcBreaks(countiesMinMax[`${acreageRanges[selectedAcres]}.${timeFrames[selectedTime]}.${selectedStat}`]), 
                `${selectedLayer} Level - ${selectedStatus} - ${selectedTime} - ${statName}`)
        } else {
            selectedLayer = "State";

            // map.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'none');
            map.setLayoutProperty('counties-totals', 'visibility', 'none');
            map.setLayoutProperty('counties-lines', 'visibility', 'none');
            map.setLayoutProperty('states-totals', 'visibility', 'visible');
            map.setFilter('states-totals', null);
        

            legendControl.updateScale(calcBreaks(statesMinMax[`${acreageRanges[selectedAcres]}.${timeFrames[selectedTime]}.${selectedStat}`]),
                 `${selectedLayer} Level - ${selectedStatus} - ${selectedTime} - ${statName}`)
        }

    });

    const popup = new mapboxgl.Popup({closeButton: false});

    map.on('mouseenter', ['states-totals', 'counties-totals', 'zip-totals-Zoom 5'], (e) => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mousemove', ['states-totals', 'counties-totals', 'zip-totals-Zoom 5'], (e) => {

        let props = e.features[0].properties;

        let popupContent = document.createElement('div');

        let listEl = document.createElement('ul');

        let layerLi = document.createElement('li');
        let geoLi = document.createElement('li');
        if (e.features[0].layer.id == 'states-totals') {
            layerLi.innerText = "LAYER: State";

            let stateName = states.find(x=> x["GEOID"] == props["GEOID"]).NAME
            geoLi.innerText = "SELECTED: " + stateName;

        } else {
            layerLi.innerText = "LAYER: County"

            let countyName = counties.find(x=> x['GEOID'] == e.features[0].id).NAME
            geoLi.innerText = "SELECTED: " + countyName;
        }

        listEl.appendChild(layerLi);
        listEl.appendChild(geoLi);

        let timeLi = document.createElement('li');
        timeLi.innerText = "TIMEFRAME: " + selectedTime;
        listEl.appendChild(timeLi);

        let acreLi = document.createElement('li');
        acreLi.innerText = "ACREAGE: " + selectedAcres;
        listEl.appendChild(acreLi);

        let statusLi = document.createElement('li');
        statusLi.innerText = "STATUS: "+selectedStatus;
        listEl.appendChild(statusLi);


        Object.entries(statCats[selectedStatus]).forEach(([l, v]) => {
            let statEl = document.createElement('li');
            let varName = `${acreageRanges[selectedAcres]}.${timeFrames[selectedTime]}.${v}`
            statEl.textContent = `${l}: ${props[varName].toLocaleString()}`
            listEl.appendChild(statEl);
        })

        popupContent.appendChild(listEl)

        popup.setHTML(popupContent.outerHTML)
            .setLngLat(e.lngLat)
            .addTo(map)

    });

    map.on('mouseleave', ['states-totals', 'counties-totals', 'zip-totals-Zoom 5'], (e) => {
        map.getCanvas().style.cursor = '';
        popup.remove();
    });


    // // When a click event occurs on a feature in the states layer, zoom to bounds
    // // of the feature and display congressional districts and top line stats
    // map.on('click', ['states-totals'], (e) => {

    //     if (!selectedCounty) {

    //         selectedCounty = null;
    //         map.fitBounds(turf.bbox(e.features[0]), {padding: 50});

    //         selectedState = e.features[0].properties['GEOID'];

    //         // // add options to sidebar filter
    //         // addOptions(countySelect, counties);
    //         // countySelect.removeAttribute('disabled');

    //         filterState(selectedState);
            
    //     } else {
            
    //     }

        
        

    //     // if (e.features[0].layer.id == 'states-totals') {
    //     //     selectedCounty = null;
    //     //     map.fitBounds(turf.bbox(e.features[0]), {padding: 50});

    //     //     selectedStateId = e.features[0].id;

    //     //     map.setPaintProperty('counties-totals', 'fill-color', [
    //     //         'case',
    //     //         ['==', ['get', 'ST_GEOID'], e.features[0].properties['GEOID']], defaultCountyColors,
    //     //         'grey'
    //     //     ]);
    //     // } else {

    //     //     map.setPaintProperty('states-totals', 'fill-color', [
    //     //         'case',
    //     //         ['==', ['get', 'GEOID'], e.features[0].properties['GEOID']], defaultStateColors,
    //     //         'grey'
    //     //     ]);

    //     //     map.setPaintProperty('counties-totals', 'fill-color', [
    //     //         'case',
    //     //         ['==', ['get', 'ST_GEOID'], e.features[0].properties['GEOID']], defaultCountyColors,
    //     //         'grey'
    //     //     ]);


    //     //     if (selectedCountyId) {

    //     //         map.setFeatureState(
    //     //             {
    //     //                 source: 'composite',
    //     //                 sourceLayer: 'counties-totals',
    //     //                 id: selectedCountyId
    //     //             },
    //     //             { selected: false }
    //     //         );

    //     //     }

    //     //     map.setFeatureState(
    //     //         {
    //     //             source: 'composite',
    //     //             sourceLayer: 'counties-totals',
    //     //             id: e.features[0].id
    //     //         },
    //     //         { selected: true }
    //     //     );

    //     //     selectedCountyId = e.features[0].id;

    //     // }


    // });

    // map.on('click', ['counties-totals'], (e) => {

    //     if (!selectedCounty) {
    //         let zoom;
    //         if (map.getZoom() > 7) {
    //             zoom = map.getZoom()
    //         } else {
    //             zoom = 9
    //         }
    //         map.easeTo({center: e.lngLat, zoom: zoom});
    //         selectedCounty = e.features[0].properties['GEOID'];
    
    //         map.setFilter('counties-totals', ['!=', ['get', 'ST_GEOID'], selectedState]);
    //         map.setLayoutProperty('counties-totals', 'visibility', 'none'); 
    //     } else {
            
    //     }

    // })

    function filterState(geoid) {
    
        map.setPaintProperty('counties-totals', 'fill-color', [
            'case',
            ['==', ['get', 'ST_GEOID'], geoid], defaultCountyColors,
            'grey'
        ]);

        map.on('idle', () => {map.setFilter('states-totals', ['!=', ['get', 'GEOID'], selectedState])})
    
    }

    function setNewVariable() {
        selectedTime = timeSelect.value;
        selectedAcres = acresSelect.value;
        selectedStat = statsSelect.value;
        selectedStatus = statusSelect.value;

        let newVar = `${acreageRanges[selectedAcres]}.${timeFrames[selectedTime]}.${selectedStat}`;

        let stateBreaks = calcBreaks(statesMinMax[newVar]);
        let varMinMaxState = statesMinMax[newVar];

        let countyBreaks = calcBreaks(countiesMinMax[newVar]);
        let varMinMaxCounty = countiesMinMax[newVar];

        let stateColor;

        if (varMinMaxState.max != varMinMaxState.min) {
            stateColor = [
                "interpolate",
                ["linear"],
                [
                  "get",
                  newVar
                ],
                varMinMaxState.min,
                "#0f9b4a",
                varMinMaxState.breaks[0],
                "#fecc08",
                varMinMaxState.breaks[1],
                "#f69938",
                varMinMaxState.max,
                "#f3663a"
              ]
        } else {
            stateColor = "#0f9b4a";
        }

        let countyColor
        
        if (varMinMaxCounty.max != varMinMaxCounty.min) {
            countyColor = [
                "interpolate",
                ["linear"],
                [
                "get",
                newVar
                ],
                varMinMaxCounty.min,
                "#0f9b4a",
                varMinMaxCounty.breaks[0],
                "#fecc08",
                varMinMaxCounty.breaks[1],
                "#f69938",
                varMinMaxCounty.max,
                "#f3663a"
            ]
        } else {
            countyColor = "#0f9b4a";
        }

        let statName = Object.keys(statCats[selectedStatus]).find(key => statCats[selectedStatus][key] === selectedStat);

        if (map.getLayoutProperty('states-totals', 'visibility') == 'visible') {
            legendControl.updateScale(stateBreaks, `${selectedLayer} Level - ${selectedStatus} - ${selectedTime} - ${statName}`);
        } else {
            legendControl.updateScale(countyBreaks, `${selectedLayer} Level - ${selectedStatus} - ${selectedTime} - ${statName}`);
        }



        return {state: stateColor, county: countyColor}
    }

})  // end map on load

// Because features come from tiled vector data,
// feature geometries may be split
// or duplicated across tile boundaries.
// As a result, features may appear
// multiple times in query results.
function getUniqueFeatures(features, comparatorProperty) {
    const uniqueIds = new Set();
    const uniqueFeatures = [];
    for (const feature of features) {
        const id = feature.properties[comparatorProperty];
        if (!uniqueIds.has(id)) {
            uniqueIds.add(id);
            uniqueFeatures.push(feature);
        }
    }
    return uniqueFeatures;
}

function addOptions(selectEl, data) {
    data.forEach(d => {
        let opt = createOptEl(d);
        selectEl.appendChild(opt);
    })
}

function createOptEl(data) {
    let el = document.createElement('option');
    el.value = data["GEOID"];
    el.textContent = data["NAME"];

    return el;
}

function calcBreaks(data) {
    return [
        data.min,
        ...data.breaks,
        data.max
    ]
}