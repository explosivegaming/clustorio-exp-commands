# Explosive Gaming Util for Clustorio

This is a plugin for [Clustorio](https://github.com/clusterio/clusterio) which provides utility methods for other lua modules.

## Installation 

To use this plugin you must already have a clustorio instance running, see [here](https://github.com/clusterio/clusterio?tab=readme-ov-file#installation) for clustorio installation instructions.

This module is currently not published and therefore can not be installed via `npm`. Instead follow the steps for [building from source](#building-from-source)

## Building from source

1) Create a `external_plugins` directory within your clustorio instance.
2) Clone this repository into that directory: `git clone https://github.com/explosivegaming/clustorio-exp-util`
3) Install the package dev dependencies: `npm install`
4) Build the plugin: `npm run prepare`
5) Add the plugin to your clustorio instance: `npx clustorioctl plugin add ./external_plugins/clustorio-exp-util`

## Contributing 

See [Contributing](CONTRIBUTING.md) for how to make pull requests and issues.
