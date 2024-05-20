// src/components/MapComponent.js

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as d3 from 'd3-fetch';
import * as turf from '@turf/turf';
import { MapboxGeocoder } from '@mapbox/mapbox-gl-geocoder';

mapboxgl.accessToken = 'pk.eyJ1IjoibGFuZHN0YXRzIiwiYSI6ImNsbHd1cDV5czBmNjQzb2xlbnE4c2F6MDkifQ.8VJ8wEZCS_jJFbvtOXwSng';

const MapComponent = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [states, setStates] = useState([]);
  const [counties, setCounties] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [defaultStateColors, setDefaultStateColors] = useState(null);
  const [defaultCountyColors, setDefaultCountyColors] = useState(null);

  useEffect(() => {
    d3.csv('/data/states.csv').then(data => setStates(data));
    d3.csv('/data/counties.csv').then(data => setCounties(data));

    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/landstats/clvfmorch02dd01pecuq9e0hr',
      center: [-99, 40],
      zoom: 3.5,
      projection: 'mercator'
    });

    map.current.on('load', () => {
      setDefaultStateColors(map.current.getPaintProperty('states-totals', 'fill-color'));
      setDefaultCountyColors(map.current.getPaintProperty('counties-totals', 'fill-color'));

      map.current.addControl(new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl
      }));

      map.current.on('zoomend', handleZoomEnd);
      map.current.on('mouseenter', ['states-totals', 'counties-totals', 'zip-totals-Zoom 5'], handleMouseEnter);
      map.current.on('mouseleave', ['states-totals', 'counties-totals', 'zip-totals-Zoom 5'], handleMouseLeave);
      map.current.on('click', ['states-totals'], handleStateClick);
      map.current.on('click', ['counties-totals'], handleCountyClick);
    });

    return () => {
      if (map.current) map.current.remove();
    };
  }, []);

  useEffect(() => {
    const stateSelect = document.getElementById('state-select');
    const countySelect = document.getElementById('county-select');

    if (stateSelect && states.length) {
      addOptions(stateSelect, states);
    }

    if (selectedState && counties.length) {
      addOptions(countySelect, counties.filter(county => county.ST_GEOID === selectedState));
      countySelect.removeAttribute('disabled');
    }
  }, [states, counties, selectedState]);

  const handleZoomEnd = () => {
    if (map.current.getZoom() >= 9 || selectedCounty != null) {
      map.current.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'visible');
      map.current.setLayoutProperty('counties-totals', 'visibility', 'none');
      map.current.setFilter('states-totals', null);
    } else if (map.current.getZoom() >= 5 || selectedState != null) {
      map.current.setLayoutProperty('counties-totals', 'visibility', 'visible');
      map.current.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'none');
      map.current.setFilter('states-totals', null);
    } else {
      map.current.setLayoutProperty('counties-totals', 'visibility', 'none');
      map.current.setFilter('states-totals', null);
      map.current.setPaintProperty('counties-totals', 'fill-color', defaultCountyColors);
    }
  };

  const handleMouseEnter = () => {
    map.current.getCanvas().style.cursor = 'pointer';
  };

  const handleMouseLeave = () => {
    map.current.getCanvas().style.cursor = '';
  };

  const handleStateClick = (e) => {
    if (!selectedCounty) {
      const stateGEOID = e.features[0].properties['GEOID'];
      setSelectedState(stateGEOID);
      setSelectedCounty(null);
      map.current.fitBounds(turf.bbox(e.features[0]), { padding: 50 });

      filterState(stateGEOID);
    }
  };

  const handleCountyClick = (e) => {
    if (!selectedCounty) {
      let zoom = map.current.getZoom() > 7 ? map.current.getZoom() : 9;
      map.current.easeTo({ center: e.lngLat, zoom: zoom });
      const countyGEOID = e.features[0].properties['GEOID'];
      setSelectedCounty(countyGEOID);

      map.current.setFilter('counties-totals', ['!=', ['get', 'ST_GEOID'], selectedState]);
      map.current.setLayoutProperty('counties-totals', 'visibility', 'none');
    }
  };

  const filterState = (geoid) => {
    map.current.setPaintProperty('counties-totals', 'fill-color', [
      'case',
      ['==', ['get', 'ST_GEOID'], geoid], defaultCountyColors,
      'grey'
    ]);

    map.current.on('idle', () => {
      map.current.setFilter('states-totals', ['!=', ['get', 'GEOID'], geoid]);
    });
  };

  const addOptions = (selectEl, data) => {
    data.forEach(d => {
      let opt = document.createElement('option');
      opt.value = d["GEOID"];
      opt.textContent = d["NAME"];
      selectEl.appendChild(opt);
    });
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <div id="filter-sidebar">
        <details open>
          <summary>Refine Data</summary>
          <div className="data-filters">
            <label htmlFor="state-select" className="form-label">State:</label>
            <input className="form-control" list="stateOptions" id="state-select" placeholder="All" />
            <datalist id="stateOptions"></datalist>

            <label htmlFor="county-select" className="form-label">County:</label>
            <input disabled className="form-control" list="countyOptions" id="county-select" placeholder="All" />
            <datalist id="countyOptions"></datalist>

            <label htmlFor="zip-select" className="form-label">ZIP Code:</label>
            <input disabled className="form-control" list="zipOptions" id="zip-select" placeholder="All" />
            <datalist id="zipOptions"></datalist>
          </div>
        </details>

        <details open>
          <summary>Data for <span id="data-label"></span></summary>
          <div id="data-summaries">
            <ul>
              <li>Data 1:</li>
              <li>Data 2:</li>
            </ul>
          </div>
        </details>
      </div>
      <div id="map" ref={mapContainer} style={{ flex: 1 }}></div>
    </div>
  );
};

export default MapComponent;
