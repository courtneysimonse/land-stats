import { useState } from "react";
import config from "../mapConfig";
import IconComponent from "../Shared/IconComponent";
import { useMapState } from "@/app/context/MapContext";

const IconButton = ({ label, onClick }) => {
    return (
      <button
        onClick={onClick}
        aria-label={label}
        style={{
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <IconComponent/>
      </button>
    );
  };

  const Dialog = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
  
    return (
      <div
        style={{
          position: "fixed",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "8px",
            width: "300px",
            textAlign: "center",
          }}
        >
          {children}
          <button onClick={onClose} style={{ marginTop: "20px" }}>
            Close
          </button>
        </div>
      </div>
    );
  };

const FilterControls = ({ filterConfigs = [
  { label: "Status", name: "status", options: Object.keys(config.statusOptions) },
  { label: "Time", name: "time", options: Object.keys(config.timeOptions) },
  { label: "Acreages", name: "acres", options: Object.keys(config.acresOptions) },
  { label: "Statistics", name: "stat" },
  { label: "Layer", name: "layer", options: ["State", "County"] },
] }) => {
    const [isDialogOpen, setDialogOpen] = useState(false);

    const { filters, handleSelectChange, isTimeSelectDisabled, dynamicTooltip, setDynamicTooltip, zoomToState, setZoomToState } = useMapState();

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
            <div>
                <IconButton
                    label="Open settings"
                    onClick={() => setDialogOpen(true)}
                />
                <Dialog isOpen={isDialogOpen} onClose={() => setDialogOpen(false)}>
                    <h2>Settings</h2>
                    <div style={{ marginBottom: "20px" }}>
                        <label>
                            <input
                            type="checkbox"
                            checked={dynamicTooltip}
                            onChange={() => setDynamicTooltip(!dynamicTooltip)}
                            />
                            Show Selected Options in Tooltip
                        </label>
                        </div>
                        <div style={{ marginBottom: "20px" }}>
                        <label>
                            <input
                            type="checkbox"
                            checked={zoomToState}
                            onChange={() => setzoomToState(!zoomToState)}
                            />
                            Zoom to State on Click
                        </label>
                        </div>
                </Dialog>
                <span>Settings</span>
            </div>
        </fieldset>
    </div>
  );
};

export default FilterControls;
