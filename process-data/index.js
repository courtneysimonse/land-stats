import { writeFile } from "fs";
import fetchApiToken from "./fetchApiToken.js";

const bearerToken = await fetchApiToken(
  process.env.OUTSETA_API_KEY,
  process.env.OUTSETA_API_SECRET,
  process.env.OUTSETA_USERNAME,
);

let reqOpts = {
  headers: {
    Authorization: `Bearer ${bearerToken}`,
  },
};

async function fetchStateCountyData() {
  try {
    let response = await fetch(
      `https://land-stats-dev.narf.ai/api/v1/zillow/heat_map_states/`,
      reqOpts,
    );
    let data = await response.json();

    return data;
  } catch (error) {
    console.error("Error fetching state and county data:", error);
  }
}

async function fetchZipcodeData(stateAbbrev) {
  try {
    let response = await fetch(
      `https://land-stats-dev.narf.ai/api/v1/zillow/heat_map_zipcodes/?state=${stateAbbrev}`,
      reqOpts,
    );
    let data = await response.json();

    return data;
  } catch (error) {
    console.error("Error fetching zipcode data:", error);
  }
}

// fetchZipcodeData("06001").then((response) => {
//   console.log(response);
// });

// const stateCountyData = await fetchStateCountyData();

fetchStateCountyData().then((response) => {
  // console.log(response);

  
  response.states = Object.entries(response.states).reduce((acc, [state, stateData]) => {
    const filteredStatistics = Object.fromEntries(
        Object.entries(stateData.statistics).map(([acreage, timeframeData]) => [
          acreage,
          Object.fromEntries(
            Object.entries(timeframeData).filter(([, value]) => value !== 0 && value !== null)
          )
        ]).filter(([, timeframeData]) => Object.keys(timeframeData).length > 0)
      );

    const filteredCounties = Object.fromEntries(
        Object.entries(stateData.counties).map(([county, acreageData]) => [
            county,
            Object.fromEntries(
              Object.entries(acreageData).map(([acreage, timeframeData]) => [
                acreage,
                Object.fromEntries(
                  Object.entries(timeframeData).filter(([, value]) => value !== 0 && value !== null)
                )
              ]).filter(([, timeframeData]) => Object.keys(timeframeData).length > 0)
            )
          ]).filter(([, acreageData]) => Object.keys(acreageData).length > 0)
        );

    acc[state] = {
      ...stateData,
      statistics: filteredStatistics,
      counties: filteredCounties
    };
    return acc;
  }, {});

  // Object.entries(response.states).forEach(([state, data]) => {
  //   console.log(state);
  //   fetchZipcodeData(state).then((zipData) => {
  //     console.log(zipData.zipcode);
  //   });
  // });

  writeFile("./states_counties.json", JSON.stringify(response), (err) => {
    if (err) throw err;
    console.log("states_counties.json has been successfully written!");
  });
});
