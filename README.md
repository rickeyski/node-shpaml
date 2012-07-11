# node-shpaml

A command line interface and npm package for shpaml.
A context free and simplified fork of Haml

## Install

To use shpaml from any location (for npm v1.x) you need to install using the global (-g) flag.

    npm install -g shpaml

## Usage

    shpaml --outfile? files...

You can also require shpaml itself as a module.

    var shpaml = require('shpaml');

The outfile option creates a file with the same name but with .html,
otherwise, default writes to stdout

