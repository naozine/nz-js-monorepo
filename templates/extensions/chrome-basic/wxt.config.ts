import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    side_panel: {
      default_path: 'entrypoints/sidepanel/index.html'
    },
    devtools_page: 'entrypoints/devtools/index.html',
    permissions: ['storage', 'tabs']
  },
});
