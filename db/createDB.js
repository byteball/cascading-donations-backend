const db = require('ocore/db.js');
const conf = require("ocore/conf.js");

exports.create = async function () {
  console.error("will create tables if not exist");

  await db.query(`CREATE TABLE IF NOT EXISTS ${conf.prefix}_rating (
    donor CHAR(32) NOT NULL,
    usd_amount INTEGER NOT NULL DEFAULT 0,
    UNIQUE(donor)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS ${conf.prefix}_donations (
    donor CHAR(32) NOT NULL,
    owner CHAR(40) NOT NULL,
    repository CHAR(100) NOT NULL,
    usd_amount INTEGER NOT NULL DEFAULT 0
  )`);

  await db.query(`CREATE TRIGGER IF NOT EXISTS ${conf.prefix}_update_rating AFTER INSERT ON ${conf.prefix}_donations
    BEGIN
      INSERT INTO ${conf.prefix}_rating (donor, usd_amount)
      SELECT new.donor, 0
      WHERE NOT EXISTS (SELECT 1 FROM ${conf.prefix}_rating WHERE donor = new.donor);

      UPDATE ${conf.prefix}_rating SET usd_amount = usd_amount + new.usd_amount WHERE donor = new.donor;
    END;
	`)
}
