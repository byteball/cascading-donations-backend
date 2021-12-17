const store = require('../popularRepoStore.js');

module.exports = async () => {
  const data = store.get();

  return { data }
}