const config = {
    stateLayers: ["states-totals"],
    countyLayers: ["counties-totals-part-1", "counties-totals-part-2"],
    layers: ["states-totals", "counties-totals-part-1", "counties-totals-part-2"],
    bounds: [[-128, 22], [-63, 50]],
    style: 'mapbox://styles/landstats/clvfmorch02dd01pecuq9e0hr',
    initialBreaks: { min: 361, max: 20144, breaks: [2576, 6771] },
    colors: [
        "#0f9b4a",
        "#fecc08",
        "#f69938",
        "#f3663a"
    ],
    statusOptions: {
      "Sold": "sold_count",
      "For Sale": "for_sale_count",
      "Pending": "pending_count",
    },
    timeOptions: {
        "7 days": "7d",
        "30 days": "30d",
        "90 days": "90d",
        "6 months": "6M",
        "12 months": "12M",
        "24 months": "24M",
        "36 months": "36M",
    },
    acresOptions: {
        "0-1 acres": "0-1",
        "1-2 acres": "1-2",
        "2-5 acres": "2-5",
        "5-10 acres": "5-10",
        "10-20 acres": "10-20",
        "20-50 acres": "20-50",
        "50-100 acres": "50-100",
        "100+ acres": "100+",
        "All Acreages": "TOTAL"
    },
    statOptions: {
        "Sold": {
            "Inventory Count": "sold_count",
            "Median Price": "sold_median_price",
            "Median Price/Acre": "sold_median_price_per_acre",
            "Days on Market": "sold_median_days_on_market",
            "Sell Through Rate (STR)": "list_sale_ratio",
            "Absorption Rate": "absorption_rate",
            "Months of Supply": "months_of_supply"
        },
        "For Sale": {
            "Inventory Count": "for_sale_count",
            "Median Price": "for_sale_median_price",
            "Median Price/Acre": "for_sale_median_price_per_acre",
            "Days on Market": "for_sale_median_days_on_market",
            "Sell Through Rate (STR)": "list_sale_ratio",
            "Absorption Rate": "absorption_rate",
            "Months of Supply": "months_of_supply"
        },
        "Pending": {
            "Inventory Count": "for_sale_count",
            "Median Price": "for_sale_median_price",
            "Median Price/Acre": "for_sale_median_price_per_acre",
            "Days on Market": "for_sale_median_days_on_market",
            // "Sell Through Rate (STR)": "list_sale_ratio",
            // "Absorption Rate": "absorption_rate",
            // "Months of Supply": "months_of_supply"
        },
      }
  };
  
  export default config;
  