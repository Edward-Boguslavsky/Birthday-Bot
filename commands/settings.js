const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const buildSettingsInterface = require('../interfaces/settings_interface');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Manage birthday settings'),

    run: async ({ interaction }) => {
        // 1. Defer Reply (Ephemeral)
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // 2. Build UI using the Interface
        const components = await buildSettingsInterface(interaction.guild);

        // 3. Send Response
        await interaction.editReply({
            components: components,
            flags: [MessageFlags.IsComponentsV2]
        });
    },
};