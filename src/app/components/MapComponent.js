import React, { useEffect, useState } from "react";
import * as d3 from "d3-fetch";
import LegendControl from "./LegendControl";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";

const MapComponent = () => {
  const [selectedStatus, setSelectedStatus] = useState("Sold");
  const [selectedStat, setSelectedStat] = useState("sold_count");
  const [selectedTime, setSelectedTime] = useState("12 months");
  const [selectedAcres, setSelectedAcres] = useState("All Acreages");
  const [map, setMap] = useState(null);
  const [legendControl, setLegendControl] = useState(null);
  const [statesMinMax, setStatesMinMax] = useState({});
  const [countiesMinMax, setCountiesMinMax] = useState({});

  const colors = [
    "#0f9b4a",
    "#fecc08",
    "#f69938",
    "#f3663a"
  ];

  const statCats = {
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
  };

  const timeFrames = {
    "7 days": "7d",
    "30 days": "30d",
    "90 days": "90d",
    "6 months": "6M",
    "12 months": "12M",
    "24 months": "24M",
    "36 months": "36M",
    "Pending": "PENDING"
  };

  const acreageRanges = {
    "0-1 acres": "0-1",
    "1-2 acres": "1-2",
    "2-5 acres": "2-5",
    "5-10 acres": "5-10",
    "10-20 acres": "10-20",
    "20-50 acres": "20-50",
    "50-100 acres": "50-100",
    "100+ acres": "100+",
    "All Acreages": "TOTAL"
  };

  const calcBreaks = (data) => {
    return [
      data.min,
      (data.max - data.min) * (1 / 3) + data.min,
      (data.max - data.min) * (2 / 3) + data.min,
      data.max
    ];
  };

  useEffect(() => {
    const initializeMap = async () => {
      mapboxgl.accessToken = 'pk.eyJ1IjoibGFuZHN0YXRzIiwiYSI6ImNseGtxc29kcDA0MnIya3BuNHF2dGRnMjQifQ.8-ZuwhoBi64bS0L1eG9Maw';
      
      const mapInstance = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/landstats/clvfmorch02dd01pecuq9e0hr',
        bounds: [[-128, 22], [-63, 55]],
        projection: 'mercator'
      });

      setMap(mapInstance);

      const states = await d3.csv('./data/states.csv');
      const counties = await d3.csv('./data/counties.csv');
      const statesMinMaxData = await d3.json('./data/state_properties.json');
      const countiesMinMaxData = await d3.json('./data/counties_properties.json');

      setStatesMinMax(statesMinMaxData);
      setCountiesMinMax(countiesMinMaxData);

      const defaultStateColors = mapInstance.getPaintProperty('states-totals', 'fill-color');
      const defaultCountyColors = mapInstance.getPaintProperty('counties-totals', 'fill-color');

      mapInstance.addControl(
        new MapboxGeocoder({
          accessToken: mapboxgl.accessToken,
          mapboxgl: mapboxgl,
        }),
        'bottom-left'
      );

      const legend = new LegendControl(calcBreaks(statesMinMaxData[`${acreageRanges[selectedAcres]}.${timeFrames[selectedTime]}.${selectedStat}`]), colors);
      mapInstance.addControl(legend, 'bottom-right');
      setLegendControl(legend);

      mapInstance.on('zoomend', () => {
        if (mapInstance.getZoom() >= 9) {
          mapInstance.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'visible');
          mapInstance.setLayoutProperty('counties-totals', 'visibility', 'none');
          mapInstance.setLayoutProperty('states-totals', 'visibility', 'none');
          mapInstance.setFilter('states-totals', null);
        } else if (mapInstance.getZoom() >= 5) {
          mapInstance.setLayoutProperty('counties-totals', 'visibility', 'visible');
          mapInstance.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'none');
          mapInstance.setLayoutProperty('states-totals', 'visibility', 'none');
          mapInstance.setFilter('states-totals', null);
          legend.updateScale(calcBreaks(countiesMinMaxData[`${acreageRanges[selectedAcres]}.${timeFrames[selectedTime]}.${selectedStat}`]));
        } else {
          mapInstance.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'none');
          mapInstance.setLayoutProperty('counties-totals', 'visibility', 'none');
          mapInstance.setLayoutProperty('states-totals', 'visibility', 'visible');
          mapInstance.setFilter('states-totals', null);
          legend.updateScale(calcBreaks(statesMinMaxData[`${acreageRanges[selectedAcres]}.${timeFrames[selectedTime]}.${selectedStat}`]));
        }
      });

      const popup = new mapboxgl.Popup({ closeButton: false });

      mapInstance.on('mouseenter', ['states-totals', 'counties-totals', 'zip-totals-Zoom 5'], () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });

      mapInstance.on('mousemove', ['states-totals', 'counties-totals', 'zip-totals-Zoom 5'], (e) => {
        let props = e.features[0].properties;
        let listEl = document.createElement('ul');

        Object.entries(statCats[selectedStatus]).forEach(([l, v]) => {
          let statEl = document.createElement('li');
          let varName = `${acreageRanges[selectedAcres]}.${timeFrames[selectedTime]}.${v}`;
          statEl.textContent = `${l}: ${props[varName].toLocaleString()}`;
          listEl.appendChild(statEl);
        });

        popup.setHTML(listEl.outerHTML)
          .setLngLat(e.lngLat)
          .addTo(mapInstance);
      });

      mapInstance.on('mouseleave', ['states-totals', 'counties-totals', 'zip-totals-Zoom 5'], () => {
        mapInstance.getCanvas().style.cursor = '';
        popup.remove();
      });
    };

    initializeMap();
  }, []);

  useEffect(() => {
    if (map && legendControl) {
      const updateColors = () => {
        let colorExps = setNewVariable();
        map.setPaintProperty('states-totals', 'fill-color', colorExps.state);
        map.setPaintProperty('counties-totals', 'fill-color', colorExps.county);
      };

      const setNewVariable = () => {
        let newVar = `${acreageRanges[selectedAcres]}.${timeFrames[selectedTime]}.${selectedStat}`;

        let stateBreaks = calcBreaks(statesMinMax[newVar]);
        let varMinMaxState = statesMinMax[newVar];

        let countyBreaks = calcBreaks(countiesMinMax[newVar]);
        let varMinMaxCounty = countiesMinMax[newVar];

        let stateColor;

        if (varMinMaxState.max !== varMinMaxState.min) {
          stateColor = [
            "interpolate",
            ["linear"],
            ["get", newVar],
            varMinMaxState.min,
            "#0f9b4a",
            (varMinMaxState.max - varMinMaxState.min) * (1 / 3) + varMinMaxState.min,
            "#fecc08",
            (varMinMaxState.max - varMinMaxState.min) * (2 / 3) + varMinMaxState.min,
            "#f69938",
            varMinMaxState.max,
            "#f3663a"
          ];
        } else {
          stateColor = "#0f9b4a";
        }

        let countyColor;

        if (varMinMaxCounty.max !== varMinMaxCounty.min) {
          countyColor = [
            "interpolate",
            ["linear"],
            ["get", newVar],
            varMinMaxCounty.min,
            "#0f9b4a",
            (varMinMaxCounty.max - varMinMaxCounty.min) * (1 / 3) + varMinMaxCounty.min,
            "#fecc08",
            (varMinMaxCounty.max - varMinMaxCounty.min) * (2 / 3) + varMinMaxCounty.min,
            "#f69938",
            varMinMaxCounty.max,
            "#f3663a"
          ];
        } else {
          countyColor = "#0f9b4a";
        }

        return { state: stateColor, county: countyColor };
      };

      updateColors();
      legendControl.updateScale(calcBreaks(statesMinMax[`${acreageRanges[selectedAcres]}.${timeFrames[selectedTime]}.${selectedStat}`]));
    }
  }, [selectedStatus, selectedStat, selectedTime, selectedAcres, map, legendControl]);

  useEffect(() => {
    const populateSelect = (selectId, options) => {
      const selectElement = document.getElementById(selectId);
      if (selectElement) {
        selectElement.innerHTML = "";
        Object.entries(options).forEach(([label, value]) => {
          const option = document.createElement("option");
          option.value = label;
          option.textContent = label;
          selectElement.appendChild(option);
        });
      }
    };

    populateSelect("status-select", { "Sold": "Sold", "For Sale": "For Sale" });
    populateSelect("time-select", timeFrames);
    populateSelect("acres-select", acreageRanges);

    updateStatsOpts(document.getElementById("stats-select"), statCats[selectedStatus]);

    function updateStatsOpts(selectEl, data) {
        selectEl.innerHTML = '';
        Object.entries(data).forEach(([statLbl, statVar]) => {

            let el = document.createElement('option');
            el.value = statVar;
            el.textContent = statLbl;

            selectEl.appendChild(el);
            
        });
    }

    document.getElementById("status-select").value = selectedStatus;
    document.getElementById("stats-select").value = selectedStat;
    document.getElementById("time-select").value = selectedTime;
    document.getElementById("acres-select").value = selectedAcres;

    const handleStatusChange = (e) => setSelectedStatus(e.target.value);
    const handleStatChange = (e) => setSelectedStat(e.target.value);
    const handleTimeChange = (e) => setSelectedTime(e.target.value);
    const handleAcresChange = (e) => setSelectedAcres(e.target.value);

    document.getElementById("status-select").addEventListener("change", handleStatusChange);
    document.getElementById("stats-select").addEventListener("change", handleStatChange);
    document.getElementById("time-select").addEventListener("change", handleTimeChange);
    document.getElementById("acres-select").addEventListener("change", handleAcresChange);

    return () => {
      document.getElementById("status-select").removeEventListener("change", handleStatusChange);
      document.getElementById("stats-select").removeEventListener("change", handleStatChange);
      document.getElementById("time-select").removeEventListener("change", handleTimeChange);
      document.getElementById("acres-select").removeEventListener("change", handleAcresChange);
    };
  }, [selectedStatus]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <div id="map-filters">
        <fieldset>
          <div className="filter-group">
            <label htmlFor="status-select">Status:</label>
            <select name="status" id="status-select"></select>
          </div>
          <div className="filter-group">
            <label htmlFor="time-select">Time Frame:</label>
            <select name="time-frame" id="time-select"></select>
          </div>
          <div className="filter-group">
            <label htmlFor="acres-select">Acreages:</label>
            <select name="acreages" id="acres-select"></select>
          </div>
          <div className="filter-group">
            <label htmlFor="stats-select">Statistics:</label>
            <select name="statistics" id="stats-select"></select>
          </div>
        </fieldset>
      </div>
      <div id="map"></div>
    </div>
  );
};

export default MapComponent;
