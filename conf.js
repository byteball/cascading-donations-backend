/*jslint node: true */
"use strict";
exports.bServeAsHub = false;
exports.bLight = true;
exports.bNoPassphrase = true;
exports.webPort = null;

exports.testnet = process.env.testnet == "1";

exports.hub = process.env.testnet ? 'obyte.org/bb-test' : 'obyte.org/bb';

exports.enableNotificationDiscord = true;
exports.aa_address = process.env.testnet ? "IQDBISPZ555IZZNABYJSRWOF5ICFTQKW" : "CHF2P27TMLTZ43KZ3BV5VSPT2ARIDCWC";

exports.discord_channels = [process.env.discord_channel];
exports.discord_token = process.env.discord_token;

exports.token_registry_AA_address = "O6H6ZIFI57X3PLTYHOCVYPP5A553CYFQ"

exports.frontend_url = process.env.frontend_url;
exports.webserverPort = process.env.webserverPort;

exports.github_tokens = process.env.github_tokens ? process.env.github_tokens.split(",") : [];

exports.token_price_url = process.env.testnet ? "https://testnet.ostable.org/r/prices" : "https://referrals.ostable.org/prices";
exports.bridge_url = process.env.testnet ? "https://testnet-bridge.counterstake.org/api/bridges" : "https://counterstake.org/api/bridges";

exports.watchedUsers = process.env.watchedUsers ? process.env.watchedUsers.split(/\s*,\s*/) : [];
exports.watchedRepos = process.env.watchedRepos ? process.env.watchedRepos.split(/\s*,\s*/) : [];

console.log('finished server conf');
