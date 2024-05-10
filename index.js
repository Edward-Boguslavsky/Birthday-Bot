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

// Import moment-timezone to convert date to Eastern Standard Time
const moment = require('moment-timezone');

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
    '183341905965219840': '09-24', // javaaaaaaa (Dakotah)
    '300453354214260737': '11-14', // unrivaled_bacon (Roland)
    '123855427048964098': '12-29'  // pounce1 (Janak)
};

// Name of the birthday role to be assigned to users and the channel to make announcements in
const BIRTHDAY_ROLE_NAME = 'Almighty Birthday Lord';
const ANNOUNCEMENTS_CHANNEL_NAME = '💬-words-are-fun';

// Run "checkBirthdays" every 12:01 AM once ready
client.once('ready', () => {
    console.log('Ready!');

    setInterval(checkBirthdays, 60 * 1000); // Check birthdays every minute

    // Schedule bot to run daily at 00:01 in the GMT-4 timezone
    // const job = schedule.scheduleJob({hour: 4, minute: 1}, function() { // GMT-4 at 00:01 is 04:01 UTC
    //     checkBirthdays();
    // });

});

// Check for birthdays and assign the birthday roles
async function checkBirthdays() {
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
                        //announcementsChannel.send(`## This is a test for ${member.displayName}\n@.everyone ignore this message`);
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

client.login(process.env.DISCORD_BOT_TOKEN);