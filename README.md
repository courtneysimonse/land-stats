# land-stats


Land Stats Map

## Structure

- /process-data: Scripts to process new data for upload to Mapbox Tiling Service with MTS Data Sync CLI <https://github.com/mapbox/mts-data-sync>

## Setup for updating tiles

- node v18.17.1
- navigate to process-data folder
- npm i
- install MTS Data Sync
- mtsds --token (You need a Mapbox API token with TILESETS:LIST, TILESETS:READ, and TILESETS:WRITE access. This is different from the public token than reads the style for the map.)

## Steps to update tiles with new data

- retrieve new state/county data from API and save as /process-data/states_counties.json
- node add_bounds.js
- node add_data.js
- cd /process-data/states
- mtsds --convert states_w_data.geojson
- mtsds --sync
- cd ../counties1
- mtsds --convert counties1_w_data.geojson
- mtsds --sync
- cd ../counties2
- mtsds --convert counties2_w_data.geojson
- mtsds --sync
