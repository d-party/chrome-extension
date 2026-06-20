import type { Preview } from "@storybook/react-vite";

import "../src/presentation/popup/styles.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
  },
};

export default preview;
