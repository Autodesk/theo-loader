# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [2.0.0]

- Updated minimum `theo` peerDependency package version to `6.0.0-beta`. ([#87](https://github.com/Autodesk/theo-loader/issues/87))

### :bangbang: Breaking changes with 1.x

#### Updated Theo to v6

Support for previous versions has been dropped. For information on the changes included with theo@6 and how to migrate from previous versions, please see [the Theo documentation](https://raw.githubusercontent.com/salesforce-ux/theo).

**Additional Notes**:

- Theo no longer has a `json` format, so the default format for theo-loader has been changed to `common.js` which behaves similarly.

## [1.0.0]

- Updated minimum `webpack` peerDependency package version to `2.4.1`

### :bangbang: Breaking changes with 0.x

#### Webpack v2 now required

Webpack 2 is now required for theo-loader. For instructions on upgrading from previous versions of webpack, please see [the migration guide](https://webpack.js.org/guides/migrating/).

**Additional Notes**:

- Options for theo-loader are now specified in the `LoaderOptionsPlugin`
- Props passed to `propsFilter` and `propsMap` format options are now [Immutable.js Maps](https://facebook.github.io/immutable-js/docs/#/Map) instead of plain javascript objects.
