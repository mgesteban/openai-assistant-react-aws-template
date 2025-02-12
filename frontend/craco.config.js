const path = require('path');

module.exports = {
  style: {
    postcss: {
      mode: 'file', // This tells CRACO to look for a postcss.config.js file
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: {
      module: {
        rules: [
          {
            type: 'javascript/auto',
            test: /\.mjs$/,
            include: /node_modules/,
          },
        ],
      },
    },
  },
}
