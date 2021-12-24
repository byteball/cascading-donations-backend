const { searchRepos } = require("../utils");
const conf = require('ocore/conf.js');

const CACHE_STORAGE_TIME = 20; // minutes
const GITHUB_SEARCH_RATE_LIMIT = 28; // req/min for 1 token


const limiter = {
  limits: conf.github_tokens.reduce((a, v) => ({ ...a, [v]: GITHUB_SEARCH_RATE_LIMIT }), {}),
  minute: new Date().getMinutes(),
  requests: {},
  lastCacheClearTime: Date.now() / 1000
}

module.exports = async (request, reply) => {
  const currentMinute = new Date().getMinutes();
  const query = request.query.q;

  if (!query) return reply.badRequest();

  if (currentMinute !== limiter.minute) {
    limiter.limits = conf.github_tokens.reduce((a, v) => ({ ...a, [v]: GITHUB_SEARCH_RATE_LIMIT }), {});
    limiter.minute = currentMinute;
  }

  if ((limiter.lastCacheClearTime + CACHE_STORAGE_TIME * 60) < (Date.now() / 1000)) {
    limiter.requests = {};
    limiter.lastCacheClearTime = Date.now() / 1000;
  }

  if (!(query in limiter.requests)) {
    // this request is not in the cache
    const activeToken = Object.keys(limiter.limits).find((token) => limiter.limits[token] > 0);

    if (activeToken) {
      let data = [];

      try {
        data = await searchRepos(query, activeToken);
      } catch (e) {
        limiter.limits[activeToken] = 0;

        return reply.tooManyRequests();
      }

      limiter.requests[query] = data;
      limiter.limits[activeToken] = limiter.limits[activeToken] - 1;

      reply.send({ data, limit: Object.values(limiter.limits).reduce((previousValue, currentValue) => previousValue + currentValue) });
    } else {
      reply.tooManyRequests();
    }
  } else {
    // Sending the result from the cache
    return {
      data: limiter.requests[query],
      limit: Object.values(limiter.limits).reduce((previousValue, currentValue) => previousValue + currentValue)
    };
  }
}