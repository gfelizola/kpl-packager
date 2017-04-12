'use strict';

const Fetchival = require('fetchival');
Fetchival.fetch = require('node-fetch');

let ghApi = Fetchival('https://api.github.com', {
    headers: {
        'Authorization' : 'token d0204e9f190df5f54bc35059f4b60fd17f2a0473',
        'Accept'        : 'application/vnd.github.black-cat-preview+json'
    }
});

module.exports = ghApi;