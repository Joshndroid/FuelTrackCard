const CARD_VERSION = "0.1.0";

class FuelTrackerCard extends HTMLElement {
  static getStubConfig() {
    return {
      type: "custom:fuel-tracker-card",
      fuels: [
        {
          name: "Unleaded 98",
          cheapest_price_entity: "sensor.premium_unleaded_98_cheapest_price",
          cheapest_station_entity: "sensor.premium_unleaded_98_cheapest_station",
          recommendation_entity: "sensor.premium_unleaded_98_recommendation",
          trend_entity: "sensor.premium_unleaded_98_trend",
          average_price_entity: "sensor.premium_unleaded_98_average_price",
          regional_average_entity: "sensor.premium_unleaded_98_regional_average_price",
          regional_cheapest_entity: "sensor.premium_unleaded_98_regional_cheapest_price",
          capital_average_entity: "sensor.premium_unleaded_98_capital_average_price",
          capital_cheapest_entity: "sensor.premium_unleaded_98_capital_cheapest_price"
        }
      ]
    };
  }

  static getConfigElement() {
    return document.createElement("fuel-tracker-card-editor");
  }

  setConfig(config) {
    if (!config.fuels || !Array.isArray(config.fuels) || config.fuels.length === 0) {
      throw new Error("Define at least one fuel entry.");
    }

    this._config = {
      title: "",
      show_header: false,
      show_updated: true,
      show_station_details: true,
      ...config
    };

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 4 + Math.min((this._config?.fuels?.length || 1) * 2, 8);
  }

  _render() {
    if (!this._config || !this._hass) return;

    const fuels = this._config.fuels.map((fuel) => this._fuelView(fuel));
    this.innerHTML = `
      <ha-card>
        <div class="fuel-card">
          ${this._config.show_header && this._config.title ? this._header() : ""}
          <div class="fuel-grid">
            ${fuels.map((fuel) => this._fuelPanel(fuel)).join("")}
          </div>
        </div>
      </ha-card>
      <style>${styles}</style>
    `;
  }

  _header() {
    return `
      <div class="header">
        <h2>${escapeHtml(this._config.title)}</h2>
      </div>
    `;
  }

  _fuelPanel(fuel) {
    const attrs = fuel.station?.attributes || {};
    const mapUrl = navigationUrl(attrs);

    return `
      <section class="fuel-panel">
        <div class="fuel-top">
          <div>
            <h3>${escapeHtml(fuel.name)}</h3>
            <div class="trend ${trendClass(fuel.trend)}">${trendLabel(fuel.trend)}</div>
          </div>
          <div class="price">${escapeHtml(fuel.priceDisplay)}</div>
        </div>

        <div class="recommendation ${recommendationClass(fuel.recommendation)}">
          <span>${recommendationLabel(fuel.recommendation)}</span>
          <small>${escapeHtml(fuel.reason)}</small>
        </div>

        <div class="metrics">
          <div>
            <span>Average</span>
            <strong>${escapeHtml(fuel.averageDisplay)}</strong>
          </div>
          <div>
            <span>Stations</span>
            <strong>${escapeHtml(fuel.stationCount)}</strong>
          </div>
          <div>
            <span>Distance</span>
            <strong>${escapeHtml(formatDistance(attrs.distance_km))}</strong>
          </div>
        </div>

        ${this._comparisonMetrics(fuel)}
        ${this._config.show_station_details ? this._stationBlock(fuel, attrs, mapUrl) : ""}
      </section>
    `;
  }

  _comparisonMetrics(fuel) {
    if (!fuel.regionalComparison && !fuel.capitalComparison) return "";

    return `
      <div class="comparison-metrics">
        ${fuel.regionalComparison ? `
          <div>
            <span>${escapeHtml(fuel.regionalComparison.label)}</span>
            <strong>${escapeHtml(formatEntityPrice(fuel.regionalComparison.state))}</strong>
            <small>${escapeHtml(fuel.regionalComparison.detail)}</small>
          </div>
        ` : ""}
        ${fuel.capitalComparison ? `
          <div>
            <span>${escapeHtml(fuel.capitalComparison.label)}</span>
            <strong>${escapeHtml(formatEntityPrice(fuel.capitalComparison.state))}</strong>
            <small>${escapeHtml(fuel.capitalComparison.detail)}</small>
          </div>
        ` : ""}
      </div>
    `;
  }

