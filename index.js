// Load environment variables
require('dotenv').config();

// Import required libraries
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const moment = require('moment-timezone');

// Create a new Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// Channel for sending announcements, role for giving birthday privileges, and timezone of users on the server
const CHANNEL_ID = '504105830438666240';
const ROLE_ID = '639163629479919654';
const TIMEZONE = "America/New_York";

// Check if birthdays.json exists, if not, create it
if (!fs.existsSync('birthdays.json')) {
    fs.writeFileSync('birthdays.json', '{}', 'utf8');

    console.log('📄 Created empty birthdays.json file');
}

// Run "checkBirthdays" every minute once ready
client.once('clientReady', () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);

    setInterval(checkBirthdays, 60 * 1000);
});

// Check for birthdays and assign the birthday roles
async function checkBirthdays() {
    // Read birthdays from JSON file
    const birthdays = JSON.parse(fs.readFileSync('./birthdays.json', 'utf8'));

    // Get today's date
    const now = moment().tz(TIMEZONE);
    const current_month = now.month() + 1; 
    const current_day = now.date();

    // Confirm that the channel and role exist
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) return console.error("🔍 Channel not found");
    const server = channel.guild;
    const role = await server.roles.cache.get(ROLE_ID);
    if (!role) return console.error("🔍 Role not found");

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
                if (!member.roles.cache.has(ROLE_ID)) {
                    await member.roles.add(ROLE_ID)
                        .then(() => console.log(`➕ Added birthday role "${role_name}" to ${member_name}`));
                    await channel.send(`## Today is ${member_name}'s birthday 🎉\n@everyone wish them a happy birthday below!`)
                        .then(() => console.log(`📨 Sent birthday wishes to ${member_name} in "${channel_name}"`));;
                }
            } else {
                // If it is not the user's birthday and they have the birthday role, remove it
                if (member.roles.cache.has(ROLE_ID)) {
                    await member.roles.remove(ROLE_ID)
                        .then(() => console.log(`➖ Removed birthday role "${role_name}" from ${member_name}`));
                }
            }
        } catch (error) {
            // Return error message if the user does not exist
            console.error(`❌ Failed to send birthday wishes: ${error}`);
        }
    }
}

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN);