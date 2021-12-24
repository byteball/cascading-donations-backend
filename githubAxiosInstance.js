const axios = require('axios');
const conf = require('ocore/conf.js');

module.exports = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: `token ${conf.github_tokens[0]}`,
    "User-Agent": "CASCADING DONATION",
    "Content-Type": "application/json"
  }
});