  _stationBlock(fuel, attrs, mapUrl) {
    const stationName = fuel.station?.state || "No station";
    const brand = attrs.brand || "";
    const address = attrs.address || "";
    const updated = attrs.last_updated ? formatUpdated(attrs.last_updated) : "";
    const content = `
      <div class="station-main">
        <strong>${escapeHtml(stationName)}</strong>
        <span>${escapeHtml([brand, address].filter(Boolean).join(" · "))}</span>
        ${this._config.show_updated && updated ? `<em>${escapeHtml(updated)}</em>` : ""}
      </div>
      ${mapUrl ? `<span class="map-link" title="Open in Waze">›</span>` : ""}
    `;

    return mapUrl
      ? `<a class="station station-link" href="${mapUrl}" target="_blank" rel="noreferrer">${content}</a>`
      : `<div class="station">${content}</div>`;
  }

  _fuelView(config) {
    const price = entity(this._hass, config.cheapest_price_entity);
    const station = entity(this._hass, config.cheapest_station_entity);
    const recommendation = entity(this._hass, config.recommendation_entity);
    const trend = entity(this._hass, config.trend_entity);
    const average = entity(this._hass, config.average_price_entity);
    const regionalAverage = entity(this._hass, config.regional_average_entity);
    const regionalCheapest = entity(this._hass, config.regional_cheapest_entity);
    const capitalAverage = entity(this._hass, config.capital_average_entity);
    const capitalCheapest = entity(this._hass, config.capital_cheapest_entity);
    const regionalComparison = comparisonView(
      regionalCheapest,
      regionalAverage,
      "regional_city",
      "Regional"
    );
    const capitalComparison = comparisonView(
      capitalCheapest,
      capitalAverage,
      "capital_city",
      "Capital"
    );

    const name = config.name || station?.attributes?.fuel_type || price?.attributes?.fuel_type || "Fuel";
    const priceNumber = numberState(price);

    return {
      name,
      price,
      station,
      recommendation: recommendation?.state || "unknown",
      trend: trend?.state || "unknown",
      average,
      reason: recommendation?.attributes?.reason || "No recommendation detail available.",
      stationCount: String(price?.attributes?.station_count || station?.attributes?.station_count || "0"),
      priceNumber,
      priceDisplay: priceNumber === null ? "—" : `${priceNumber.toFixed(1)} c/L`,
      averageDisplay: formatEntityPrice(average),
      regionalAverage,
      regionalCheapest,
      capitalAverage,
      capitalCheapest,
      regionalComparison,
      capitalComparison
    };
  }
}

class FuelTrackerCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    this.innerHTML = `
      <div class="editor">
        <p>Configure this card in YAML. Add one fuel item per tracked fuel type.</p>
        <pre>type: custom:fuel-tracker-card
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
    capital_cheapest_entity: sensor.premium_unleaded_98_capital_cheapest_price</pre>
      </div>
      <style>
        .editor {
          padding: 16px;
          color: var(--primary-text-color);
        }
        pre {
          overflow: auto;
          padding: 12px;
          border-radius: 8px;
          background: var(--code-editor-background-color, rgba(0,0,0,.06));
        }
      </style>
    `;
  }
}

class FuelGlanceCard extends HTMLElement {
  static getStubConfig() {
    return {
      type: "custom:fuel-glance-card",
      title: "Fuel",
      fuels: [
        {
          name: "Unleaded 91",
          cheapest_price_entity: "sensor.unleaded_91_cheapest_price",
          cheapest_station_entity: "sensor.unleaded_91_cheapest_station"
        },
        {
          name: "Unleaded 95",
          cheapest_price_entity: "sensor.unleaded_95_cheapest_price",
          cheapest_station_entity: "sensor.unleaded_95_cheapest_station"
        },
        {
          name: "Diesel",
          cheapest_price_entity: "sensor.diesel_cheapest_price",
          cheapest_station_entity: "sensor.diesel_cheapest_station"
        }
      ]
    };
  }

