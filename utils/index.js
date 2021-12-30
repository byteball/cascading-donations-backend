const DAG = require('aabot/dag.js');
const { default: axios } = require('axios');
const conf = require('ocore/conf.js');

const githubAxiosInstance = require('../githubAxiosInstance');

exports.getRules = async (fullName) => {
  try {
    let exist = false;
    let stateVars = await DAG.readAAStateVars(conf.aa_address, `${fullName}*rules`);
    let rules = stateVars[`${fullName}*rules`] || {};

    if (Object.keys(stateVars).length > 0) {
      exist = true;
    }

    if (Object.keys(rules).length > 0) {
      const sum = Object.values(rules).reduce((prev, current) => {
        return prev + current;
      }, 0);

      if (sum === 100) {
        return [rules, exist];
      } else {
        return [Object.assign(rules, { [fullName]: 100 - sum }), exist];
      }

    } else {
      return [{ [fullName]: 100 }, exist];
    }

  } catch (e) {
    console.error(e);
    return ([{}, false])
  }
}

exports.searchRepos = async (query, token) => {
  const [owner, name] = query.split("/");
  let q = query;

  if (owner && name) {
    q = `user:${owner} ${name} fork:true`
  }

  if (!token) {
    return githubAxiosInstance.get(`/search/repositories?q=${encodeURIComponent(q)}`).then((res) => {
      const items = res.data.items;
      return items.map((item) => ({ title: item.full_name, description: item.description }))
    });
  } else {
    return axios.get(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}`, {
      headers: {
        Authorization: `token ${token}`,
        "User-Agent": "CASCADING DONATION",
        "Content-Type": "application/json"
      }
    }).then((res) => {
      const items = res.data.items;
      return items.map((item) => ({ title: item.full_name, description: item.description }))
    });
  }
}