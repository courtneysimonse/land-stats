import React, { useEffect, useState, useRef, useCallback } from "react";
import * as d3 from "d3-fetch";
import LegendControl from "../LegendControl/LegendControl";
import ZoomDisplayControl from "../ZoomDisplayControl";
import FilterControls from "../FilterControls/FilterControls";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import config from "../mapConfig";
import { getStatsForAttribute, calcBreaks, createPopup, formatDate } from "@/app/utils/mapUtils";
import { eventBus } from "@/app/utils/eventBus";

import { useMapState, MapProvider } from "@/app/context/MapContext";

import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

import "./MapComponent.css";

const MapComponentBase = ({
  onFilterChange,
  height = "100%",
  width = "100%",
  useProvider = true
}) => {
  const context = useMapState();

  // Use context or default values depending on `useProvider`
  const { 
    filters = {
      status: 'Sold',
      stat: 'Inventory Count',
      time: '12 months',
      acres: 'All Acreages',
      layer: 'State',
    }, 
    dynamicTooltip = false, 
    zoomToState = false, 
    handleSelectChange = () => {} 
  } = useProvider ? context : {};

  const mapContainer = useRef(null);
  const map = useRef(null);
  const [legendControl, setLegendControl] = useState(null);
  const [states, setStates] = useState(null);
  const [counties, setCounties] = useState(null);
  const [timestamp, setTimestamp] = useState(null); 

  const popupOnHover = new mapboxgl.Popup({ closeButton: false, className: 'map-tooltip' });
  const popupOnClick = new mapboxgl.Popup({ closeButton: true, className: 'map-tooltip' });

  const findDataDate = (feature) => {
    let dataDate = formatDate(timestamp);
    if (feature.layer.id === 'states-totals' && feature.properties["timestamp"]) {
      dataDate = formatDate(feature.properties["timestamp"]);
    } else if (config.countyLayers.includes(feature.layer.id)) {
      const stateFeatures = map.current.querySourceFeatures('composite',
        {
          sourceLayer: 'states-totals',
          filter: ["==", ["get", "GEOID"], feature.properties["ST_GEOID"]]
        }
      )
      if (stateFeatures.length > 0) {
        dataDate = formatDate(stateFeatures[0].properties["timestamp"]);
      }
      
    }
    return dataDate
  }


  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(filters);
    }
  }, [filters, onFilterChange]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statesData, countiesData, timestampData] = await Promise.all([
          d3.csv('./data/states.csv'),
          d3.csv('./data/counties.csv'),
          fetchTimestamp(),
        ]);
  
        setStates(statesData);
        setCounties(countiesData);
        setTimestamp(timestampData);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    }

    const fetchTimestamp = async () => {
      const response = await fetch('https://landstats-timestamp-api.replit.app/timestamp');
      if (response.status != 200) {
        return ""; // Set timestamp to empty string on 404
      }
      const data = await response.json();
      return data.data.timestamp;
    };
    loadData();

  }, []);

  useEffect(() => {
    const updateColorsHandler = () => {
      const mapLayers = filters.layer === "State" ? config.stateLayers : config.countyLayers;
  
      const varName = filters.status === "Pending"
        ? `${config.acresOptions[filters.acres]}.PENDING.${config.statOptions[filters.status][filters.stat]}`
        : `${config.acresOptions[filters.acres]}.${config.timeOptions[filters.time]}.${config.statOptions[filters.status][filters.stat]}`;
  
      const stats = getStatsForAttribute(map.current, 'composite', mapLayers, varName);
      if (!stats) return;
  
      console.debug('Min:', stats.min);
      console.debug('Max:', stats.max);
      console.debug('Terciles:', stats.breaks);
  
      const categories = calcBreaks(stats);
  
      const colorExp = [
        'case',
        ['has', `${varName}`],
        [
          'interpolate',
          ['linear'],
          ['get', `${varName}`],
          ...categories.flatMap(category => [category.title, category.color])
        ],
        ["rgba", 255, 255, 255, 0]
      ];
  
      mapLayers.forEach(l => {
        map.current.setPaintProperty(l, 'fill-color', colorExp);
      });
  
      const isCounty = filters.layer === 'County';
      const visibilityMap = {
        'counties-totals-part-1': isCounty,
        'counties-totals-part-2': isCounty,
        'counties-lines': isCounty,
        'states-totals': !isCounty,
      };
  
      Object.entries(visibilityMap).forEach(([layer, visible]) => {
        map.current.setLayoutProperty(layer, 'visibility', visible ? 'visible' : 'none');
      });
  
      if (legendControl) {
        const statName = Object.keys(config.statOptions[filters.status]).find(
          key => config.statOptions[filters.status][key] === config.statOptions[filters.status][filters.stat]
        );
        const legendTitle = filters.status === "Pending"
          ? `<p>${filters.layer} Level</p><p>${filters.status}</p><p>${filters.acres}</p><p>${statName}</p>`
          : `<p>${filters.layer} Level</p><p>${filters.status}</p><p>Last ${filters.time}</p><p>${filters.acres}</p><p>${statName}</p>`;
  
        legendControl.updateScale(categories, legendTitle);
      }
    };
  
    // Subscribe to the event bus
    eventBus.on("updateColors", updateColorsHandler);

    if (map?.current && map.current.loaded() && map.current.idle()) {
      updateColorsHandler();
    }
  
    // Cleanup the event listener
    return () => {
      eventBus.off("updateColors", updateColorsHandler);
    };
  }, [filters, legendControl]); // Ensure dependencies are updated
  
  useEffect(() => {
    if (!states || !counties || timestamp == undefined) return; // Wait for the data to load
    
    if (map.current) return; // initialize map only once

    if (process.env.NEXT_PUBLIC_MAPBOX_TOKEN == undefined) {
      console.error("Mapbox token not found. Please set the NEXT_PUBLIC_MAPBOX_TOKEN environment variable."); 
      return;
    }

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    let timestampMessage = "";

    try {
      timestampMessage = timestamp 
        ? `Data as of: ${formatDate(timestamp)}`
        : "";
    } catch (error) {
      console.error("Error accessing or formatting timestamp:", error);
    }    
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: config.style,
      bounds: config.bounds,
      projection: 'mercator',
      customAttribution: timestampMessage
    });
    
    map.current.addControl(new ZoomDisplayControl(), 'bottom-right');

    let legend = new LegendControl(calcBreaks(config.initialBreaks))
    map.current.addControl(legend, 'bottom-right');
    setLegendControl(legend);

    map.current.addControl(
      new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
      }),
      'bottom-left'
    );
    
    return () => {
    };

  }, [states, counties, timestamp]);

  useEffect(() => {
    if (!map.current || !map.current.loaded) return; // Ensure map is initialized
  
    const handleMouseMove = (e) => {

      if (!popupOnClick.isOpen()) {
        let popupContent; 
      
      if (dynamicTooltip) {
        popupContent = createPopup(e.features[0], { states, counties }, filters, findDataDate(e.features[0]));
        let highlighted = config.statOptions[filters.status][filters.stat];
        if (filters.status === "Pending") {
          highlighted = "pending." + config.statOptions[filters.status][filters.stat];
        }
    
        const selectedLi = popupContent.querySelector(`[data-stat="${highlighted}"]`);
        if (selectedLi) selectedLi.classList.add('selected');
    
      } else {
        popupContent = createPopup(e.features[0], { states, counties }, config.initialPopupFilters, findDataDate(e.features[0]));
        popupContent.querySelector(`[data-stat="timeframe"]`).classList.add('selected');
        popupContent.querySelector(`[data-stat="acreage"]`).classList.add('selected');      
      }

      popupOnHover.setHTML(popupContent.outerHTML)
        .setLngLat(e.lngLat)
        .addTo(map.current);
      }
      
    };
  
    const handleClick = (e) => {
      popupOnHover.remove();
      popupOnClick.remove();
      map.current.off('mousemove', handleMouseMove); //why doesn't this work??

      let popupContent;
      
      if (dynamicTooltip) {
        popupContent = createPopup(e.features[0], { states, counties }, filters, findDataDate(e.features[0]));
        let highlighted = config.statOptions[filters.status][filters.stat];
        if (filters.status === "Pending") {
          highlighted = "pending." + config.statOptions[filters.status][filters.stat];
        }
    
        const selectedLi = popupContent.querySelector(`[data-stat="${highlighted}"]`);
        if (selectedLi) selectedLi.classList.add('selected');
    
      } else {
        popupContent = createPopup(e.features[0], { states, counties }, config.initialPopupFilters, findDataDate(e.features[0]));
        popupContent.querySelector(`[data-stat="timeframe"]`).classList.add('selected');
        popupContent.querySelector(`[data-stat="acreage"]`).classList.add('selected');
      }

      const popupBtn = document.createElement('a');
      popupBtn.className = 'btn btn-primary';
      popupBtn.innerText = "Go to Table";
  
      const featureId = e.features[0].id.toString().padStart(5, '0');
      const stateAbbrev = states.find(x => x["GEOID"] === e.features[0].properties["GEOID"])?.STUSPS;
      
      const href = e.features[0].layer.id === 'states-totals'
        ? `${process.env.NEXT_PUBLIC_BASE_URL}search-results?state=${stateAbbrev}`
        : `${process.env.NEXT_PUBLIC_BASE_URL}search-results?county=${featureId}`;
      
      popupBtn.setAttribute('href', href);
  
      popupContent.appendChild(popupBtn);
  
      popupOnClick.setHTML(popupContent.outerHTML)
        .setLngLat(e.lngLat)
        .addTo(map.current);
    };
  
    map.current.on('mousemove', [...config.layers], handleMouseMove);
    map.current.on('click', [...config.stateLayers, ...config.countyLayers], handleClick);
  
    return () => {
      map.current.off('mousemove', handleMouseMove);
      map.current.off('click', handleClick);
    };
  
  }, [filters, states, counties, timestamp, dynamicTooltip]); // Dependencies ensure updates on filter changes.

  return (
    <div 
      style={{ 
        height, 
        width,
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        justifyContent: "center"
      }}>
      <FilterControls />
      <div id="map"
        ref={mapContainer}
        style={{
          width: "100%",
          flexGrow: 2,
          position: "relative",
        }} />
    </div>
  );
};

// Wrapper component that optionally provides context
const MapComponent = (props) => {
  // If useProvider is explicitly set to false, don't wrap with provider
  if (props.useProvider === false) {
    return <MapComponentBase {...props} />;
  }

  return (
    <MapProvider>
      <MapComponentBase {...props} />
    </MapProvider>
  );
};

export default MapComponent;