  static getConfigElement() {
    return document.createElement("fuel-glance-card-editor");
  }

  setConfig(config) {
    if (!config.fuels || !Array.isArray(config.fuels) || config.fuels.length === 0) {
      throw new Error("Define at least one fuel entry.");
    }

    this._config = {
      title: "Fuel",
      hours_to_show: 168,
      show_station: true,
      ...config
    };
    this._history = new Map();
    this._historyKey = "";
    this._historyLoading = false;
    this._render();
    this._fetchHistory();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
    this._fetchHistory();
  }

  getCardSize() {
    return 2;
  }

  _render() {
    if (!this._config || !this._hass) return;

    const fuels = this._config.fuels.map((fuel, index) => this._fuelView(fuel, index));
    const cheapest = fuels
      .filter((fuel) => fuel.priceNumber !== null)
      .sort((a, b) => a.priceNumber - b.priceNumber)[0];

    this.innerHTML = `
      <ha-card>
        <div class="glance-card">
          <div class="glance-head">
            <div>
              <h2>${escapeHtml(this._config.title)}</h2>
              <span>${escapeHtml(cheapest ? `Cheapest ${cheapest.name}` : "No price data")}</span>
            </div>
            <div class="glance-price">
              <strong>${escapeHtml(cheapest?.priceDisplay || "—")}</strong>
              ${this._config.show_station ? `<small>${escapeHtml(cheapest?.stationName || "No station")}</small>` : ""}
            </div>
          </div>
          <div class="glance-graph" aria-label="7 day fuel price history">
            ${historyGraph(fuels)}
          </div>
          <div class="glance-list">
            ${fuels.map((fuel) => this._fuelRow(fuel, cheapest)).join("")}
          </div>
        </div>
      </ha-card>
      <style>${glanceStyles}</style>
    `;
  }

  _fuelView(config, index) {
    const price = entity(this._hass, config.cheapest_price_entity);
    const station = entity(this._hass, config.cheapest_station_entity);
    const priceNumber = numberState(price);
    const name = config.name || price?.attributes?.fuel_type || station?.attributes?.fuel_type || "Fuel";
    const history = this._history.get(config.cheapest_price_entity) || [];

    return {
      name,
      color: config.color || graphColors[index % graphColors.length],
      priceNumber,
      priceDisplay: priceNumber === null ? "—" : `${priceNumber.toFixed(1)}`,
      stationName: station?.state || price?.attributes?.station || "No station",
      history
    };
  }

  _fuelRow(fuel, cheapest) {
    const isCheapest = cheapest && fuel.name === cheapest.name && fuel.priceNumber === cheapest.priceNumber;
    return `
      <div class="glance-row ${isCheapest ? "is-cheapest" : ""}">
        <span class="glance-swatch" style="background:${escapeHtml(fuel.color)}"></span>
        <span class="glance-name">${escapeHtml(fuel.name)}</span>
        <strong>${escapeHtml(fuel.priceDisplay)}<small> c/L</small></strong>
      </div>
    `;
  }

  async _fetchHistory() {
    if (!this._config || !this._hass?.callWS || this._historyLoading) return;

    const entityIds = this._config.fuels
      .map((fuel) => fuel.cheapest_price_entity)
      .filter(Boolean);
    if (!entityIds.length) return;

    const hours = Number(this._config.hours_to_show) || 168;
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    const key = `${entityIds.join("|")}:${Math.floor(end.getTime() / 300000)}:${hours}`;
    if (key === this._historyKey) return;

    this._historyLoading = true;
    try {
      const response = await this._hass.callWS({
        type: "history/history_during_period",
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        entity_ids: entityIds,
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false
      });

      const nextHistory = new Map();
      entityIds.forEach((entityId, index) => {
        const rows = Array.isArray(response?.[index]) ? response[index] : [];
        nextHistory.set(entityId, rows.map(historyPoint).filter(Boolean));
      });

      this._history = nextHistory;
      this._historyKey = key;
      this._render();
    } catch (error) {
      console.warn("Fuel glance card could not load history", error);
    } finally {
      this._historyLoading = false;
    }
  }
}

class FuelGlanceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    this.innerHTML = `
      <div class="editor">
        <p>Configure this compact card in YAML. Add the three fuel types you want on the kiosk view.</p>
        <pre>type: custom:fuel-glance-card
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
    cheapest_station_entity: sensor.diesel_cheapest_station</pre>
      </div>
      <style>
        .editor {
          padding: 16px;
          color: var(--primary-text-color);
        }
        pre {
          overflow: auto;
          padding: 12px;
          border-radius: 8px;
          background: var(--code-editor-background-color, rgba(0,0,0,.06));
        }
      </style>
    `;
  }
}

function entity(hass, entityId) {
  return entityId ? hass.states[entityId] : undefined;
}

function numberState(stateObj) {
  if (!stateObj || stateObj.state === "unknown" || stateObj.state === "unavailable") return null;
  const value = Number(stateObj.state);
  return Number.isFinite(value) ? value : null;
}

function formatEntityPrice(stateObj) {
  const value = numberState(stateObj);
  return value === null ? "—" : `${value.toFixed(1)} c/L`;
}

function formatDistance(value) {
  const distance = Number(value);
  return Number.isFinite(distance) ? `${distance.toFixed(1)} km` : "—";
}

function formatStationCount(value) {
  const count = Number(value);
  if (!Number.isFinite(count)) return "";
  return `${count} station${count === 1 ? "" : "s"}`;
}

function comparisonView(cheapestState, averageState, cityAttribute, fallback) {
  const state = cheapestState || averageState;
  if (!state) return null;

  const isCheapest = Boolean(cheapestState);
  const city = state.attributes?.[cityAttribute];
  const prefix = city || fallback;
  const stationCount = state.attributes?.station_count;

  return {
    state,
    label: `${prefix} ${isCheapest ? "cheapest" : "average"}`,
    detail: comparisonDetail(isCheapest ? averageState : undefined, stationCount)
  };
}

function comparisonDetail(averageState, stationCount) {
  const parts = [];
  const average = formatEntityPrice(averageState);
  if (average !== "—") parts.push(`Avg ${average}`);
  const count = formatStationCount(stationCount);
  if (count) parts.push(count);
  return parts.join(" · ");
}

