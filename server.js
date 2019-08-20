/**
 * Register some Modules
 */
const DiscordJS = require('discord.js');
const Express = require('express');
const JsonDB = require('node-json-db').JsonDB;
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Creating new Bot Client
 */
const bot = new DiscordJS.Client();

/**
 * Creating HTTP, Express and Socket.IO Instance
 */
bot.app = Express();
bot.web = require('http').createServer(bot.app);
bot.io = require('socket.io')(bot.web);

/**
 * Connecting/Creating local Json Database
 */
bot.db = new JsonDB(path.join(__dirname, 'config', 'db.json'), true, true, '/');
bot.cfg = require('./config/bot.json');

/**
 * Creating Listener for glitch.com hosting.
 * This adress is used when you are pinging your application with UpTimeRobot
 */
bot.app.get('/uptime', (req, res) => {
    res.sendStatus(200);
})

/**
 * Loading Commands
 */
bot.commands = new DiscordJS.Collection();
fs.readdir('./commands/', (err, files) => {

    if(err) console.error(err);

    /* Collecting ONLY .js files */
    let jsfiles = files.filter(f => f.split('.').pop() === 'js');
    if (jsfiles.length <= 0) return console.warn('No .js file in \'commands\' detected! Ignoring...');

    /* Adding files to command list */
    jsfiles.forEach((f, i) => {
        let props = require(`./commands/${f}`);
        bot.commands.set(props.help.name, props);
    });

});

/**
 * Loading Scripts
 */
fs.readdir('./scripts/', (err, files) => {

    if(err) console.error(err);

    /* Collecting ONLY .js files */
    let jsfiles = files.filter(f => f.split('.').pop() === 'js');
    if (jsfiles.length <= 0) return console.warn('No .js file in \'script\' detected! Ignoring...');

    /* Executing Files */
    jsfiles.forEach((f, i) => {
        let script = require(`./scripts/${f}`);
        script.run(bot);
    });
});

/**
 * Command Listener
 */
bot.on('message', (msg) => {

    /* Ignoring Bot & DM Messages */
    if (msg.author.bot) return;
    if (msg.channel.type === 'dm') return;

    /* Getting Prefix from Database */
    let prefix = bot.getGuildConfig(msg.guild).prefix;

    /* Checks if message is a command */
    if (msg.content.toString().split('')[0] === prefix) {

        let msgArrays = msg.content.toString().split(' ');
        let cmd = msgArrays[0];
        let args = msgArrays.slice(1);

        /* Executing Command */
        let cmdfile = bot.commands.get(cmd.slice(prefix.length));
        if (cmdfile) {
            cmdfile.run(bot, msg, args);
            msg.delete(500).then((msg) => {
                console.log(`${msg.author.tag} executed command '${prefix}${cmdfile.help.name}' in channel '${msg.channel.name}' on guild '${msg.guild.name}' with following arguments: '${args}'`);
            });
        }
    }
});

/**
 * Overwriting bot.cb.getData
 * @param {string} dbpath
 * @returns {object}
 */
bot.db.getDataAlt = bot.db.getData;
bot.db.getData = function(dbpath) {
    var data = {};
    try {
        data = bot.db.getDataAlt(dbpath);
    } catch (err) {
        return;
    }
    return data;
}

/**
 * GetGuildConfig
 * @param {DiscordJS.Guild} guild
 * @returns {object}
 */
bot.getGuildConfig = function(guild) {

    /* Getting guild infos */
    var id = guild.id;

    /* Getting Data */
    var data = bot.db.getData(`/${id}`);

    if (!data) {

        /* Create a new Data Path if there is no existing */
        bot.db.push('/' + id + '/', bot.db.getData('/default'), true);
        return bot.db.getData(`/${id}`);

    } else return data;
    
}

/**
 * Creates a entry in the database for a new guild
 */
bot.on('guildCreate', (guild) => {
    console.log(`Joined new guild: ${guild.name}!`);

    /* Create a new Data Path if there is no existing */
    bot.db.push('/' + guild.id + '/', bot.db.getData('/default'), true);
})

/**
 * Connecting with Discord
 */
bot.login(process.env.TOKEN);

/**
 * Setting up db if not allready aviable
 */
bot.on('ready', () => {

    console.log(`${bot.user.tag} connected to ${bot.guilds.size} guild.`);

    /* Starting WebServer */
    var port = process.env.PORT || 3000;
    bot.web.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
});

/**
 * Overwriting console.log with color output
 */
function OverwriteConsoleLog() {
    var colors = require('colors/safe');
    var cmd = {
        error: console.error,
        warn: console.warn,
        log: console.log,
        info: console.info,
        debug: console.debug
    }
    console.error = function (msg) { if(bot.cfg.logging.error) cmd.error(colors.red(msg)); };
    console.warn = function (msg) { if(bot.cfg.logging.warn) cmd.warn(colors.yellow(msg)); };
    console.log = function (msg) { if(bot.cfg.logging.info) cmd.log(colors.white(msg)); };
    console.info = function (msg) { if(bot.cfg.logging.info) cmd.info(colors.white(msg)); };
    console.debug = function (msg) { if(bot.cfg.logging.debug) cmd.debug(colors.gray(msg)); };
} OverwriteConsoleLog();

/**
 * CTD Fix
 */
bot.on('error', (err) => console.error(err));
bot.on('warn', (warn) => console.warn(warn));
bot.on('debug', (debug) => console.debug(debug));

/**
 * Clears the CMD on start
 */
if(bot.cfg.logging.ClearCmdOnStart) console.clear();

/**
 * set up public folder
 */
bot.app.use('/static', Express.static(path.join(__dirname, 'public')));

/**
 * setting up renderer
 */
bot.app.set('view engine', 'ejs');