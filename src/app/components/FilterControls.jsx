import React from "react";
import config from "./mapConfig";

const FilterControls = ({ filters, handleSelectChange, filterConfigs, isTimeSelectDisabled }) => {
  return (
    <div id="map-filters">
        <fieldset>
            {filterConfigs.map(({ label, name, options }) => {
                const selectOptions = name === "stat" ? config.statOptions[filters.status] : options;

                return (
                    <div key={name} className="filter-group">
                    <label htmlFor={`${name}-select`}>{label}:</label>
                    <select
                        id={`${name}-select`}
                        name={name}
                        value={filters[name]}
                        onChange={handleSelectChange}
                        disabled={name === "time" && isTimeSelectDisabled} // Disable time select
                    >
                        {name === "stat" 
                        ? Object.entries(selectOptions || {}).map(([optionLabel, optionValue]) => (
                            <option key={optionValue || optionLabel} value={optionValue || optionLabel}>
                                {optionLabel}
                            </option>
                            ))
                        : options.map(option => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                            ))
                        }
                    </select>
                    </div>
                );
            })}
        </fieldset>
    </div>
  );
};

export default FilterControls;
