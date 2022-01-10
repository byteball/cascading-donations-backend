const { default: axios } = require("axios")
const conf = require('ocore/conf.js');
const store = require('./tokensStore');
const DAG = require('aabot/dag.js');

const AddressZero = "0x0000000000000000000000000000000000000000";

const nativeSymbols = {
  Ethereum: 'ETH',
  BSC: 'BNB',
  Polygon: 'MATIC',
};

const coingeckoChainIds = {
  Ethereum: 'ethereum',
  BSC: 'binance-smart-chain',
  Polygon: 'polygon-pos',
};

module.exports = async () => {
  const obyteTokensPrice = await axios.get(conf.token_price_url).then(({ data }) => data.data);
  const obyteTokens = Object.keys(obyteTokensPrice);

  const data = {
    Obyte: {
      base: { symbol: "GBYTE", decimals: 9, price: obyteTokensPrice.base || null }
    }
  };

  const decimalsGetters = [];

  const symbolGetters = obyteTokens.map((asset) => DAG.readAAStateVar(conf.token_registry_AA_address, `a2s_${asset}`).then((symbol) => {
    if (symbol) {
      data.Obyte[asset] = { symbol, price: obyteTokensPrice[asset] || null };
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
      if (!(bridge.foreign_network in data)) {
        data[bridge.foreign_network] = {};
      }

      data[bridge.foreign_network][bridge.foreign_asset] = {
        asset: bridge.foreign_asset,
        symbol: bridge.foreign_symbol,
        decimals: bridge.foreign_asset_decimals,
        network: bridge.foreign_network,
        obyte_asset: bridge.home_asset,
        price: bridge.home_asset === "base" ? obyteTokensPrice.base : null
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
        price: bridge.foreign_asset === "base" ? obyteTokensPrice.base : null
      }
    }
  });

  const foreignNetworks = Object.keys(data).filter((n) => n !== "Obyte")

  const priceGetters = [];
  foreignNetworks.forEach((network) => {
    Object.keys(data[network]).forEach(asset => {
      priceGetters.push(
        getPriceTokens(asset, network).then(price => {
          if (price){
            data[network][asset].price = price || null;
          } else if (!data[network][asset].price) {
            data[network][asset].price = null;
          }
          const obyte_asset = data[network][asset].obyte_asset;
          if (obyte_asset && (obyte_asset in data.Obyte) && price) {
            data.Obyte[obyte_asset].price = price;
          }
        })
      )
    })
  })

  Promise.all(priceGetters);

  store.update(data);
}

const fetchCryptocompareExchangeRate = async (in_currency, out_currency) => {
  const { data } = await axios.get(`https://min-api.cryptocompare.com/data/price?fsym=${in_currency}&tsyms=${out_currency}`)
  if (!data[out_currency])
    throw new Error(`no ${out_currency} in response ${JSON.stringify(data)}`);
  return data[out_currency]
}

const fetchERC20ExchangeRate = async (chain, token_address, quote) => {
  let newTokenAddress;
  if (token_address === '0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b') // USDC rinkeby
    newTokenAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
  if (token_address === '0xbF7A7169562078c96f0eC1A8aFD6aE50f12e5A99') // BAT rinkeby
    newTokenAddress = '0x0D8775F648430679A709E98d2b0Cb6250d2887EF';
  if (token_address === '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee') // BUSD testnet
    newTokenAddress = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
  if (token_address === '0xB554fCeDb8E4E0DFDebbE7e58Ee566437A19bfB2') // DAI devnet
    newTokenAddress = '0x6b175474e89094c44da98b954eedeac495271d0f';
  const { data } = await axios.get(`https://api.coingecko.com/api/v3/coins/${chain}/contract/${(newTokenAddress || token_address).toLowerCase()}`)
  const prices = data.market_data.current_price

  quote = quote.toLowerCase()
  if (!prices[quote])
    throw new Error(`no ${quote} in response ${JSON.stringify(data)}`);
  return prices[quote]
}

async function tryGetTokenPrice(network, token_address, nativeSymbol) {
  switch (network) {
    case 'Ethereum':
    case 'BSC':
    case 'Polygon':
      try {
        const chain = coingeckoChainIds[network];
        return await fetchERC20ExchangeRate(chain, token_address, nativeSymbol);
      }
      catch (e) {
        console.log(`fetchERC20ExchangeRate for ${network} ${token_address}/${nativeSymbol} failed`, e);
        break;
      }

    default: {
      break;
    }
  }
  return null;
}

const getPriceTokens = async (asset, network) => {
  if (Object.keys(nativeSymbols).includes(network)) {
    if (asset === AddressZero) {
      try {
        return await fetchCryptocompareExchangeRate(nativeSymbols[network], 'USD');
      } catch {
        return null
      }
    } else {
      return await tryGetTokenPrice(network, asset, 'USD');
    }
  } else {
    return null
  }
}