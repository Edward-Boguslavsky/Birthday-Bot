// Load environment variables
require('dotenv').config();

// Import Discord library and create a new Discord client
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// All birthdays stored in "userID: MM-DD" format
const birthdays = {
    '181274954719952898': '01-05', // gnomecomingatchya (Chris)
    '265978521493438476': '02-20', // jigolowo (Zach)
    '653776219791294495': '03-03', // sixtyfour.64 (Nitro)
    '246759502609776643': '04-23', // marsyon (Marsel)
    '173611736925077506': '04-27', // ziptip (Alex)
    '618283700228063252': '04-30', // sup_dup (Marko)
    '195683188364804096': '05-02', // rex0218 (Rex)
    '300770582826450955': '05-11', // nointernet (Eddy)
    '396253506731900929': '05-19', // furnituristic (Future)
    '134144734707974145': '07-05', // zakarii7 (Zack)
    '242099941483347968': '07-22', // mizukimillion (Mizu)
    '250047611938144256': '07-27', // snippins (Gerald)
    '300453354214260737': '11-14', // unrivaled_bacon (Roland)
    '123855427048964098': '12-29'  // pounce1 (Janak)
};

// Name of the birthday role to be assigned to users
const BIRTHDAY_ROLE_NAME = 'Almighty Birthday Lord';

// Run "checkBirthdays" every minute once ready
client.once('ready', () => {
    console.log('Ready!');
    setInterval(checkBirthdays, 60 * 1000);
});

// Check for birthdays and assign the birthday roles
function checkBirthdays() {
    // Get today's date and format into MM-DD format
    const today = new Date();
    const todayStr = (today.getMonth() + 1).toString().padStart(2, '0') + '-' + today.getDate().toString().padStart(2, '0');

    // Run for each server the bot is in
    client.guilds.cache.forEach(guild => {
        // Get the Birthday role
        const birthdayRole = guild.roles.cache.find(role => role.name === BIRTHDAY_ROLE_NAME);

        // Return error message if the birthday role does not exist
        if (!birthdayRole) {
            console.log(`The role "${BIRTHDAY_ROLE_NAME}" does not exist in guild "${guild.name}"`);
            return;
        }

        // Run for each user in the "birthdays" list
        for (const userId in birthdays) {
            // Check if it's their birthday
            const isBirthday = birthdays[userId] === todayStr;

            // Retrieve user from ID
            const member = guild.members.cache.get(userId);

            // Return error message if the user does not exist
            if (member) {
                // If it is the user's birthday and they don't have the birthday role, add it
                if (isBirthday && !member.roles.cache.has(birthdayRole.id)) {
                    member.roles.add(birthdayRole).then(() => console.log(`Added Birthday role to ${member.user.tag}`));
                // If it is not the user's birthday and they have the birthday role, remove it
                } else if (!isBirthday && member.roles.cache.has(birthdayRole.id)) {
                    member.roles.remove(birthdayRole).then(() => console.log(`Removed Birthday role from ${member.user.tag}`));
                }
            } else {
                console.log(`The user "${userId}" does not exist in guild "${guild.name}"`);
            }
        }
    });
}

client.login(process.env.DISCORD_BOT_TOKEN);