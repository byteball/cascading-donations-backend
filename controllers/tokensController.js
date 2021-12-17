const store = require('../tokensStore.js');

module.exports = async () => {
  const data = store.get();

  return { data }
}