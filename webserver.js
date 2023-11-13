const conf = require('ocore/conf.js');
const fastify = require('fastify');
const CORS = require('@fastify/cors');
const fastifySensible = require('@fastify/sensible');

const bannerController = require('./controllers/bannerController.js');
const popularController = require('./controllers/popularController.js');
const tokensController = require('./controllers/tokensController.js');
const searchController = require('./controllers/searchController.js');
const recentController = require('./controllers/recentController.js');
const repoRecentController = require('./controllers/repoRecentController.js');
const totalDonatedController = require('./controllers/totalDonatedController.js');
const donationsController = require('./controllers/donationsController.js');

// Create instance
const fastifyInstance = fastify({ logger: false });

// CORS
fastifyInstance.register(CORS);

// register error generator
fastifyInstance.register(fastifySensible);

// Declare routes
fastifyInstance.get('/popular', popularController);
fastifyInstance.get('/banner', bannerController);
fastifyInstance.get('/banner/:owner/:repo', bannerController);
fastifyInstance.get('/tokens', tokensController);
fastifyInstance.get('/search', searchController);
fastifyInstance.get('/recent/:page?', recentController);
fastifyInstance.get('/recent/:owner/:repo/:page?', repoRecentController);
fastifyInstance.get('/total_donated', totalDonatedController);
fastifyInstance.get('/donations', donationsController);

// Run the server
module.exports = async () => {
  try {
    await fastifyInstance.listen({ port: conf.webserverPort });
  } catch (err) {
    fastifyInstance.log.error(err);
    process.exit(1);
  }
}