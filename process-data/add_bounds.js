import bbox from "@turf/bbox";
import centroid from "@turf/centroid";
import flatten from "@turf/flatten";
import { readFileSync, writeFile } from "fs";

const statesJson = JSON.parse(readFileSync('./states/states_cb2022.geojson'));

statesJson.features.forEach(s => {
    let props = s.properties;
    let s_bbox = bbox(s);
    props['bbox'] = [s_bbox[0],s_bbox[1],s_bbox[2],s_bbox[3]].toString();
    let s_single_parts = flatten(s)
    let s_centroid = centroid(s_single_parts).geometry.coordinates;
    props['centroid'] = [s_centroid[0],s_centroid[1]].toString();
});

writeFile('./states/states_w_bbox.geojson', JSON.stringify(statesJson), () => {
    console.log('done writing file');
})