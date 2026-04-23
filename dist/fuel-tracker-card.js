const CARD_VERSION = "0.1.0";

class FuelTrackerCard extends HTMLElement {
  static getStubConfig() {
    return {
      type: "custom:fuel-tracker-card",
      title: "Fuel Tracker",
      fuels: [
        {
          name: "Unleaded 98",
          cheapest_price_entity: "sensor.premium_unleaded_98_cheapest_price",
          cheapest_station_entity: "sensor.premium_unleaded_98_cheapest_station",
          recommendation_entity: "sensor.premium_unleaded_98_recommendation",
          trend_entity: "sensor.premium_unleaded_98_trend",
          average_price_entity: "sensor.premium_unleaded_98_average_price"
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
      title: "Fuel Tracker",
      show_header: true,
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
          ${this._config.show_header ? this._header() : ""}
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
    const mapUrl = attrs.latitude && attrs.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${attrs.latitude},${attrs.longitude}`)}`
      : null;

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

        ${this._config.show_station_details ? this._stationBlock(fuel, attrs, mapUrl) : ""}
      </section>
    `;
  }

  _stationBlock(fuel, attrs, mapUrl) {
    const stationName = fuel.station?.state || "No station";
    const brand = attrs.brand || "";
    const address = attrs.address || "";
    const updated = attrs.last_updated ? formatUpdated(attrs.last_updated) : "";

    return `
      <div class="station">
        <div class="station-main">
          <strong>${escapeHtml(stationName)}</strong>
          <span>${escapeHtml([brand, address].filter(Boolean).join(" · "))}</span>
          ${this._config.show_updated && updated ? `<em>${escapeHtml(updated)}</em>` : ""}
        </div>
        ${mapUrl ? `<a class="map-link" href="${mapUrl}" target="_blank" rel="noreferrer" title="Open map">›</a>` : ""}
      </div>
    `;
  }

  _fuelView(config) {
    const price = entity(this._hass, config.cheapest_price_entity);
    const station = entity(this._hass, config.cheapest_station_entity);
    const recommendation = entity(this._hass, config.recommendation_entity);
    const trend = entity(this._hass, config.trend_entity);
    const average = entity(this._hass, config.average_price_entity);

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
      averageDisplay: formatEntityPrice(average)
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
title: Fuel Tracker
fuels:
  - name: Unleaded 98
    cheapest_price_entity: sensor.premium_unleaded_98_cheapest_price
    cheapest_station_entity: sensor.premium_unleaded_98_cheapest_station
    recommendation_entity: sensor.premium_unleaded_98_recommendation
    trend_entity: sensor.premium_unleaded_98_trend
    average_price_entity: sensor.premium_unleaded_98_average_price</pre>
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

const styles = `
  .fuel-card {
    padding: 16px;
    color: var(--primary-text-color);
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

  .station {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--divider-color);
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

customElements.define("fuel-tracker-card", FuelTrackerCard);
customElements.define("fuel-tracker-card-editor", FuelTrackerCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "fuel-tracker-card",
  name: "Fuel Tracker Card",
  description: "A Lovelace card for fuel price tracker entities."
});

console.info(`%c FUEL-TRACKER-CARD %c ${CARD_VERSION} `, "color: white; background: #2563eb; font-weight: 700;", "color: white; background: #111827;");
