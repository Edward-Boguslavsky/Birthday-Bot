// Import required libraries
const { ContainerBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize, ChannelType } = require('discord.js');
const fs = require('fs');
const moment = require('moment-timezone');

// List of major timezones
const TIMEZONES = [
    { label: 'Pacific/Honolulu', description: 'HST (UTC-10)' },
    { label: 'America/Anchorage', description: 'AKST (UTC-9)' },
    { label: 'America/Los_Angeles', description: 'PST/PDT (UTC-8)' },
    { label: 'America/Denver', description: 'MST/MDT (UTC-7)' },
    { label: 'America/Chicago', description: 'CST/CDT (UTC-6)' },
    { label: 'America/New_York', description: 'EST/EDT (UTC-5)' },
    { label: 'America/Halifax', description: 'AST/ADT (UTC-4)' },
    { label: 'America/Sao_Paulo', description: 'BRT (UTC-3)' },
    { label: 'Atlantic/South_Georgia', description: 'GST (UTC-2)' },
    { label: 'Atlantic/Azores', description: 'AZOT (UTC-1)' },
    { label: 'Europe/London', description: 'GMT/BST (UTC+0)' },
    { label: 'Europe/Paris', description: 'CET/CEST (UTC+1)' },
    { label: 'Europe/Athens', description: 'EET/EEST (UTC+2)' },
    { label: 'Europe/Moscow', description: 'MSK (UTC+3)' },
    { label: 'Asia/Dubai', description: 'GST (UTC+4)' },
    { label: 'Asia/Karachi', description: 'PKT (UTC+5)' },
    { label: 'Asia/Dhaka', description: 'BST (UTC+6)' },
    { label: 'Asia/Bangkok', description: 'ICT (UTC+7)' },
    { label: 'Asia/Singapore', description: 'SGT (UTC+8)' },
    { label: 'Asia/Tokyo', description: 'JST (UTC+9)' },
    { label: 'Australia/Sydney', description: 'AEST/AEDT (UTC+10)' },
    { label: 'Pacific/Noumea', description: 'NCT (UTC+11)' },
    { label: 'Pacific/Auckland', description: 'NZST/NZDT (UTC+12)' },
];

/**
 * @param {import('discord.js').Guild} guild - Discord server object.
 * @param {string|null} selected_user_id - ID of currently selected user (if any)
 * @param {object|null} notification - Notification object (optional)
 */

// Build settings interface
module.exports = async (guild, selected_user_id = null, notification = null) => {
    // Get saved settings or set defaults if none exist
    let saved_settings = {};
    try {
        saved_settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
    } catch (e) { 
        saved_settings = { channelId: null, roleId: null, timezone: 'America/New_York' }; 
    }

    // Get saved birthdays or set as empty if none exist
    let birthdays = [];
    try {
        birthdays = JSON.parse(fs.readFileSync('./birthdays.json', 'utf8'));
        birthdays.sort((a, b) => (a.month - b.month) || (a.day - b.day));
    } catch (error) { 
        birthdays = []; 
    }

    // Build select menu with timezone options
    const timezone_options = TIMEZONES.map(tz => 
        new StringSelectMenuOptionBuilder()
            .setLabel(tz.label.replace(/_/g, ' '))
            .setDescription(tz.description)
            .setValue(tz.label)
            .setDefault(tz.label === saved_settings.timezone)
    );

    // Build settings container
    const saved_settings_container = new ContainerBuilder()
        // Add title and description text
        .addTextDisplayComponents((text) => text.setContent('# Settings\nSelect the announcement channel, birthday role, and server timezone below'))
        .addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Large))

        // Add channel select menu
        .addActionRowComponents((row) => {
            const menu = new ChannelSelectMenuBuilder()
                .setCustomId('setting_select_channel')
                .setPlaceholder('Select announcement channel')
                .setChannelTypes(ChannelType.GuildText)
                .setMaxValues(1);

            // Set default channel if one is saved
            if (saved_settings.channelId) menu.setDefaultChannels(saved_settings.channelId);
            return row.setComponents(menu);
        })
        // Add role select menu
        .addActionRowComponents((row) => {
            const menu = new RoleSelectMenuBuilder()
                .setCustomId('setting_select_role')
                .setPlaceholder('Select birthday role')
                .setMaxValues(1);

            // Set default role if one is saved
            if (saved_settings.roleId) menu.setDefaultRoles(saved_settings.roleId);
            return row.setComponents(menu);
        })
        // Add custom timezone select menu
        .addActionRowComponents((row) => {
            const menu = new StringSelectMenuBuilder()
                .setCustomId('setting_select_timezone')
                .setPlaceholder('Select Server Timezone')
                .addOptions(timezone_options);
            return row.setComponents(menu);
        });

    // Add custom birthday select menu
    const records = [];
    let selected_text = null;

    for (const record of birthdays) {
        // Skip missing or corrupted records
        if (!record.userId) continue; 

        let label = "Unknown User";
        let username = `-# ${record.userId}`;
        
        // Get user info from user ID
        try {
            const member = await guild.members.fetch(record.userId);
            label = member.displayName;
            username = member.user.username;
        } catch (e) { 
            // Ignore instructions if user not found
        }

        const date_string = moment().month(record.month - 1).date(record.day).format('MMMM D');

        // Add user info to select menu
        records.push(
            new StringSelectMenuOptionBuilder()
                .setLabel(label)
                .setDescription(date_string)
                .setValue(record.userId)
        );

        // Set details text to selected user nickname, birthday, username, and user ID
        if (selected_user_id && record.userId === selected_user_id) {
            selected_text = `## ${label}\n${date_string}\n${username}\n-# ${record.userId}`;
        }
    }

    // Set custom select menu placeholder text if no birthdays found
    if (records.length === 0) {
        records.push(new StringSelectMenuOptionBuilder().setLabel('No birthdays found').setValue('none'));
    }

    // Customize select menu
    const select_menu = new StringSelectMenuBuilder()
        .setCustomId('birthday_select')
        .setPlaceholder('Select a user')
        .addOptions(records);

    // Customize "Add" button
    const add_button = new ButtonBuilder()
        .setCustomId('birthday_btn_add')
        .setLabel('Add')
        .setStyle(ButtonStyle.Success);

    // Customize "Edit" button
    const edit_button = new ButtonBuilder()
        .setLabel('Edit')
        .setStyle(ButtonStyle.Secondary);

    // Customize "Delete" button
    const delete_button = new ButtonBuilder()
        .setLabel('Delete')
        .setStyle(ButtonStyle.Danger);

    // Disable "Edit" and "Delete" buttons if no user selected
    if (selected_user_id) {
        edit_button.setCustomId(`birthday_btn_edit_${selected_user_id}`).setDisabled(false);
        delete_button.setCustomId(`birthday_btn_delete_${selected_user_id}`).setDisabled(false);
    } else {
        edit_button.setCustomId('birthday_btn_edit').setDisabled(true);
        delete_button.setCustomId('birthday_btn_delete').setDisabled(true);
    }

    // Build birthdays container
    const list_container = new ContainerBuilder()
        .addTextDisplayComponents((text) => text.setContent("# Birthdays\nAdd a new birthday or select an existing birthday below to edit"))
        .addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Large))
        .addActionRowComponents((row) => row.setComponents(select_menu));

    if (selected_text) {
        list_container.addTextDisplayComponents((text) => text.setContent(selected_text));
    }

    list_container
        .addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Large))
        .addActionRowComponents((row) => row.setComponents(add_button, edit_button, delete_button));

    const final_containers = [saved_settings_container, list_container];

    // Build notification container (if notification exists)
    if (notification) {
        const accentColor = notification.type === 'success' ? 0x00863A : 0xD22D39; // Green : Red
        
        const notif_container = new ContainerBuilder()
            .setAccentColor(accentColor)
            .addTextDisplayComponents((text) => text.setContent(`### ${notification.message}`));

        // Add notification container to the top of the array
        final_containers.unshift(notif_container);
    }

    return final_containers;
};