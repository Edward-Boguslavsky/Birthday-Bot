// Load environment variables
require('dotenv').config();

// Import required libraries
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

// Create a new Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// Check if birthdays.json exists, if not, create it
if (!fs.existsSync('birthdays.json')) {
    fs.writeFileSync('birthdays.json', '{}', 'utf8');
    console.log('Created empty birthdays.json file');
}

// Create a collection for commands
client.commands = new Collection();

// Read commands from the commands directory
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Name of the birthday role to be assigned to users and the channel to make announcements in
const BIRTHDAY_ROLE_NAME = 'Almighty Birthday Lord';
const ANNOUNCEMENTS_CHANNEL_NAME = '💬-words-are-fun';

// Run "checkBirthdays" every minute once ready
client.once('ready', () => {
    console.log('Ready!');
    setInterval(checkBirthdays, 60 * 1000);
});

// Check for birthdays and assign the birthday roles
async function checkBirthdays() {
    // Read birthdays from JSON file
    const birthdays = JSON.parse(fs.readFileSync('birthdays.json', 'utf8'));

    // Get today's date and format into MM-DD format
    const today = moment().tz("America/New_York");
    const todayStr = today.format('MM-DD');

    // Run for each server the bot is in
    client.guilds.cache.forEach(async (guild) => {
        // Get the birthday role and announcements channel
        const birthdayRole = guild.roles.cache.find(role => role.name === BIRTHDAY_ROLE_NAME);
        const announcementsChannel = guild.channels.cache.find(channel => channel.name === ANNOUNCEMENTS_CHANNEL_NAME);

        // Return error message if the birthday role does not exist
        if (!birthdayRole) {
            console.log(`The role "${BIRTHDAY_ROLE_NAME}" does not exist in guild "${guild.name}"`);
            return;
        }

        // Return error message if the announcements channel does not exist
        if (!announcementsChannel) {
            console.log(`The channel "${ANNOUNCEMENTS_CHANNEL_NAME}" does not exist in guild "${guild.name}"`);
            return;
        }

        // Add/remove the role for each user in the birthdays list
        for (const userId in birthdays) {
            try {
                // Fetch the member using their user ID
                const member = await guild.members.fetch(userId); 
                
                if (birthdays[userId] === todayStr) {
                    // If it is the user's birthday and they don't have the birthday role, add it and announce their birthday
                    if (!member.roles.cache.has(birthdayRole.id)) {
                        await member.roles.add(birthdayRole).then(() => console.log(`Added birthday role to ${member.user.tag}`));
                        announcementsChannel.send(`## Today is ${member.displayName}'s birthday 🎉\n@everyone wish them a happy birthday below!`);
                    }
                } else {
                    // If it is not the user's birthday and they have the birthday role, remove it
                    if (member.roles.cache.has(birthdayRole.id)) {
                        await member.roles.remove(birthdayRole).then(() => console.log(`Removed birthday role from ${member.user.tag}`));
                    }
                }
            } catch (error) {
                // Return error message if the user does not exist
                console.error(`Could not fetch member with ID ${userId}: ${error}`);
            }
        }
    });
}

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN);