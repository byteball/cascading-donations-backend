const db = require('ocore/db.js');
const conf = require('ocore/conf.js');

module.exports = async (request, reply) => {
  const page = request.query?.page || 1;
  const limit = request.query?.limit && !isNaN(Number(request.query?.limit)) ? Number(request.query?.limit) : 100;

  if (isNaN(Number(page)) || page < 1 || limit ? false : limit > 200) return reply.badRequest();

  const total = await db.query(`SELECT COUNT(*) as total FROM ${conf.prefix}_total_donated`, []).then(([d]) => d.total);

  const totalDonatedList = await db.query(
    `SELECT * FROM ${conf.prefix}_total_donated ORDER BY usd_amount DESC LIMIT ? OFFSET ?`,
    [limit, (page - 1) * limit]);

  return { data: totalDonatedList, pagination: { total, total_pages: Math.ceil(total / limit), current_page: page } }
}
