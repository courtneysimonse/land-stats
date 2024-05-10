
mapboxgl.accessToken = 'pk.eyJ1IjoibGFuZHN0YXRzIiwiYSI6ImNsbHd1cDV5czBmNjQzb2xlbnE4c2F6MDkifQ.8VJ8wEZCS_jJFbvtOXwSng';

const map = new mapboxgl.Map({
	container: 'map', // container ID
	style: 'mapbox://styles/landstats/clvfmorch02dd01pecuq9e0hr', // style URL
	center: [-99, 40], // starting position [lng, lat]
	zoom: 3.5, // starting zoom
    projection: 'mercator'
});


let selectedState;
let selectedStateId;
let selectedCounty;
let selectedCountyId;
let hoverState;
let hoverCounty;

let filters = {};

// api data placeholder


map.on('load', () => {

    const defaultStateColors = map.getPaintProperty('states-totals', 'fill-color');
    const defaultCountyColors = map.getPaintProperty('counties-totals', 'fill-color')
    // Add the control to the map.
    map.addControl(
        new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl,
            // localGeocoder: forwardGeocoder
        })
    );

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

    map.on('zoomend', () => {
        if (map.getZoom() >= 9 || selectedCounty != null) {
            map.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'visible');
            map.setLayoutProperty('counties-totals', 'visibility', 'none');
            map.setFilter('states-totals', null);
        } else if (map.getZoom() >= 5 || selectedState != null) {
            map.setLayoutProperty('counties-totals', 'visibility', 'visible');
            map.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'none');
            map.setFilter('states-totals', null);
        } else {
            map.setLayoutProperty('counties-totals', 'visibility', 'none');
            map.setFilter('states-totals', null);
            map.setPaintProperty('counties-totals', 'fill-color', defaultCountyColors);
        }

    });

    map.on('mouseenter', ['states-totals', 'counties-totals', 'zip-totals-Zoom 5'], (e) => {
        map.getCanvas().style.cursor = 'pointer';
    })

    map.on('mouseleave', ['states-totals', 'counties-totals', 'zip-totals-Zoom 5'], (e) => {
        map.getCanvas().style.cursor = '';
    })


    // When a click event occurs on a feature in the states layer, zoom to bounds
    // of the feature and display congressional districts and top line stats
    map.on('click', ['states-totals'], (e) => {

        if (!selectedCounty) {

            selectedCounty = null;
            map.fitBounds(turf.bbox(e.features[0]), {padding: 50});

            selectedState = e.features[0].properties['GEOID'];

            map.setPaintProperty('counties-totals', 'fill-color', [
                'case',
                ['==', ['get', 'ST_GEOID'], selectedState], defaultCountyColors,
                'grey'
            ]);

            map.on('idle', () => {map.setFilter('states-totals', ['!=', ['get', 'GEOID'], selectedState])})
            
        } else {
            
        }

        
        

        // if (e.features[0].layer.id == 'states-totals') {
        //     selectedCounty = null;
        //     map.fitBounds(turf.bbox(e.features[0]), {padding: 50});

        //     selectedStateId = e.features[0].id;

        //     map.setPaintProperty('counties-totals', 'fill-color', [
        //         'case',
        //         ['==', ['get', 'ST_GEOID'], e.features[0].properties['GEOID']], defaultCountyColors,
        //         'grey'
        //     ]);
        // } else {

        //     map.setPaintProperty('states-totals', 'fill-color', [
        //         'case',
        //         ['==', ['get', 'GEOID'], e.features[0].properties['GEOID']], defaultStateColors,
        //         'grey'
        //     ]);

        //     map.setPaintProperty('counties-totals', 'fill-color', [
        //         'case',
        //         ['==', ['get', 'ST_GEOID'], e.features[0].properties['GEOID']], defaultCountyColors,
        //         'grey'
        //     ]);


        //     if (selectedCountyId) {

        //         map.setFeatureState(
        //             {
        //                 source: 'composite',
        //                 sourceLayer: 'counties-totals',
        //                 id: selectedCountyId
        //             },
        //             { selected: false }
        //         );

        //     }

        //     map.setFeatureState(
        //         {
        //             source: 'composite',
        //             sourceLayer: 'counties-totals',
        //             id: e.features[0].id
        //         },
        //         { selected: true }
        //     );

        //     selectedCountyId = e.features[0].id;

        // }


    });

    map.on('click', ['counties-totals'], (e) => {

        if (!selectedCounty) {
            let zoom;
            if (map.getZoom() > 7) {
                zoom = map.getZoom()
            } else {
                zoom = 9
            }
            map.easeTo({center: e.lngLat, zoom: zoom});
            selectedCounty = e.features[0].properties['GEOID'];
    
            map.setFilter('counties-totals', ['!=', ['get', 'ST_GEOID'], selectedState]);
            map.setLayoutProperty('counties-totals', 'visibility', 'none'); 
        } else {
            
        }

    })


})

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