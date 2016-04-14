# theo loader for webpack

A webpack loader that transforms Design Tokens files using [Salesforce's theo](https://github.com/salesforce-ux/theo).

[![Build Status](https://img.shields.io/travis/Autodesk/theo-loader/master.svg)](https://travis-ci.org/Autodesk/theo-loader)
[![NPM Version](https://img.shields.io/npm/v/theo-loader.svg)](https://www.npmjs.com/package/theo-loader)
[![Dependencies](https://david-dm.org/Autodesk/theo-loader.svg)](https://david-dm.org/Autodesk/theo-loader)

## Installation

```bash
npm install --save-dev webpack theo theo-loader
```

__Note:__ [npm](https://npmjs.com) deprecated
[auto-installing of peerDependencies](https://github.com/npm/npm/issues/6565) from npm@3, so required peer dependencies like theo and webpack must be listed explicitly in your `package.json`.

## Usage

`props.json`
```json
{
  "aliases": {
    "WHITE": "#FFFFFF",
    "LINK_WATER": "#F4F6F9"
  },
  "props": {
    "COLOR_BACKGROUND": {
      "value": "{!LINK_WATER}",
      "comment": "Default background color for the whole app."
    },
    "COLOR_BACKGROUND_ALT": {
      "value": "{!WHITE}",
      "comment": "Second default background color for the app."
    }
  },
  "global": {
    "type": "color",
    "category": "background"
  }
}
```

``` javascript
var props = require("theo!./props.json");
// => {
//  COLOR_BACKGROUND: "rgb(244, 246, 249)",
//  COLOR_BACKGROUND_ALT: "rgb(255, 255, 255)"
// }
```

[Documentation: Using loaders](http://webpack.github.io/docs/using-loaders.html)

## Formats and Transforms

The loader uses the `web` transform and `json` format by default. You can specify another transform or format in the query parameters:

```javascript
var props = require("theo?transform=web&format=scss!./props.json");
// => "$color-background: rgb(244, 246, 249);\n$color-background-alt: rgb(255, 255, 255);"
```

You can specify options to pass to the `transform` and `format` plugins in `webpack.config.js`:

```javascript
module.exports = {
  ...
  module: {
    loaders: [
      {
        test: /\.json$/,
        loaders: ["theo"]
      }
    ]
  },

  theo: {
    outputFormats: [
      {
        transform: 'web',
        format: 'scss',
        formatOptions: {
          propsMap: function (prop) {
            prop.name = 'PREFIX_' + prop.name;
            return prop;
          }
        }
      }
    ]
  }
};
```

Each entry in the `outputFormats` array can contain the following keys and values:

- `transform`: A valid theo transform
- `format`: A valid theo format
- `transformOptions`: An options object that will be passed to the theo transform plugin
- `formatOptions`: An options object that will be passed to the theo format plugin

When loading a particular file, theo-loader will use the `formatOptions` and `transformOptions` from the `outputFormats` entry that matches the current `transform` and `format`. If there are multiple entries in the outputFormat array that have the same `transform` and `format`, only the first will be used.

See the [theo documentation](https://github.com/salesforce-ux/theo) for more information about the available options for the `transform` and `format` plugins.

## theo Initialization

You can perform any initialization for theo, like registering custom transforms or formatters using `registerTransform`, `registerValueTransform` or `registerFormat`, outside of theo-loader. In `webpack.config.js`, for example:

```javascript
var theo = require('theo');

// Do any theo initialization here
theo.registerValueTransform('animation/web/curve',
  function (prop) {
    return prop.type === 'animation-curve'
  },
  function (prop) {
    return 'cubic-bezier(' + prop.value.join(', ') + ')';
  }
);

module.exports = {
  ...
  module: {
    loaders: [
      {
        test: /\.json$/,
        loaders: ["theo"]
      }
    ]
  },

  theo: {
    // Configure theo-loader here
    ...
  }
}
```
