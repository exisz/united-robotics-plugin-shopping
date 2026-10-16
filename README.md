# Shopping · Capital plugin

Independent lightweight management UI for Neighbourhood Market. Four independent Capital windows: orders, products, campaigns, settings. React and CSS are isolated in Shadow DOM and bundled with the plugin. No additional login or daemon.

The existing local connector injects `SHOP_ADMIN_TOKEN` from Capital's Secret Manager. One-shot backend calls the existing shopping-service oRPC HTTP API at a fixed origin; the browser never receives the credential. Authentication follows Capital's installed-plugin access policy.

`npm ci && npm run check` builds pinned sibling `dist/manifest.json`, `plugin.js`, `rpc.mjs` and tests protocol validation, secret absence/leakage, current-data rendering, failures, and stale-edit refusal. Publish canonical main and pin all panel definitions to an exact Git SHA. Props windows: `orders`, `products`, `campaigns`, `settings`.

Order detail includes fulfillment address, time, contact, items, totals; permitted transitions and full refunds require a visible confirmation. Campaigns expose per-period minimum order, free shipping and collective target, products and fixed pickup/delivery slots. Editing fields uses AUD; API stores cents. Dates use Australia/Sydney. Published periods with orders retain server-enforced immutable rules and dates.

Saving compares the original entity revision before writing, then reads the result back. This is an optimistic preflight, not atomic compare-and-swap: concurrent CLI changes between check and write can still race. Orders display the latest 1000 records. No invented records on read failure. Existing CLI stays available.

Installation: declare `localPlugins.shopping.requiredSecrets=[{"key":"SHOP_ADMIN_TOKEN","label":"商城管理 API"}]` in instance connectors.json; store the existing token using the instance Secret Manager. Add independent panel definitions with `props.window`. No source credentials in plugin files, props, plugin-data or public artifacts.

Rollback: remove the four shopping panel/layout declarations or restore the previous immutable revision; preserve the service database and existing secret store. The plugin does not migrate commerce data.
