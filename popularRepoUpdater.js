const conf = require('ocore/conf.js');
const DAG = require('aabot/dag.js');

const store = require('./popularRepoStore.js');
const githubAxiosInstance = require('./githubAxiosInstance.js')

const limit = process.env.LIMIT_OF_POPULAR;

module.exports = async () => {
  let data = await DAG.readAAStateVars(conf.aa_address);

  data = Object.keys(data).filter((key) => key.indexOf('*total_received*base') >= 0).map((key) => {
    const [full_name] = key.split("*");

    return {
      total_received_in_base: data[key],
      full_name
    }
  }).sort((a, b) => b.total_received_in_base - a.total_received_in_base).slice(0, limit);

  // get data from github
  const dataGetter = data.map((repo) => getRepoByFullName(repo.full_name).then((data) => { Object.keys(data).length > 0 && delete data.full_name; repo.info = data }));

  try {
    await Promise.all(dataGetter);
    store.update(data)
  } catch (err) {
    console.error("error", err)
  }
}

function getRepoByFullName(full_name) {
  return githubAxiosInstance.get(`/repos/${full_name}`).then((res) => {
    const data = res.data;
    return {
      full_name: data.full_name,
      description: data.description,
      language: data.language,
      stargazers_count: data.stargazers_count,
      forks_count: data.forks_count,
      created_at: data.created_at
    }
  }).catch(() => {
    return {}
  });
}