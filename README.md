# theo loader for webpack

[![Greenkeeper badge](https://badges.greenkeeper.io/Autodesk/theo-loader.svg)](https://greenkeeper.io/)

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
import designTokens from 'theo-loader!./props.json'
// => {
//  COLOR_BACKGROUND: "rgb(244, 246, 249)",
//  COLOR_BACKGROUND_ALT: "rgb(255, 255, 255)"
// }
```

[Documentation: Using loaders](http://webpack.github.io/docs/using-loaders.html)

## Formats and Transforms

The loader uses the `web` transform and `common.js` format by default. You can specify another transform or format in the query parameters:

```javascript
import designTokens from 'theo-loader?{"transform":{"type":"web"},"format":{"type":"scss"}!./props.json';
// => "$color-background: rgb(244, 246, 249);\n$color-background-alt: rgb(255, 255, 255);"
```

or you can use the shorthand:

```javascript
import designTokens from 'theo-loader?transform=web&format=scss!./props.json';
// => "$color-background: rgb(244, 246, 249);\n$color-background-alt: rgb(255, 255, 255);"
```

You can specify other options to pass to theo via the `LoaderOptionsPlugin` in your webpack configuration:

`webpack.config.js`
```javascript
module.exports = {
  ...
  module: {
    rules: [
      {
        test: /\.json$/,
        loader: "theo-loader"
      }
    ]
  },

  plugins: [
    new webpack.LoaderOptionsPlugin({
      options: {
        theo: {
          // These options will be passed to Theo in all instances of theo-loader
          transform: {
            type: 'web'
          },

          // `getOptions` will be called per import
          // `prevOptions` will be a merged object of the options specified
          // above, as well as any passed to the loader via query string
          getOptions: (prevOptions) => {
            let newOptions = prevOptions;

            const formatOptions = (prevOptions && prevOptions.format) || {};
            const formatType = format.type;

            if (formatType === 'scss') {
              newOptions = {
                ...prevOptions,
                format: {
                  ...formatOptions,
                  // SCSS variables will be named by applying 'PREFIX_' to the
                  // front of the token name
                  propsMap: prop => prop.update('name', name => `PREFIX_${name}`)
                },
              };
            }

            return newOptions;
          }
        }
      }
    })
  ]
};
```

See the [theo documentation](https://github.com/salesforce-ux/theo) for more information about the Theo options format.

## theo Initialization

You can perform any initialization for theo, like registering custom transforms or formatters using `registerTransform`, `registerValueTransform` or `registerFormat`, in your webpack configuration:

```javascript
import theo from 'theo';

// Do any theo initialization here
theo.registerValueTransform(
  'animation/web/curve',
  prop => prop.get('type') === 'animation-curve',
  prop => 'cubic-bezier(' + prop.get('value').join(', ') + ')'
);

module.exports = {
  ...
  module: {
    rules: [
      {
        test: /\.json$/,
        loader: "theo-loader"
      }
    ]
  },

  plugins: {
    new webpack.LoaderOptionsPlugin({
      options: {
        theo: {
          // Configure theo-loader here
          ...
        }
      }
    })
  }
}
```
