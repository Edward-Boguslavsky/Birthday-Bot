const { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    MessageFlags 
} = require('discord.js');
const fs = require('fs');
const buildSettingsInterface = require('../../interfaces/settings_interface');

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

        const components = await buildSettingsInterface(interaction.guild, null);
        await interaction.update({ components, flags: [MessageFlags.IsComponentsV2] });
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

        if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
            return interaction.reply({ content: '❌ Invalid Date entered.', flags: [MessageFlags.Ephemeral] });
        }

        const birthdays = JSON.parse(fs.readFileSync('./birthdays.json', 'utf8'));
        
        const filteredBirthdays = birthdays.filter(b => b.userId !== userId);
        filteredBirthdays.push({ userId, month, day });

        filteredBirthdays.sort((a, b) => (a.month - b.month) || (a.day - b.day));
        fs.writeFileSync('birthdays.json', JSON.stringify(filteredBirthdays, null, 2));

        const components = await buildSettingsInterface(interaction.guild, userId);
        await interaction.update({ components, flags: [MessageFlags.IsComponentsV2] });
    }

    // --- 5. HANDLE SELECT MENUS (BIRTHDAY LIST & TIMEZONE) ---
    if (interaction.isStringSelectMenu()) {
        
        // Birthday List Select
        if (interaction.customId === 'birthday_select') {
            const selectedId = interaction.values[0];
            if (selectedId === 'none') return interaction.deferUpdate();

            const components = await buildSettingsInterface(interaction.guild, selectedId);
            await interaction.update({ components, flags: [MessageFlags.IsComponentsV2] });
        } 
        
        // Timezone Select
        else if (interaction.customId === 'setting_select_timezone') {
            const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
            config.timezone = interaction.values[0];
            fs.writeFileSync('config.json', JSON.stringify(config, null, 2));

            const components = await buildSettingsInterface(interaction.guild, null);
            await interaction.update({ components, flags: [MessageFlags.IsComponentsV2] });
        }
    }

    // --- 6. HANDLE CONFIG SELECT MENUS (CHANNEL & ROLE) ---
    if (interaction.isChannelSelectMenu() && interaction.customId === 'setting_select_channel') {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        config.channelId = interaction.values[0];
        fs.writeFileSync('config.json', JSON.stringify(config, null, 2));

        const components = await buildSettingsInterface(interaction.guild, null);
        await interaction.update({ components, flags: [MessageFlags.IsComponentsV2] });
    }

    if (interaction.isRoleSelectMenu() && interaction.customId === 'setting_select_role') {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        config.roleId = interaction.values[0];
        fs.writeFileSync('config.json', JSON.stringify(config, null, 2));

        const components = await buildSettingsInterface(interaction.guild, null);
        await interaction.update({ components, flags: [MessageFlags.IsComponentsV2] });
    }
};