const conf = require('ocore/conf.js');
const fastify = require('fastify');
const CORS = require('fastify-cors');
const fastifySensible = require('fastify-sensible');

const bannerController = require('./controllers/bannerController.js');
const popularController = require('./controllers/popularController.js');
const tokensController = require('./controllers/tokensController.js');
const searchController = require('./controllers/searchController.js');

// Create instance
const fastifyInstance = fastify({ logger: false });

// CORS
fastifyInstance.register(CORS);

// register error generator
fastifyInstance.register(fastifySensible);

// Declare routes
fastifyInstance.get('/popular', popularController);
fastifyInstance.get('/banner', bannerController);
fastifyInstance.get('/tokens', tokensController);
fastifyInstance.get('/search', searchController);

// Run the server
module.exports = async () => {
  try {
    await fastifyInstance.listen(conf.webserverPort);
  } catch (err) {
    fastifyInstance.log.error(err);
    process.exit(1);
  }
}