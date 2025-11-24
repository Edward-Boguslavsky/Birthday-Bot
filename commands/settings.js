// Import required libraries
const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');
const build_settings_interface = require('../interfaces/settings_interface');

module.exports = {
    // Add slash command
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Manage birthday settings'),

    // Run slash command instructions
    run: async ({ interaction }) => {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const client = interaction.client;
        
        // Create warning message container
        const warning_container = new ContainerBuilder()
            .setAccentColor(0xFEE75C)
            .addTextDisplayComponents((text) => 
                text.setContent("### Another user opened the settings menu! You can only have one session at a time")
            );

        // Loop through previous sessions and close them
        if (client.settings_sessions && client.settings_sessions.length > 0) {
            for (const oldInteraction of client.settings_sessions) {
                try {
                    // Replace old interfaces with warning message
                    await oldInteraction.editReply({
                        components: [warning_container],
                        flags: [MessageFlags.IsComponentsV2]
                    });
                } catch (e) {
                    // Ignore instructions if old interfaces not found
                }
            }
        }

        // Reset the sessions list and add the current one
        client.settings_sessions = [interaction];

        // Set the interface to only chosen components
        const components = await build_settings_interface(interaction.guild);

        // Send interface to be displayed as ephemeral message
        await interaction.editReply({
            components: components,
            flags: [MessageFlags.IsComponentsV2]
        });
    },
};