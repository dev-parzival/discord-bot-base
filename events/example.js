const DiscordJS = require('discord.js');

/**
 * Example Event
 * Trigger: 'ready'
 */
module.exports.run = function() {

    console.log(`Event 'ready' triggered!`);
}

/**
 * Event description
 */
module.exports.help = {
    trigger: 'ready'
}