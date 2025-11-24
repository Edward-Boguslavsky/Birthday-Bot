const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');
const buildSettingsInterface = require('../interfaces/settings_interface');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Manage birthday settings'),

    run: async ({ interaction }) => {
        // 1. Defer Reply (Ephemeral)
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // --- SESSION MANAGEMENT ---
        const client = interaction.client;
        
        // Create the warning container
        const warningContainer = new ContainerBuilder()
            .setAccentColor(0xFEE75C) // Discord Yellow
            .addTextDisplayComponents((text) => 
                text.setContent("### Another user opened the settings menu! You can only have one session at a time")
            );

        // Loop through previous sessions and close them
        if (client.settingsSessions && client.settingsSessions.length > 0) {
            for (const oldInteraction of client.settingsSessions) {
                try {
                    // Replace the old interface with the warning
                    await oldInteraction.editReply({
                        components: [warningContainer],
                        flags: [MessageFlags.IsComponentsV2]
                    });
                } catch (e) {
                    // Interaction might have expired or been dismissed; ignore.
                }
            }
        }

        // Reset the sessions list and add the current one
        client.settingsSessions = [interaction];
        // --------------------------

        // 2. Build UI using the Interface
        const components = await buildSettingsInterface(interaction.guild);

        // 3. Send Response
        await interaction.editReply({
            components: components,
            flags: [MessageFlags.IsComponentsV2]
        });
    },
};