function navigationUrl(attrs) {
  const latitude = Number(attrs.latitude);
  const longitude = Number(attrs.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return `https://waze.com/ul?ll=${encodeURIComponent(`${latitude},${longitude}`)}&navigate=yes`;
}

function formatUpdated(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `Updated ${date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

function recommendationLabel(value) {
  const labels = {
    fill_up_now: "Fill up now",
    wait: "Wait",
    dont_fill_up: "Do not fill",
    unknown: "Unknown"
  };
  return labels[value] || value || "Unknown";
}

function recommendationClass(value) {
  if (value === "fill_up_now") return "fill";
  if (value === "dont_fill_up") return "avoid";
  if (value === "wait") return "wait";
  return "unknown";
}

function trendLabel(value) {
  const labels = {
    rising: "Rising",
    falling: "Falling",
    stable: "Stable",
    unknown: "Unknown"
  };
  return labels[value] || value || "Unknown";
}

function trendClass(value) {
  if (value === "rising") return "up";
  if (value === "falling") return "down";
  if (value === "stable") return "flat";
  return "unknown";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function historyPoint(row) {
  const value = Number(row?.s);
  const timestamp = row?.lu || row?.last_changed || row?.last_updated;
  const time = typeof timestamp === "number" ? timestamp * 1000 : new Date(timestamp).getTime();
  if (!Number.isFinite(value) || !Number.isFinite(time)) return null;
  return { time, value };
}

function historyGraph(fuels) {
  const series = fuels.map((fuel) => ({
    ...fuel,
    points: fuel.history.length
      ? fuel.history
      : fuel.priceNumber === null
        ? []
        : [{ time: Date.now(), value: fuel.priceNumber }]
  }));
  const allPoints = series.flatMap((fuel) => fuel.points);
  if (!allPoints.length) {
    return `<div class="glance-empty">No history yet</div>`;
  }

  const minTime = Math.min(...allPoints.map((point) => point.time));
  const maxTime = Math.max(...allPoints.map((point) => point.time));
  const minValue = Math.min(...allPoints.map((point) => point.value));
  const maxValue = Math.max(...allPoints.map((point) => point.value));
  const width = 280;
  const height = 72;
  const pad = 7;
  const valueSpan = Math.max(maxValue - minValue, 1);
  const timeSpan = Math.max(maxTime - minTime, 1);
  const lines = series
    .filter((fuel) => fuel.points.length)
    .map((fuel) => {
      const points = fuel.points.map((point) => {
        const x = pad + ((point.time - minTime) / timeSpan) * (width - pad * 2);
        const y = height - pad - ((point.value - minValue) / valueSpan) * (height - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ");
      return `<polyline points="${points}" fill="none" stroke="${escapeHtml(fuel.color)}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />`;
    })
    .join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img">
      <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" />
      ${lines}
    </svg>
  `;
}

const graphColors = ["#14b8a6", "#f97316", "#3b82f6", "#a855f7", "#ef4444"];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');

  .fuel-card {
    padding: 16px;
    color: var(--primary-text-color);
    font-family: 'JetBrains Mono', monospace;
  }

  .header {
    margin-bottom: 12px;
  }

  h2, h3 {
    margin: 0;
    letter-spacing: 0;
  }

  h2 {
    font-size: 1.2rem;
    font-weight: 700;
  }

  h3 {
    font-size: 1rem;
    font-weight: 700;
  }

  .recommendation {
    border-radius: 8px;
  }

  .fuel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 12px;
  }

  .fuel-panel {
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    padding: 13px;
    background: var(--card-background-color);
  }

  .fuel-top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
  }

  .price {
    font-size: 1.45rem;
    font-weight: 800;
    line-height: 1;
    color: var(--primary-color);
    white-space: nowrap;
  }

  .trend {
    display: inline-flex;
    margin-top: 5px;
    font-size: .75rem;
    font-weight: 700;
  }

  .trend.up { color: #b45309; }
  .trend.down { color: #047857; }
  .trend.flat { color: #2563eb; }
  .trend.unknown { color: var(--secondary-text-color); }

  .recommendation {
    margin-top: 12px;
    padding: 10px;
    display: grid;
    gap: 2px;
  }

  .recommendation span {
    font-weight: 800;
    font-size: .9rem;
  }

  .recommendation small {
    line-height: 1.35;
  }

  .fill {
    background: rgba(22, 163, 74, .14);
    color: #166534;
  }

  .wait {
    background: rgba(37, 99, 235, .13);
    color: #1d4ed8;
  }

  .avoid {
    background: rgba(220, 38, 38, .13);
    color: #991b1b;
  }

  .unknown {
    background: rgba(100, 116, 139, .13);
    color: var(--secondary-text-color);
  }

  .metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 12px;
  }

  .metrics div {
    min-width: 0;
    border-radius: 8px;
    background: rgba(127, 127, 127, .09);
    padding: 9px 8px;
  }

  .metrics span {
    display: block;
    font-size: .72rem;
    color: var(--secondary-text-color);
  }

  .metrics strong {
    display: block;
    margin-top: 2px;
    font-size: .88rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .comparison-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 8px;
    margin-top: 8px;
  }

  .comparison-metrics div {
    min-width: 0;
    border-radius: 8px;
    border: 1px solid var(--divider-color);
    padding: 9px 8px;
  }

  .comparison-metrics span,
  .comparison-metrics small {
    display: block;
    color: var(--secondary-text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .comparison-metrics span {
    font-size: .72rem;
  }

  .comparison-metrics strong {
    display: block;
    margin-top: 2px;
    font-size: .9rem;
    color: var(--primary-text-color);
  }

  .comparison-metrics small {
    margin-top: 2px;
    font-size: .7rem;
  }

  .station {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--divider-color);
  }

  .station-link {
    color: inherit;
    text-decoration: none;
  }

  .station-main {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .station-main strong,
  .station-main span,
  .station-main em {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .station-main strong {
    font-size: .95rem;
    white-space: nowrap;
  }

  .station-main span {
    color: var(--secondary-text-color);
    font-size: .8rem;
    line-height: 1.3;
  }

  .station-main em {
    color: var(--secondary-text-color);
    font-size: .76rem;
    font-style: normal;
  }

  .map-link {
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--primary-color);
    color: var(--text-primary-color);
    text-decoration: none;
    font-size: 1.7rem;
    line-height: 1;
  }

  @media (max-width: 520px) {
    .fuel-card {
      padding: 12px;
    }

    .fuel-grid {
      grid-template-columns: 1fr;
    }

    .price {
      font-size: 1.25rem;
    }
  }
`;

const glanceStyles = `
  .glance-card {
    padding: 12px;
    color: var(--primary-text-color);
    font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
  }

  .glance-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .glance-head h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: 0;
  }

  .glance-head span,
  .glance-price small {
    display: block;
    color: var(--secondary-text-color);
    font-size: .72rem;
    line-height: 1.25;
  }

  .glance-price {
    min-width: 76px;
    text-align: right;
  }

  .glance-price strong {
    display: block;
    color: var(--primary-color);
    font-size: 1.45rem;
    font-weight: 800;
    line-height: 1;
    white-space: nowrap;
  }

  .glance-price strong::after {
    content: " c/L";
    font-size: .7rem;
    font-weight: 700;
    color: var(--secondary-text-color);
  }

  .glance-price small {
    max-width: 118px;
    margin-top: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .glance-graph {
    height: 78px;
    margin-top: 8px;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    background: rgba(127, 127, 127, .07);
    overflow: hidden;
  }

  .glance-graph svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .glance-graph line {
    stroke: var(--divider-color);
    stroke-width: 1;
  }

  .glance-empty {
    height: 100%;
    display: grid;
    place-items: center;
    color: var(--secondary-text-color);
    font-size: .78rem;
  }

  .glance-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    margin-top: 8px;
  }

  .glance-row {
    min-width: 0;
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr);
    grid-template-rows: auto auto;
    align-items: center;
    column-gap: 6px;
    padding: 7px 6px;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    background: var(--card-background-color);
  }

  .glance-row.is-cheapest {
    border-color: var(--primary-color);
    background: rgba(var(--rgb-primary-color, 33, 150, 243), .08);
  }

  .glance-swatch {
    grid-row: 1 / 3;
    width: 8px;
    height: 28px;
    border-radius: 8px;
  }

  .glance-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--secondary-text-color);
    font-size: .68rem;
    line-height: 1.15;
  }

  .glance-row strong {
    margin-top: 1px;
    font-size: .96rem;
    line-height: 1;
    white-space: nowrap;
  }

  .glance-row small {
    color: var(--secondary-text-color);
    font-size: .62rem;
    font-weight: 700;
  }

  @media (max-width: 420px) {
    .glance-card {
      padding: 10px;
    }

    .glance-list {
      grid-template-columns: 1fr;
    }

    .glance-row {
      grid-template-columns: 8px minmax(0, 1fr) auto;
      grid-template-rows: auto;
    }

    .glance-swatch {
      grid-row: auto;
      height: 18px;
    }

    .glance-row strong {
      margin-top: 0;
      text-align: right;
    }
  }
`;

customElements.define("fuel-tracker-card", FuelTrackerCard);
customElements.define("fuel-tracker-card-editor", FuelTrackerCardEditor);
customElements.define("fuel-glance-card", FuelGlanceCard);
customElements.define("fuel-glance-card-editor", FuelGlanceCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "fuel-tracker-card",
  name: "Fuel Tracker Card",
  description: "A Lovelace card for fuel price tracker entities."
});
window.customCards.push({
  type: "fuel-glance-card",
  name: "Fuel Glance Card",
  description: "A compact kiosk card comparing fuel prices with a 7 day history graph."
});

console.info(`%c FUEL-TRACKER-CARD %c ${CARD_VERSION} `, "color: white; background: #2563eb; font-weight: 700;", "color: white; background: #111827;");
