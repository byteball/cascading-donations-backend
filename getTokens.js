const { default: axios } = require("axios")
const conf = require('ocore/conf.js');
const store = require('./tokensStore');
const DAG = require('aabot/dag.js');

module.exports = async () => {
  let obyteTokens = await axios.get(conf.token_price_url).then(({ data }) => Object.keys(data.data));

  const data = {
    Obyte: {}
  };

  const decimalsGetters = [];

  const symbolGetters = obyteTokens.map((asset) => DAG.readAAStateVar(conf.token_registry_AA_address, `a2s_${asset}`).then((symbol) => {
    if (symbol) {
      data.Obyte[asset] = { symbol };
      decimalsGetters.push(
        DAG.readAAStateVar(conf.token_registry_AA_address, `current_desc_${asset}`)
        .then((descHash) => descHash && DAG.readAAStateVar(conf.token_registry_AA_address, `decimals_${descHash}`)
        .then((decimals) => data.Obyte[asset].decimals = decimals || 0))
      )
    }
  }));

  await Promise.all(symbolGetters);
  await Promise.all(decimalsGetters);

  const bridges = await axios.get(conf.bridge_url).then(({ data }) => data.data);

  bridges.forEach(async (bridge) => {
    if (bridge.foreign_network === "Obyte" && (!(bridge.foreign_asset in data.Obyte))) {
      data.Obyte[bridge.foreign_asset] = { symbol: bridge.foreign_symbol, decimals: bridge.foreign_asset_decimals }
    }

    if (bridge.home_network === "Obyte" && bridge.foreign_network !== "Obyte" && (!data[bridge.foreign_network] || !(bridge.foreign_asset in data[bridge.foreign_network]))) {
      if (!(bridge.foreign_network in data)){
        data[bridge.foreign_network] = {};
      }

      data[bridge.foreign_network][bridge.foreign_asset] = {
        asset: bridge.foreign_asset,
        symbol: bridge.foreign_symbol,
        decimals: bridge.foreign_asset_decimals,
        network: bridge.foreign_network,
        obyte_asset: bridge.home_asset,
      }
    }

    if (bridge.foreign_network === "Obyte" && bridge.home_network !== "Obyte" && (!data[bridge.home_network] || !(bridge.home_asset in data[bridge.home_network]))) {

      if (!(bridge.home_network in data)) {
        data[bridge.home_network] = {};
      }

      data[bridge.home_network][bridge.home_asset] = {
        symbol: bridge.home_symbol,
        decimals: bridge.home_asset_decimals,
        obyte_asset: bridge.foreign_asset,
      }
    }
  });

  store.update(data);
}