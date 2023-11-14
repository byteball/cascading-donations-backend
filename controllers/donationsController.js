const db = require('ocore/db.js');
const conf = require('ocore/conf.js');
const { isValidAddress } = require('ocore/validation_utils');

module.exports = async (request, reply) => {
  const page = request.query?.page || 1;

  const owner = String(request.query?.owner || "").toLowerCase();
  const repo = String(request.query?.repo || "").toLowerCase();
  const donor = String(request.query?.donor || "").toUpperCase();
  const limit = request.query?.limit && !isNaN(Number(request.query?.limit)) ? Number(request.query?.limit) : 10;

  if (isNaN(Number(page)) || (page < 1) || (limit ? false : limit > 200) || (donor && !isValidAddress(donor))) return reply.badRequest();

  let filter = "";
  const params = [];

  if (owner || repo || donor) {
    filter = "WHERE "
    if (owner) {
      filter += "owner=?";
      params.push(owner);
    }
    if (owner && repo) filter += " AND ";
    if (repo) {
      filter += "repository=?";
      params.push(repo);
    }

    if (donor) {
      if (owner || repo) filter += " AND ";
      filter += "donor=?";
      params.push(donor);
    }
  }

  const total = await db.query(`SELECT COUNT(*) as total FROM ${conf.prefix}_donations ${filter}`, params).then(([d]) => d.total);

  const donationList = await db.query(
    `SELECT * FROM ${conf.prefix}_donations ${filter} ORDER BY usd_amount DESC LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]);

  return { data: donationList, pagination: { total, total_pages: Math.ceil(total / limit), current_page: page } }
}
