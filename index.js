// Load environment variables
require('dotenv').config();

// Import required libraries
const { Client, GatewayIntentBits, ContainerBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const moment = require('moment-timezone');
const path = require('path');
const { CommandKit } = require('commandkit');

// Create a new Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// Initialize CommandKit
new CommandKit({
    client,
    commandsPath: path.join(__dirname, 'commands'),
    eventsPath: path.join(__dirname, 'events'),
    bulkRegister: true,
});

// Default settings for birthday roles and messages
const DEFAULT_SETTINGS = {
    channelId: null,
    roleId: null,
    timezone: "America/New_York"
};

// Check if settings.json exists, if not, create it
if (!fs.existsSync('./data/settings.json')) {
    fs.writeFileSync('./data/settings.json', JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf8');
    console.log('📄 Created settings.json file');
}

// Check if birthdays.json exists, if not, create it
if (!fs.existsSync('./data/birthdays.json')) {
    fs.writeFileSync('./data/birthdays.json', '[]', 'utf8');
    console.log('📄 Created empty birthdays.json file');
}

// Keep track of active settings sessions
client.settings_sessions = [];

// Run "check_birthdays" every minute once ready
client.once('clientReady', () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);

    setInterval(check_birthdays, 60 * 1000);
});

// Check for birthdays and assign the birthday roles
async function check_birthdays() {
    // Store JSON save data
    let birthdays = [];
    let config = {};
    
    try {
        birthdays = JSON.parse(fs.readFileSync('./data/birthdays.json', 'utf8'));
        config = JSON.parse(fs.readFileSync('./data/settings.json', 'utf8'));
    } catch (e) {
        return console.error("❌ Failed to read JSON files");
    }

    // Exit function if saved settings or birthdays are incomplete
    if (!config.channelId || !config.roleId) return;
    if (!birthdays || birthdays.length === 0) return;

    // Get today's date
    const now = moment().tz(config.timezone || "America/New_York");
    const current_month = now.month() + 1; 
    const current_day = now.date();

    // Confirm that the channel and role exist in the server
    const channel = await client.channels.fetch(config.channelId).catch(() => null);
    if (!channel) return console.error("🔍 Selected channel not found");
    
    const server = channel.guild;
    const role = await server.roles.cache.get(config.roleId);
    if (!role) return console.error("🔍 Selected role not found");

    // Wish users happy birthday!
    for (const record of birthdays) {
        try {
            // Get server member from user ID
            const member = await server.members.fetch(record.userId);
            if (!member) return console.error("🔍 Member not found");

            // Get names of server, channel, and member
            const channel_name = channel.name;
            const role_name = role.name;
            const member_name = member.displayName;

            // If it is the user's birthday send message and add role, otherwise remove role
            if (record.month === current_month && record.day === current_day) {
                if (!member.roles.cache.has(config.roleId)) {
                    // Add birthday role
                    await member.roles.add(config.roleId)
                        .then(() => console.log(`➕ Added birthday role "${role_name}" to ${member_name}`));
                    
                    // Create container for birthday message
                    const birthday_container = new ContainerBuilder()
                        .addSectionComponents((section) => 
                            section
                                .addTextDisplayComponents((text) => 
                                    text.setContent(`# Today is ${member_name}'s birthday\n@everyone wish them a happy birthday below!`)
                                )
                                .setThumbnailAccessory((thumbnail) => 
                                    thumbnail.setURL('attachment://party_popper.gif') 
                                )
                        );

                    // Send container
                    await channel.send({ 
                        components: [birthday_container],
                        files: ['./data/party_popper.gif'],
                        flags: [MessageFlags.IsComponentsV2]
                    })
                        .then(() => console.log(`📨 Sent birthday wishes to ${member_name} in "${channel_name}"`));
                }
            } else {
                if (member.roles.cache.has(config.roleId)) {
                    // Remove birthday role
                    await member.roles.remove(config.roleId)
                        .then(() => console.log(`➖ Removed birthday role "${role_name}" from ${member_name}`));
                }
            }
        } catch (error) {
            console.error(`❌ Failed to process birthday for ${record.userId}: ${error}`);
        }
    }
}

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN);