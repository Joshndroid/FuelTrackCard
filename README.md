# Fuel Tracker Card

Lovelace card for a fuel price tracking Home Assistant integration.

This frontend package is self-contained and intended to be installed through HACS as a custom dashboard/plugin repository.

## HACS

Add this repository to HACS as:

```text
Category: Dashboard
```

The card file is:

```text
dist/fuel-tracker-card.js
```

After installing, add the resource if HACS does not do it automatically:

```text
/hacsfiles/fuel-tracker-card/fuel-tracker-card.js
```

Resource type:

```text
JavaScript Module
```

## Example Card

Use the entity IDs created by your integration. The exact names may differ depending on Home Assistant's entity registry.

```yaml
type: custom:fuel-tracker-card
title: Fuel Tracker
fuels:
  - name: Unleaded 98
    cheapest_price_entity: sensor.premium_unleaded_98_cheapest_price
    cheapest_station_entity: sensor.premium_unleaded_98_cheapest_station
    recommendation_entity: sensor.premium_unleaded_98_recommendation
    trend_entity: sensor.premium_unleaded_98_trend
    average_price_entity: sensor.premium_unleaded_98_average_price
    regional_average_entity: sensor.premium_unleaded_98_regional_average_price
    regional_cheapest_entity: sensor.premium_unleaded_98_regional_cheapest_price
    capital_average_entity: sensor.premium_unleaded_98_capital_average_price
    capital_cheapest_entity: sensor.premium_unleaded_98_capital_cheapest_price
  - name: Premium Diesel
    cheapest_price_entity: sensor.premium_diesel_cheapest_price
    cheapest_station_entity: sensor.premium_diesel_cheapest_station
    recommendation_entity: sensor.premium_diesel_recommendation
    trend_entity: sensor.premium_diesel_trend
    average_price_entity: sensor.premium_diesel_average_price
    regional_average_entity: sensor.premium_diesel_regional_average_price
    regional_cheapest_entity: sensor.premium_diesel_regional_cheapest_price
    capital_average_entity: sensor.premium_diesel_capital_average_price
    capital_cheapest_entity: sensor.premium_diesel_capital_cheapest_price
```

## Options

```yaml
type: custom:fuel-tracker-card
title: Fuel Tracker
show_header: true
show_updated: true
show_station_details: true
fuels: []
```

Each fuel item supports:

```yaml
name: Unleaded 98
cheapest_price_entity: sensor.example_cheapest_price
cheapest_station_entity: sensor.example_cheapest_station
recommendation_entity: sensor.example_recommendation
trend_entity: sensor.example_trend
average_price_entity: sensor.example_average_price
regional_average_entity: sensor.example_regional_average_price
regional_cheapest_entity: sensor.example_regional_cheapest_price
capital_average_entity: sensor.example_capital_average_price
capital_cheapest_entity: sensor.example_capital_cheapest_price
```

For regional and capital comparison tiles, use either the `*_average_entity` sensor or
the `*_cheapest_entity` sensor. If both are configured, the card displays the cheapest
price and shows the average as supporting detail.

Station rows open Waze using the station coordinates.

## Compact Kiosk Card

This repo also includes a compact glanceable card for dashboards where the full card is too large. It compares the current cheapest price for each configured fuel type, highlights the cheapest one, and overlays the cheapest-price history for the last 7 days.

```yaml
type: custom:fuel-glance-card
title: Fuel
hours_to_show: 168
show_station: true
fuels:
  - name: Unleaded 91
    cheapest_price_entity: sensor.unleaded_91_cheapest_price
    cheapest_station_entity: sensor.unleaded_91_cheapest_station
  - name: Unleaded 95
    cheapest_price_entity: sensor.unleaded_95_cheapest_price
    cheapest_station_entity: sensor.unleaded_95_cheapest_station
  - name: Diesel
    cheapest_price_entity: sensor.diesel_cheapest_price
    cheapest_station_entity: sensor.diesel_cheapest_station
```

Optional per-fuel colors can be supplied with `color: "#14b8a6"`. The graph uses Home Assistant history for each `cheapest_price_entity`, so recorder history must be available for the 7 day overlay.

For compatibility, each fuel can also use `price_entity`, `cheapest_entity`, or `entity` instead of `cheapest_price_entity`, and `station_entity` instead of `cheapest_station_entity`.

## Development

The installable card is:

```text
dist/fuel-tracker-card.js
```

The editable source is:

```text
src/fuel-tracker-card.js
```

For now these files are intentionally the same so the card can be edited without a build step.
