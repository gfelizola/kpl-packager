'use strict';

const Fetchival = require('fetchival');
Fetchival.fetch = require('node-fetch');

let ghApi = Fetchival('https://api.github.com', {
    headers: {
        'Authorization' : 'token ' + process.env.GITHUB_API_TOKEN,
        'Accept'        : 'application/vnd.github.black-cat-preview+json'
    }
});

module.exports = ghApi;