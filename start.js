const conf = require('ocore/conf.js');
const network = require('ocore/network.js');
const eventBus = require('ocore/event_bus.js');
const lightWallet = require('ocore/light_wallet.js');
const wallet_general = require('ocore/wallet_general.js');
const Discord = require('discord.js');

const webserver = require('./webserver.js');
const updater = require('./popularRepoUpdater.js');
const getTokens = require('./getTokens');

const { create, api } = require('./db/index.js');

const { getSymbolByAsset, getDecimalsBySymbolOrAsset } = require('aabot/token_registry.js');
const tokensStore = require('./tokensStore.js');

var discordClient = null;

lightWallet.setLightVendorHost(conf.hub);

let updaterIntervalId;
let refreshIntervalId;
let updatePriceIntervalId;

eventBus.once('connected', async function (ws) {
	await getTokens();
	network.initWitnessesIfNecessary(ws, start);
});

eventBus.on('aa_response', async function (objResponse) {
	if (objResponse.response.error)
		return console.log('ignored response with error: ' + objResponse.response.error);

	const responseVars = objResponse.response.responseVars;

	if (responseVars && responseVars.message && responseVars.message.includes("Successful donation to ")) {
		const repository = responseVars.message.split(" ")[3];
		const owner = repository.split("/")[0];

		const donor = objResponse.trigger_address;
		const donatedVarName = Object.keys(responseVars).find(v => v.includes("donated_in_"));
		const asset = donatedVarName.split("_")[2];
		const amount = responseVars[donatedVarName];
		const trigger_unit = objResponse.trigger_unit;

		const symbol = asset === "base" ? "GBYTE" : await getSymbolByAsset(asset);
		const decimals = asset === "base" ? 9 : await getDecimalsBySymbolOrAsset(asset) || 0;

		if (conf.watchedRepos.includes(repository) || conf.watchedUsers.includes(owner) || conf.watchedRepos.length === 0 && conf.watchedUsers.length === 0) {
			const embed = new Discord.MessageEmbed()
				.setAuthor(`New donation`)
				.setColor('#0037ff')
				.addFields(
					{ name: "Donor", value: `[${donor}](${`https://${conf.testnet ? "testnet" : ""}explorer.obyte.org/#${donor}`})` },
					{ name: "Repository", value: `[${repository}](https://github.com/${repository})` },
					{ name: "Amount", value: `[${amount / 10 ** decimals} ${symbol}](https://${conf.testnet ? "testnet" : ""}explorer.obyte.org/#${trigger_unit})` },
					{ name: "\u200B", value: `You can [donate to ${repository}](${conf.frontend_url}/repo/${repository}) on kivach.org`, inline: true }
				)
				.setThumbnail(`https://avatars.githubusercontent.com/${repository.split("/")[0]}`);

			if (objResponse.timestamp > conf.last_full_reload_ts) {
				sendToDiscord(embed);
			} else {
				console.error('ignored donation because of full reload')
			}
		}

		const tokens = tokensStore.get();

		if (asset in tokens.Obyte) {
			const price = tokens.Obyte[asset]?.price;
			if (price) {
				const usd_amount = (amount / 10 ** decimals) * price;
				const repo = repository.split("/")[1];

				await api.saveDonation({
					donor,
					repository: repo,
					owner,
					usd_amount
				});
			}
		} else {
			console.error('no price found for asset', asset)
		}
	}
});

async function start() {
	await create(); // init project DB structure

	if (conf.enableNotificationDiscord) {
		await initDiscord();
		wallet_general.addWatchedAddress(conf.aa_address, function (error) {
			if (error)
				console.log(error)
			else
				console.log(conf.aa_address + " added as watched address")
		});
	}

	webserver();
	updater();

	if (refreshIntervalId) clearInterval(refreshIntervalId);
	refreshIntervalId = setInterval(lightWallet.refreshLightClientHistory, 60 * 1000);

	if (updaterIntervalId) clearInterval(intervalId);
	updaterIntervalId = setInterval(updater, 60 * 60 * 1000);

	if (updatePriceIntervalId) clearInterval(updatePriceIntervalId);
	updatePriceIntervalId = setInterval(getTokens, 20 * 60 * 1000);
}


async function initDiscord() {
	if (!conf.discord_token)
		return console.log("discord_token missing in conf, will not send discord notifications");
	if (!conf.discord_channels || !conf.discord_channels.length)
		throw Error("channels missing in conf");

	discordClient = new Discord.Client();

	discordClient.on('ready', () => {
		console.log(`Logged in Discord as ${discordClient.user.tag}!`);
	});

	discordClient.on('error', (error) => {
		console.log(`Discord error: ${error}`);
	});

	await discordClient.login(conf.discord_token);

	setBotActivity();

	setInterval(setBotActivity, 1000 * 60 * 24);
}

function setBotActivity() {
	discordClient.user.setActivity("Kivach", { type: "WATCHING" });
}


function sendToDiscord(to_be_sent) {
	if (!discordClient)
		return console.log("discord client not initialized");
	conf.discord_channels.forEach(function (channelId) {
		discordClient.channels.fetch(channelId).then(function (channel) {
			if (channel) channel.send(to_be_sent);
		});
	});
}

process.on('unhandledRejection', up => { throw up });