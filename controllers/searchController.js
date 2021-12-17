const { searchRepos } = require("../utils");

const CACHE_STORAGE_TIME = 5; // minutes
const GITHUB_SEARCH_RATE_LIMIT = 28; // req/min

let limiter = {
  limit: GITHUB_SEARCH_RATE_LIMIT,
  minute: new Date().getMinutes(),
  requests: {},
  lastCacheClearTime: Date.now() / 1000
}

module.exports = async (request, reply) => {
  const currentMinute = new Date().getMinutes();
  const query = request.query.q;

  reply.headers({
    'Cache-Control': 'public, max-age=3600',
  })

  if (!query) return reply.badRequest();

  if (!(query in limiter.requests)) {
    // this request is not in the cache
    if ((limiter.limit > 0 && limiter.minute === currentMinute || currentMinute !== limiter.minute)) {
      let data = [];

      try {
        data = await searchRepos(query);
      } catch {
        limiter.limit = 0;
        return reply.tooManyRequests();
      }

      if (currentMinute !== limiter.minute) {
        // Resetting the rate limit of the github
        limiter.limit = GITHUB_SEARCH_RATE_LIMIT;
        limiter.minute = currentMinute;

        if (limiter.lastCacheClearTime + CACHE_STORAGE_TIME * 60 > Date.now() / 1000) {
          // add query result to cache
          limiter.requests[query] = data;
        } else {
          // clear cache
          limiter.requests = {
            [query]: data
          };

          limiter.lastCacheClearTime = Date.now() / 1000;
        }
      } else {
        limiter.limit = limiter.limit - 1;
        limiter.requests[query] = data;
      }
      reply.send({ data, limit: limiter.limit });
    } else {
      reply.tooManyRequests();
    }
  } else {
    if (currentMinute !== limiter.minute) {
      limiter.limit = GITHUB_SEARCH_RATE_LIMIT;
      limiter.minute = currentMinute;
    }
    // Sending the result from the cache
    return {
      data: limiter.requests[query],
      limit: limiter.limit
    };
  }
}