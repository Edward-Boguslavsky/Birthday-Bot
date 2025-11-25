// Import required libraries
const { ModalBuilder, LabelBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const build_settings_interface = require('../../interfaces/settings_interface');

// Notification timeout timer
let active_notification_timeout = null;

// Add notification message to settings interface and show for 6.767 seconds
async function update_notification_UI(interaction, selectedUser_id, notification) {
    // Clear all existing notification timeout timers
    if (active_notification_timeout) {
        clearTimeout(active_notification_timeout);
        active_notification_timeout = null;
    }

    // Get settings interface with notification and send it
    const components_with_notification = await build_settings_interface(interaction.guild, selectedUser_id, notification);
    await interaction.update({ components: components_with_notification, flags: [MessageFlags.IsComponentsV2] });

    // Set new notification timeout timer
    active_notification_timeout = setTimeout(async () => {
        try {
            // Rebuild settings interface without notification
            const components_without_notification = await build_settings_interface(interaction.guild, selectedUser_id, null);
            
            // Edit settings interface
            await interaction.editReply({ components: components_without_notification, flags: [MessageFlags.IsComponentsV2] });
        } catch (e) {
            // Ignore instructions if old interfaces not found
        }
        // Reset notification timeout timer
        active_notification_timeout = null;
    }, 6767);
}

// Handle interaction events
module.exports = async (interaction) => {
    
    // Create "Add Birthday" modal when "Add" button is pressed
    if (interaction.isButton() && interaction.customId === 'birthday_btn_add') {
        const modal = new ModalBuilder()
            .setCustomId('birthday_modal_add')
            .setTitle('Add Birthday');

        const id_input = new TextInputBuilder()
            .setCustomId('birthday_input_id')
            .setPlaceholder("XXXXXXXXXXXXXXXXXX")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const month_input = new TextInputBuilder()
            .setCustomId('birthday_input_month')
            .setPlaceholder("MM")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const day_input = new TextInputBuilder()
            .setCustomId('birthday_input_day')
            .setPlaceholder("DD")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const id_label = new LabelBuilder()
            .setLabel("User ID")
            .setTextInputComponent(id_input);

        const month_label = new LabelBuilder()
            .setLabel("Month (1-12)")
            .setTextInputComponent(month_input);

        const day_label = new LabelBuilder()
            .setLabel("Day (1-31)")
            .setTextInputComponent(day_input);

        modal.addLabelComponents(id_label, month_label, day_label);

        await interaction.showModal(modal);
    }

    // Create "Edit Birthday" modal when "Edit" button is pressed
    if (interaction.isButton() && interaction.customId.startsWith('birthday_btn_edit_')) {
        // Find matching user and extract month and day
        const user_id = interaction.customId.split('_').pop();
        const birthdays = JSON.parse(fs.readFileSync('./data/birthdays.json', 'utf8'));
        const user_record = birthdays.find(b => b.userId === user_id);

        if (user_record) {
            const modal = new ModalBuilder()
                .setCustomId(`birthday_modal_edit_${user_id}`)
                .setTitle('Edit Birthday');

            const month_input = new TextInputBuilder()
                .setCustomId('birthday_input_month')
                .setPlaceholder("MM")
                .setValue(String(user_record.month))
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const day_input = new TextInputBuilder()
                .setCustomId('birthday_input_day')
                .setPlaceholder("DD")
                .setValue(String(user_record.day))
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const month_label = new LabelBuilder()
                .setLabel("Month (1-12)")
                .setTextInputComponent(month_input);

            const day_label = new LabelBuilder()
                .setLabel("Day (1-31)")
                .setTextInputComponent(day_input);

            modal.addLabelComponents(month_label, day_label);

            await interaction.showModal(modal);
        }
    }

    // Delete birthday when "Edit" button is pressed
    if (interaction.isButton() && interaction.customId.startsWith('birthday_btn_delete_')) {
        // Find matching user
        const user_id = interaction.customId.split('_').pop();
        let birthdays = JSON.parse(fs.readFileSync('./data/birthdays.json', 'utf8'));
        
        // Remove user
        birthdays = birthdays.filter(b => b.userId !== user_id);
        
        // Re-sort and save birthdays
        birthdays.sort((a, b) => (a.month - b.month) || (a.day - b.day));
        fs.writeFileSync('./data/birthdays.json', JSON.stringify(birthdays, null, 2));

        // Update notification with success message
        await update_notification_UI(interaction, null, { 
            message: "Birthday successfully deleted", 
            type: "success" 
        });
    }

    // Submit "Add Birthday" and "Edit Birthday" modals
    if (interaction.isModalSubmit()) {
        let user_id;
        let is_add = false;

        // Get user ID from modal
        if (interaction.customId === 'birthday_modal_add') {
            is_add = true;
            user_id = interaction.fields.getTextInputValue('birthday_input_id');
        } else if (interaction.customId.startsWith('birthday_modal_edit_')) {
            user_id = interaction.customId.split('birthday_modal_edit_')[1];
        } else {
            return;
        }

        const month = parseInt(interaction.fields.getTextInputValue('birthday_input_month'));
        const day = parseInt(interaction.fields.getTextInputValue('birthday_input_day'));

        // Update notification with error message if both month or day inputted incorrectly
        if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
            return update_notification_UI(interaction, is_add ? null : user_id, {
                message: "Invalid birthday month or day! Birthday was not added",
                type: "error"
            });
        }

        if (is_add) {
            // Update notification with error message if user ID inputted incorrectly
            if (!/^\d{17,20}$/.test(user_id)) {
                return update_notification_UI(interaction, null, {
                    message: "Invalid user ID! Birthday was not added",
                    type: "error"
                });
            }

            // Update notification with error message if user ID not found in server
            try {
                await interaction.guild.members.fetch(user_id);
            } catch (err) {
                return update_notification_UI(interaction, null, {
                    message: "No matching user in this server! Birthday was not added",
                    type: "error"
                });
            }
        }

        // Read birthdays, update birthdays, and save birthdays
        const birthdays = JSON.parse(fs.readFileSync('./data/birthdays.json', 'utf8'));

        const filtered_birthdays = birthdays.filter(b => b.userId !== user_id);
        filtered_birthdays.push({ userId: user_id, month, day });

        filtered_birthdays.sort((a, b) => (a.month - b.month) || (a.day - b.day));
        fs.writeFileSync('./data/birthdays.json', JSON.stringify(filtered_birthdays, null, 2));

        // Update notification with success message
        await update_notification_UI(interaction, user_id, {
            message: is_add ? "Birthday successfully added" : "Birthday successfully edited",
            type: "success"
        });
    }

    // Update interface when user is selected in select menu
    if (interaction.isStringSelectMenu() && interaction.customId === 'birthday_select') {
        // Get user ID from selected user
        const selected_id = interaction.values[0];
        if (selected_id === 'none') return interaction.deferUpdate();

        // Update interface with user ID
        const components = await build_settings_interface(interaction.guild, selected_id);
        await interaction.update({ components, flags: [MessageFlags.IsComponentsV2] });
    }

    let setting_key = null;

    // Determine which select menu was interacted with
    if (interaction.isChannelSelectMenu() && interaction.customId === 'setting_select_channel') {
        setting_key = 'channelId';
    } else if (interaction.isRoleSelectMenu() && interaction.customId === 'setting_select_role') {
        setting_key = 'roleId';
    } else if (interaction.isStringSelectMenu() && interaction.customId === 'setting_select_timezone') {
        setting_key = 'timezone';
    }

    if (setting_key) {
        // Read settings, update settings, and save settings
        const saved_settings = JSON.parse(fs.readFileSync('./data/settings.json', 'utf8'));
        saved_settings[setting_key] = interaction.values[0];
        fs.writeFileSync('./data/settings.json', JSON.stringify(saved_settings, null, 2));

        // Update settings interface
        const components = await build_settings_interface(interaction.guild, null);
        await interaction.update({ components, flags: [MessageFlags.IsComponentsV2] });
    }
};