import React, { useEffect, useState, useRef, useCallback } from "react";
import * as d3 from "d3-fetch";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import { bbox } from "@turf/turf";

import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

import "./MapComponent.css";
import '../App.css';

const colors = [
  "#0f9b4a",
  "#fecc08",
  "#f69938",
  "#f3663a"
];

// load CSVs
const states = await d3.csv('./data/states.csv');
const counties = await d3.csv('./data/counties.csv');

const SimpleMapComponent = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [layer, setLayer] = useState("State");


  function createPopup(feature) {

    let popupContent = document.createElement('h3');
    popupContent.innerText = states.find(x => x["GEOID"] == feature.properties["GEOID"]).NAME

    return popupContent;
  }

  useEffect(() => {
    if (map.current) return; // initialize map only once
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/landstats/clxw5vmdi04l001qjeko78ms6',
      // bounds: [[-128, 22], [-63, 55]],
      projection: 'mercator'
    });

  });

  useEffect(() => {
    const tooltip = new mapboxgl.Popup({ closeButton: false, className: 'simple-tooltip' });

    map.current.on('mouseenter', ['states-fill', 'counties'], () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mousemove', ['states-fill', 'counties'], (e) => {
      let popupContent = createPopup(e.features[0]);

      tooltip.setHTML(popupContent.outerHTML)
        .setLngLat(e.lngLat)
        .addTo(map.current);

      // console.log(e);

    });

    map.current.on('mouseleave', ['states-fill', 'counties'], () => {
      map.current.getCanvas().style.cursor = '';
      tooltip.remove();
    });

    const popup = new mapboxgl.Popup({ closeButton: true, className: 'map-tooltip' });
    map.current.on('click', ['states-fill', 'counties'], (e) => {
      tooltip.remove();

      // let popupContent = createPopup(e.features[0]);

      // popup.setHTML(popupContent.outerHTML)
      //   .setLngLat(e.lngLat)
      //   .addTo(map.current)

      map.current.fitBounds(e.features[0].properties.bbox);

    });
  }, [])

  return (
    <div style={{ height: "100%", width: "100%" }}>

      <div id="map" ref={mapContainer}></div>
    </div>
  );
};

export default SimpleMapComponent;