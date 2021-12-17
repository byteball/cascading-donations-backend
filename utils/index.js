const DAG = require('aabot/dag.js');
const conf = require('ocore/conf.js');

const githubAxiosInstance = require('../githubAxiosInstance');

exports.getRules = async (fullName) => {
  try {
    let rules = await DAG.readAAStateVars(conf.aa_address, `${fullName}*rules`).then(vars => vars[`${fullName}*rules`]) || {};

    if (Object.keys(rules).length > 0) {
      const sum = Object.values(rules).reduce((prev, current) => {
        return prev + current;
      }, 0);

      if (sum === 100) {
        return rules
      } else {
        return Object.assign(rules, { [fullName]: 100 - sum })
      }
      
    } else {
      return { [fullName]: 100 }
    }

  } catch (e) {
    console.error(e);
    return ({})
  }
}

exports.searchRequest = async (query) => {
  const [owner, name] = query.split("/");
  let q = query;
  
  if (owner && name) {
    q = `user:${owner} ${name}`
  }

  return githubAxiosInstance.get(`/search/repositories?q=${encodeURIComponent(q)}`).then((res) => {
    const items = res.data.items;
    return items.map((item) => ({ title: item.full_name, description: item.description }))
  });
}