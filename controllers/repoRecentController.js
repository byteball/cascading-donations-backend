const db = require('ocore/db.js');
const conf = require('ocore/conf.js');

const RESPONSES_ON_PAGE = 10;

module.exports = async (request, reply) => {
	const page = request.params?.page || 1;

	const owner = request.params?.owner;
	const repo = request.params?.repo;

	const fullName = `${owner}/${repo}`.toLowerCase();

	if (isNaN(Number(page)) || page < 1 || !owner || !repo) return reply.badRequest();

	const responses = await db.query(
		`SELECT mci, trigger_address, aa_address, trigger_unit, bounced, response_unit, response, timestamp \n\
    FROM aa_responses CROSS JOIN units ON trigger_unit=unit \n\
    WHERE aa_address IN(?) AND response LIKE(?) ORDER BY aa_response_id DESC LIMIT ? OFFSET ?`,
		[conf.aa_address, `%${fullName}%`, RESPONSES_ON_PAGE, (page - 1) * RESPONSES_ON_PAGE]);

	return { data: responses.map(({ response, ...data }) => ({ ...data, response: JSON.parse(response) })) }
}