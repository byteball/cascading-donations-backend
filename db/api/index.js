const db = require("ocore/db.js");
const conf = require("ocore/conf.js");

const saveDonation = async ({ donor, owner, repository, usd_amount }) => { // save donation to db
  await db.query(`INSERT INTO ${conf.prefix}_donations (donor, owner, repository, usd_amount) VALUES (?, ?, ?, ?)`, [donor, owner, repository, usd_amount]);
}

module.exports = {
  saveDonation
}
