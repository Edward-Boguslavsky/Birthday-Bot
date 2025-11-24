const { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    MessageFlags 
} = require('discord.js');
const fs = require('fs');
const buildSettingsInterface = require('../../interfaces/settings_interface');

/**
 * Helper to update the UI with a notification, then clear it after 5 seconds.
 */
async function updateUIWithNotification(interaction, selectedUserId, notification) {
    // 1. Show Notification
    const components = await buildSettingsInterface(interaction.guild, selectedUserId, notification);
    await interaction.update({ components, flags: [MessageFlags.IsComponentsV2] });

    // 2. Wait 5 seconds, then clear it
    setTimeout(async () => {
        try {
            // Rebuild without notification (null)
            const clearComponents = await buildSettingsInterface(interaction.guild, selectedUserId, null);
            
            // Use editReply because the interaction was already updated/replied to
            await interaction.editReply({ components: clearComponents, flags: [MessageFlags.IsComponentsV2] });
        } catch (e) {
            // Interaction might have expired or message deleted; ignore.
        }
    }, 6667);
}

module.exports = async (interaction) => {
    
    // --- 1. HANDLE ADD BUTTON ---
    if (interaction.isButton() && interaction.customId === 'birthday_btn_add') {
        const modal = new ModalBuilder()
            .setCustomId('birthday_modal_add')
            .setTitle('Add Birthday');

        const idInput = new TextInputBuilder()
            .setCustomId('birthday_input_id')
            .setLabel("User ID")
            .setPlaceholder("XXXXXXXXXXXXXXXXXX")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const monthInput = new TextInputBuilder()
            .setCustomId('birthday_input_month')
            .setLabel("Month (1-12)")
            .setPlaceholder("MM")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const dayInput = new TextInputBuilder()
            .setCustomId('birthday_input_day')
            .setLabel("Day (1-31)")
            .setPlaceholder("DD")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(idInput),
            new ActionRowBuilder().addComponents(monthInput),
            new ActionRowBuilder().addComponents(dayInput)
        );

        await interaction.showModal(modal);
    }

    // --- 2. HANDLE EDIT BUTTON ---
    if (interaction.isButton() && interaction.customId.startsWith('birthday_btn_edit_')) {
        const userId = interaction.customId.split('_').pop();
        const birthdays = JSON.parse(fs.readFileSync('./birthdays.json', 'utf8'));
        const userRecord = birthdays.find(b => b.userId === userId);

        if (userRecord) {
            const modal = new ModalBuilder()
                .setCustomId(`birthday_modal_edit_${userId}`)
                .setTitle('Edit Birthday');

            const monthInput = new TextInputBuilder()
                .setCustomId('birthday_input_month')
                .setLabel("Month (1-12)")
                .setPlaceholder("MM")
                .setValue(String(userRecord.month))
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const dayInput = new TextInputBuilder()
                .setCustomId('birthday_input_day')
                .setLabel("Day (1-31)")
                .setPlaceholder("DD")
                .setValue(String(userRecord.day))
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(monthInput),
                new ActionRowBuilder().addComponents(dayInput)
            );

            await interaction.showModal(modal);
        } else {
            // Fallback error (should rarely happen unless file changed)
            await interaction.reply({ content: '❌ User not found.', flags: [MessageFlags.Ephemeral] });
        }
    }

    // --- 3. HANDLE DELETE BUTTON ---
    if (interaction.isButton() && interaction.customId.startsWith('birthday_btn_delete_')) {
        const userId = interaction.customId.split('_').pop();
        let birthdays = JSON.parse(fs.readFileSync('./birthdays.json', 'utf8'));
        
        birthdays = birthdays.filter(b => b.userId !== userId);
        
        birthdays.sort((a, b) => (a.month - b.month) || (a.day - b.day));
        fs.writeFileSync('birthdays.json', JSON.stringify(birthdays, null, 2));

        // Success Notification: "Birthday successfully deleted"
        await updateUIWithNotification(interaction, null, { 
            message: "Birthday successfully deleted", 
            type: "success" 
        });
    }

    // --- 4. HANDLE MODAL SUBMIT ---
    if (interaction.isModalSubmit()) {
        let userId;
        let isAddMode = false;

        if (interaction.customId === 'birthday_modal_add') {
            isAddMode = true;
            userId = interaction.fields.getTextInputValue('birthday_input_id');
        } else if (interaction.customId.startsWith('birthday_modal_edit_')) {
            userId = interaction.customId.split('birthday_modal_edit_')[1];
        } else {
            return;
        }

        const month = parseInt(interaction.fields.getTextInputValue('birthday_input_month'));
        const day = parseInt(interaction.fields.getTextInputValue('birthday_input_day'));

        // -- VALIDATION START --
        
        // 1. Date Check
        if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
            return updateUIWithNotification(interaction, isAddMode ? null : userId, {
                message: "Invalid birthday month or day! Birthday was not added",
                type: "error"
            });
        }

        // 2. Add Mode Specific Checks
        if (isAddMode) {
            // Check ID format (Must be numeric and decent length)
            if (!/^\d{17,20}$/.test(userId)) {
                return updateUIWithNotification(interaction, null, {
                    message: "Invalid user ID! Birthday was not added",
                    type: "error"
                });
            }

            // Check if user exists in server
            try {
                await interaction.guild.members.fetch(userId);
            } catch (err) {
                return updateUIWithNotification(interaction, null, {
                    message: "No matching user in this server! Birthday was not added",
                    type: "error"
                });
            }
        }
        // -- VALIDATION END --

        // Save Data
        const birthdays = JSON.parse(fs.readFileSync('./birthdays.json', 'utf8'));
        
        const filteredBirthdays = birthdays.filter(b => b.userId !== userId);
        filteredBirthdays.push({ userId, month, day });

        filteredBirthdays.sort((a, b) => (a.month - b.month) || (a.day - b.day));
        fs.writeFileSync('birthdays.json', JSON.stringify(filteredBirthdays, null, 2));

        // Success Notification
        const successMessage = isAddMode ? "Birthday successfully added" : "Birthday successfully edited";
        
        await updateUIWithNotification(interaction, userId, {
            message: successMessage,
            type: "success"
        });
    }

    // --- 5. HANDLE BIRTHDAY SELECT MENU ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'birthday_select') {
        const selectedId = interaction.values[0];
        if (selectedId === 'none') return interaction.deferUpdate();

        const components = await buildSettingsInterface(interaction.guild, selectedId);
        await interaction.update({ components, flags: [MessageFlags.IsComponentsV2] });
    }

    // --- 6. HANDLE CONFIG SELECT MENUS ---
    if (interaction.isChannelSelectMenu() && interaction.customId === 'setting_select_channel') {
        const config = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
        config.channelId = interaction.values[0];
        fs.writeFileSync('settings.json', JSON.stringify(config, null, 2));

        const components = await buildSettingsInterface(interaction.guild, null);
        await interaction.update({ components, flags: [MessageFlags.IsComponentsV2] });
    }

    if (interaction.isRoleSelectMenu() && interaction.customId === 'setting_select_role') {
        const config = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
        config.roleId = interaction.values[0];
        fs.writeFileSync('settings.json', JSON.stringify(config, null, 2));

        const components = await buildSettingsInterface(interaction.guild, null);
        await interaction.update({ components, flags: [MessageFlags.IsComponentsV2] });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'setting_select_timezone') {
        const config = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
        config.timezone = interaction.values[0];
        fs.writeFileSync('settings.json', JSON.stringify(config, null, 2));

        const components = await buildSettingsInterface(interaction.guild, null);
        await interaction.update({ components, flags: [MessageFlags.IsComponentsV2] });
    }
};