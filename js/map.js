mapboxgl.accessToken = 'pk.eyJ1IjoibGFuZHN0YXRzIiwiYSI6ImNsbHd1cDV5czBmNjQzb2xlbnE4c2F6MDkifQ.8VJ8wEZCS_jJFbvtOXwSng';

const map = new mapboxgl.Map({
	container: 'map', // container ID
	style: 'mapbox://styles/landstats/clvfmorch02dd01pecuq9e0hr', // style URL
	center: [-99, 40], // starting position [lng, lat]
	zoom: 3.5, // starting zoom
    projection: 'mercator'
});

map.on('load', () => {
    
})