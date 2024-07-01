import React, { useEffect, useState, useRef, useCallback } from "react";
import * as d3 from "d3-fetch";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import { bbox } from "@turf/turf";

import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

import "./SimpleMapComponent.css";
import '../App.css';

const colors = [
  "#0f9b4a",
  "#fecc08",
  "#f69938",
  "#f3663a"
];


const SimpleMapComponent = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [layer, setLayer] = useState("State");
  const hoveredPolygonId = useRef([]);
  const [states, setStates] = useState(null);
  const [counties, setCounties] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      // load CSVs
      const statesData = await d3.csv('./data/states.csv');
      const countiesData = await d3.csv('./data/counties.csv');
      setStates(statesData);
      setCounties(countiesData);
    }
    loadData()
  }, []);

  useEffect(() => {
    if (!states || !counties) return; // Wait for the data to load

    if (map.current) return; // initialize map only once
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/landstats/clxw5vmdi04l001qjeko78ms6',
      // bounds: [[-128, 22], [-63, 55]],
      projection: 'mercator'
    });

    const createPopup = (feature) => {

      let popupContent = document.createElement('h3');
      let data = feature.layer.id === "states-fill" ? states : counties;
      popupContent.innerText = data?.find(x => +x["GEOID"] === feature.id)?.NAME || '';
      return popupContent;

    }


    const tooltip = new mapboxgl.Popup({ closeButton: false, className: 'simple-tooltip' });


    map.current.on('load', () => {

      map.current.setPaintProperty('counties', 'fill-color', 
        [
          "case",
          [
            "boolean",
            [
              "feature-state",
              "hover"
            ],
            false
          ],
          "#ffe168",
          "#48ba2d"
        ]
      )

      map.current.setPaintProperty('counties', 'fill-opacity',
        [
          "case",
          [
            "boolean",
            [
              "feature-state",
              "selected"
            ],
            true
          ],
          1,
          0.4
        ]
      )
  
      map.current.on('mouseenter', ['states-fill', 'counties'], () => {
        map.current.getCanvas().style.cursor = 'pointer';
        
      });
  
      map.current.on('mousemove', ['states-fill', 'counties'], (e) => {
        if (e.features.length === 0) return;

        // Clear the previously hovered polygon states
        if (hoveredPolygonId.current.length > 0) {
          hoveredPolygonId.current.forEach(id => {
            map.current.setFeatureState(
              {
                source: 'composite',
                sourceLayer: 'counties',
                id: id
              },
              { hover: false }
            );
          });
        }
        
        let popupContent = createPopup(e.features[0]);
  
        tooltip.setHTML(popupContent.outerHTML)
          .setLngLat(e.lngLat)
          .addTo(map.current);
  
        if (e.features.length > 0) {
          const counties = map.current.queryRenderedFeatures(
            {
              filter: ["==", ["to-number", ["get", "ST_GEOID"]], e.features[0].id],
              layers: ["counties"]
            }
          );
  
          const newHoveredPolygonId = [];

          counties.forEach(county => {
            map.current.setFeatureState(
              {
                source: 'composite',
                sourceLayer: 'counties',
                id: county.id
              },
              { hover: true }
            );
            newHoveredPolygonId.push(county.id); // Collect the new IDs for the hover state
          });
        
          hoveredPolygonId.current = newHoveredPolygonId; // Update the state with the new IDs
  
        }
  
        // console.log(e);
  
      });
  
      map.current.on('mouseleave', ['states-fill', 'counties'], () => {
        map.current.getCanvas().style.cursor = '';
        tooltip.remove();
      });
  
      // const popup = new mapboxgl.Popup({ closeButton: true, className: 'simple-tooltip' });
      map.current.on('click', ['states-fill'], (e) => {
        // tooltip.remove();
  
        // let popupContent = createPopup(e.features[0]);
  
        // popup.setHTML(popupContent.outerHTML)
        //   .setLngLat(e.lngLat)
        //   .addTo(map.current)
  
        map.current.fitBounds(e.features[0].properties.bbox.split(","), 
        {padding: 200});  

        // Clear the previously hovered polygon states
        if (hoveredPolygonId.current.length > 0) {
        hoveredPolygonId.current.forEach(id => {
          map.current.setFeatureState(
            {
              source: 'composite',
              sourceLayer: 'counties',
              id: id
            },
            { 
              hover: false,
              selected: false
            }
          );
        });
      }

      if (e.features.length > 0) {
        const counties = map.current.queryRenderedFeatures(
          {
            filter: ["==", ["to-number", ["get", "ST_GEOID"]], e.features[0].id],
            layers: ["counties"]
          }
        );

        const newHoveredPolygonId = [];

        counties.forEach(county => {
          map.current.setFeatureState(
            {
              source: 'composite',
              sourceLayer: 'counties',
              id: county.id
            },
            { hover: true }
          );
          newHoveredPolygonId.push(county.id); // Collect the new IDs for the hover state
        });
      
        hoveredPolygonId.current = newHoveredPolygonId; // Update the state with the new IDs

      }
  
        map.current.setFeatureState({
          source: 'composite',
          sourceLayer: 'counties',
          id: e.features[0].id,
        }, {
            selected: true,
            hover: false
        });
  
        map.current.setFilter('states-fill', ["!=", ["id"], e.features[0].id])
        // map.current.setLayoutProperty('states-fill', 'visibility', 'none');
  
      });
    })
    

    return () => {
      if (map.current) {
        map.current.off('mouseenter');
        map.current.off('mousemove');
        map.current.off('mouseleave');
        map.current.off('click');
      }
    };

  }, [states, counties]);

  return (
    <div style={{ height: "100%", width: "100%" }}>

      <div id="map" ref={mapContainer}></div>
    </div>
  );
};

export default SimpleMapComponent;