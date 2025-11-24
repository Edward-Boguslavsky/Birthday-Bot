// Load environment variables
require('dotenv').config();

// Import required libraries
const { Client, GatewayIntentBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
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

// Initialize active sessions list for the settings command
client.settingsSessions = [];

// Initialize CommandKit
new CommandKit({
    client,
    commandsPath: path.join(__dirname, 'commands'),
    eventsPath: path.join(__dirname, 'events'),
    bulkRegister: true,
});

// Default Configuration
const DEFAULT_CONFIG = {
    channelId: null,
    roleId: null,
    timezone: "America/New_York"
};

// Check if config.json exists, if not, create it
if (!fs.existsSync('config.json')) {
    fs.writeFileSync('config.json', JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
    console.log('📄 Created config.json file');
}

// Check if birthdays.json exists, if not, create it
if (!fs.existsSync('birthdays.json')) {
    fs.writeFileSync('birthdays.json', '[]', 'utf8');
    console.log('📄 Created empty birthdays.json file');
}

// Run "checkBirthdays" every minute once ready
client.once('clientReady', () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);

    setInterval(checkBirthdays, 60 * 1000);
});

// Check for birthdays and assign the birthday roles
async function checkBirthdays() {
    // Read Data
    let birthdays = [];
    let config = {};
    
    try {
        birthdays = JSON.parse(fs.readFileSync('./birthdays.json', 'utf8'));
        config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    } catch (e) {
        return console.error("❌ Failed to read JSON files");
    }

    // --- SAFETY CHECKS ---
    // 1. If config is incomplete, stop.
    if (!config.channelId || !config.roleId) {
        // Config is not set up yet, silent return to avoid console spam
        return;
    }

    // 2. If no birthdays, stop.
    if (!birthdays || birthdays.length === 0) {
        return;
    }
    // ---------------------

    // Get today's date
    const now = moment().tz(config.timezone || "America/New_York");
    const current_month = now.month() + 1; 
    const current_day = now.date();

    // Confirm that the channel and role exist (Using ID from config)
    const channel = await client.channels.fetch(config.channelId).catch(() => null);
    if (!channel) return console.error("🔍 Configured Channel not found");
    
    const server = channel.guild;
    const role = await server.roles.cache.get(config.roleId);
    if (!role) return console.error("🔍 Configured Role not found");

    // Add/remove the role for each user in the birthdays list
    for (const friend of birthdays) {
        try {
            const member = await server.members.fetch(friend.userId);
            if (!member) return console.error("🔍 Member not found");

            // Get names of server, channel, and member
            const channel_name = channel.name;
            const role_name = role.name;
            const member_name = member.displayName;

            if (friend.month === current_month && friend.day === current_day) {
                // If it is the user's birthday and they don't have the birthday role, add it and announce their birthday
                if (!member.roles.cache.has(config.roleId)) {
                    await member.roles.add(config.roleId)
                        .then(() => console.log(`➕ Added birthday role "${role_name}" to ${member_name}`));
                    
                    // Create the container with a Section (allows Text + Thumbnail)
                    const birthdayContainer = new ContainerBuilder()
                        .addSectionComponents((section) => 
                            section
                                .addTextDisplayComponents((text) => 
                                    text.setContent(`# Today is ${member_name}'s birthday\n@everyone wish them a happy birthday below!`)
                                )
                                .setThumbnailAccessory((thumbnail) => 
                                    thumbnail.setURL('attachment://party_popper.gif') 
                                )
                        );

                    // Send the container with the V2 Flag
                    await channel.send({ 
                        components: [birthdayContainer],
                        files: ['./party_popper.gif'],
                        flags: [MessageFlags.IsComponentsV2]
                    })
                        .then(() => console.log(`📨 Sent birthday wishes to ${member_name} in "${channel_name}"`));
                }
            } else {
                // If it is not the user's birthday and they have the birthday role, remove it
                if (member.roles.cache.has(config.roleId)) {
                    await member.roles.remove(config.roleId)
                        .then(() => console.log(`➖ Removed birthday role "${role_name}" from ${member_name}`));
                }
            }
        } catch (error) {
            console.error(`❌ Failed to process birthday for ${friend.userId}: ${error}`);
        }
    }
}

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN);