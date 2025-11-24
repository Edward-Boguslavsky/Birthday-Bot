const { 
    ContainerBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ButtonBuilder, 
    ButtonStyle,
    SeparatorSpacingSize,
    ChannelType 
} = require('discord.js');
const fs = require('fs');
const moment = require('moment-timezone');

// Representative list of global timezones
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
 * Builds the settings UI containers.
 * @param {import('discord.js').Guild} guild - The Discord Guild object.
 * @param {string|null} selectedUserId - The ID of the currently selected user (if any).
 * @param {object|null} notification - Optional notification object { message: string, type: 'success'|'error' }
 */
module.exports = async (guild, selectedUserId = null, notification = null) => {
    // --- 1. Read Config & Birthdays ---
    let config = {};
    try {
        config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    } catch (e) { config = { channelId: null, roleId: null, timezone: 'America/New_York' }; }

    let birthdays = [];
    try {
        birthdays = JSON.parse(fs.readFileSync('./birthdays.json', 'utf8'));
    } catch (error) { birthdays = []; }
    
    birthdays.sort((a, b) => (a.month - b.month) || (a.day - b.day));

    // --- 2. Build Configuration Container ---
    const timezoneOptions = TIMEZONES.map(tz => 
        new StringSelectMenuOptionBuilder()
            .setLabel(tz.label.replace(/_/g, ' '))
            .setDescription(tz.description)
            .setValue(tz.label)
            .setDefault(tz.label === config.timezone)
    );

    const configContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) => text.setContent('# Configurations\nSelect the announcement channel, birthday role, and server timezone below'))
        .addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Large))
        .addActionRowComponents((row) => {
            const menu = new ChannelSelectMenuBuilder()
                .setCustomId('setting_select_channel')
                .setPlaceholder('Select Announcement Channel')
                .setChannelTypes(ChannelType.GuildText)
                .setMaxValues(1);
            
            if (config.channelId) menu.setDefaultChannels(config.channelId);
            return row.setComponents(menu);
        })
        .addActionRowComponents((row) => {
            const menu = new RoleSelectMenuBuilder()
                .setCustomId('setting_select_role')
                .setPlaceholder('Select Birthday Role')
                .setMaxValues(1);
                
            if (config.roleId) menu.setDefaultRoles(config.roleId);
            return row.setComponents(menu);
        })
        .addActionRowComponents((row) => {
            const menu = new StringSelectMenuBuilder()
                .setCustomId('setting_select_timezone')
                .setPlaceholder('Select Server Timezone')
                .addOptions(timezoneOptions);
            return row.setComponents(menu);
        });

    // --- 3. Build Birthday List Container ---
    const options = [];
    let selectedText = null;

    for (const record of birthdays) {
        let label = `Unknown User (${record.userId})`;
        let username = "Unknown";
        
        try {
            const member = await guild.members.fetch(record.userId);
            label = member.displayName;
            username = member.user.username;
        } catch (e) { /* User likely left */ }

        const dateStr = moment().month(record.month - 1).date(record.day).format('MMMM D');

        options.push(
            new StringSelectMenuOptionBuilder()
                .setLabel(label)
                .setDescription(dateStr)
                .setValue(record.userId)
        );

        if (selectedUserId && record.userId === selectedUserId) {
            selectedText = `## ${label}\n${dateStr}\n${username}\n-# ${record.userId}`;
        }
    }

    if (options.length === 0) {
        options.push(new StringSelectMenuOptionBuilder().setLabel('No birthdays found').setValue('none'));
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('birthday_select')
        .setPlaceholder('Select a user')
        .addOptions(options);

    const addButton = new ButtonBuilder()
        .setCustomId('birthday_btn_add')
        .setLabel('Add')
        .setStyle(ButtonStyle.Success);

    const editButton = new ButtonBuilder()
        .setLabel('Edit')
        .setStyle(ButtonStyle.Secondary);

    const deleteButton = new ButtonBuilder()
        .setLabel('Delete')
        .setStyle(ButtonStyle.Danger);

    if (selectedUserId) {
        editButton.setCustomId(`birthday_btn_edit_${selectedUserId}`).setDisabled(false);
        deleteButton.setCustomId(`birthday_btn_delete_${selectedUserId}`).setDisabled(false);
    } else {
        editButton.setCustomId('birthday_btn_edit').setDisabled(true);
        deleteButton.setCustomId('birthday_btn_delete').setDisabled(true);
    }

    const listContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) => text.setContent("# Birthdays\nAdd a new birthday or select an existing birthday below to edit"))
        .addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Large))
        .addActionRowComponents((row) => row.setComponents(selectMenu));

    if (selectedText) {
        listContainer.addTextDisplayComponents((text) => text.setContent(selectedText));
    }

    listContainer
        .addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Large))
        .addActionRowComponents((row) => row.setComponents(addButton, editButton, deleteButton));

    const finalContainers = [configContainer, listContainer];

    // --- 4. Build Notification Container (If needed) ---
    if (notification) {
        const accentColor = notification.type === 'success' ? 0x00863A : 0xD22D39; // Green : Red
        
        const notifContainer = new ContainerBuilder()
            .setAccentColor(accentColor)
            .addTextDisplayComponents((text) => text.setContent(`### ${notification.message}`));

        // Add to the top of the array
        finalContainers.unshift(notifContainer);
    }

    return finalContainers;
};