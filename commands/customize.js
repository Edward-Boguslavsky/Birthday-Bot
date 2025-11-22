const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const moment = require('moment');

// Map to store active sessions
const activeSessions = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('customize')
        .setDescription('Add, edit, or remove users\' birthdays'),

    async execute(interaction) {
        const guildId = interaction.guildId;

        // End all active sessions in this server
        for (const [userId, session] of activeSessions) {
            if (session.guildId === guildId) {
                session.collector.stop();
                
                const description = interaction.user.id == userId
                    ? 'You have started a new session causing this one to expire automatically'
                    : `Another user has started a new session causing this one to expire automatically. Use the /customize command again to continue`;

                const embed = new EmbedBuilder()
                    .setColor(0xF0B132)
                    .setAuthor({ name: 'SESSION EXPIRED', iconURL: 'https://cdn3.emoji.gg/emojis/4260-info.png' })
                    .setDescription(description);

                // Check if message still exists before editing
                try {
                    await session.message.edit({
                        content: '',
                        embeds: [embed],
                        components: []
                    });
                } catch (e) { /* Message likely deleted, ignore */ }

                activeSessions.delete(userId);
            }
        }

        let birthdays = JSON.parse(fs.readFileSync('birthdays.json', 'utf8'));
        let userIds = Object.keys(birthdays);
        let currentPage = 0;

        const sortBirthdays = () => {
            const sortedEntries = Object.entries(birthdays).sort((a, b) => {
                const dateA = moment(a[1], 'MM-DD');
                const dateB = moment(b[1], 'MM-DD');
                return dateA.valueOf() - dateB.valueOf();
            });
            birthdays = Object.fromEntries(sortedEntries);
            userIds = Object.keys(birthdays);
        };

        sortBirthdays();

        const formatBirthday = (birthday) => {
            const [month, day] = birthday.split('-');
            return `${parseInt(month)}/${parseInt(day)}`;
        };

        const generateRows = async (page) => {
            const rows = [];
            for (let i = 0; i < 4; i++) {
                const index = page * 4 + i;
                if (index < userIds.length) {
                    const userId = userIds[index];
                    const member = await interaction.guild.members.fetch(userId).catch(() => null);
                    const displayName = member ? member.displayName : 'Unknown User';
                    
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`remove_${userId}`)
                                .setLabel('✖')
                                .setStyle(ButtonStyle.Danger),
                            new ButtonBuilder()
                                .setCustomId(`birthday_${userId}`)
                                .setLabel(formatBirthday(birthdays[userId]))
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId(`username_${userId}`)
                                .setLabel(displayName)
                                .setStyle(ButtonStyle.Primary)
                        );
                    rows.push(row);
                }
            }
            return rows;
        };

        const generateControlRow = () => {
            return new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('add')
                        .setLabel('✚')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('<')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('>')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage >= Math.ceil(userIds.length / 4) - 1)
                );
        };

        const sendOrUpdateMessage = async (int, edit = false) => {
            const rows = await generateRows(currentPage);
            rows.push(generateControlRow());

            const totalPages = Math.max(1, Math.ceil(userIds.length / 4));
            currentPage = Math.min(currentPage, totalPages - 1);

            const messageOptions = { 
                content: '## Add, edit, or remove users\' birthdays\n\n' + 
                        `-# Page ${currentPage + 1} of ${totalPages}`,
                components: rows,
                ephemeral: true
            };
            
            if (edit && activeSessions.has(interaction.user.id)) {
                const session = activeSessions.get(interaction.user.id);
                try {
                    await session.message.edit(messageOptions);
                } catch (error) {
                    if (error.code === 10008) { 
                        const newMessage = await int.reply(messageOptions);
                        session.message = newMessage;
                    } else {
                        throw error; 
                    }
                }
            } else {
                return await int.reply(messageOptions);
            }
        };

        // Helper for error handling inside the collector
        const sendErrorAndReturn = async (targetInteraction, description) => {
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setAuthor({ name: 'ERROR', iconURL: 'https://cdn3.emoji.gg/emojis/6426-error.png' })
                .setDescription(description);

            await targetInteraction.reply({ embeds: [embed], ephemeral: true });
            // Don't delete immediately so they can read it, but ephemeral handles cleanup naturally usually.
            // If you specifically want it deleted after 10s:
            setTimeout(() => targetInteraction.deleteReply().catch(() => {}), 10000);
        };

        const reply = await sendOrUpdateMessage(interaction);

        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 600000 // 10 minutes
        });

        activeSessions.set(interaction.user.id, {
            collector: collector,
            message: reply,
            guildId: guildId
        });

        collector.on('collect', async i => {
            if (i.customId === 'previous') {
                currentPage = Math.max(0, currentPage - 1);
                await sendOrUpdateMessage(i, true);
                await i.deferUpdate();

            } else if (i.customId === 'next') {
                currentPage = Math.min(Math.ceil(userIds.length / 4) - 1, currentPage + 1);
                await sendOrUpdateMessage(i, true);
                await i.deferUpdate();

            } else if (i.customId.startsWith('remove_')) {
                const userId = i.customId.split('_')[1];
                delete birthdays[userId];
                sortBirthdays();
                fs.writeFileSync('birthdays.json', JSON.stringify(birthdays, null, 2));
                if (currentPage > 0 && currentPage * 4 >= userIds.length) {
                    currentPage--;
                }
                await sendOrUpdateMessage(i, true);
                await i.deferUpdate();

            } else if (i.customId === 'add') {
                const modal = new ModalBuilder()
                    .setCustomId('add_birthday_modal')
                    .setTitle('Add Birthday');

                const userIdInput = new TextInputBuilder()
                    .setCustomId('userId').setLabel("User ID").setPlaceholder('XXXXXXXXXXXXXXXXXX')
                    .setStyle(TextInputStyle.Short).setRequired(true).setMinLength(18).setMaxLength(18);

                const monthInput = new TextInputBuilder()
                    .setCustomId('month').setLabel("Month (1-12)").setPlaceholder('MM')
                    .setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(2);

                const dayInput = new TextInputBuilder()
                    .setCustomId('day').setLabel("Day (1-31)").setPlaceholder('DD')
                    .setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(2);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(userIdInput),
                    new ActionRowBuilder().addComponents(monthInput),
                    new ActionRowBuilder().addComponents(dayInput)
                );

                await i.showModal(modal);

                // Wait for the specific modal submission
                const modalSubmit = await i.awaitModalSubmit({
                    filter: (m) => m.customId === 'add_birthday_modal' && m.user.id === i.user.id,
                    time: 60000
                }).catch(() => null);

                if (!modalSubmit) return; // Timed out or cancelled

                const userId = modalSubmit.fields.getTextInputValue('userId');
                const month = modalSubmit.fields.getTextInputValue('month');
                const day = modalSubmit.fields.getTextInputValue('day');

                // Validation
                birthdays = JSON.parse(fs.readFileSync('birthdays.json', 'utf8')); // Refresh file

                if (birthdays.hasOwnProperty(userId)) {
                    await sendErrorAndReturn(modalSubmit, 'This user already has a birthday set. Use the edit function to change it');
                    return;
                }
                if (!/^\d{18}$/.test(userId)) {
                    await sendErrorAndReturn(modalSubmit, 'Invalid User ID. Please enter a valid 18-digit user ID');
                    return;
                }
                if (!(await interaction.guild.members.fetch(userId).catch(() => null))) {
                    await sendErrorAndReturn(modalSubmit, 'Invalid User ID. There are no users in this server with that user ID');
                    return;
                }
                if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
                    await sendErrorAndReturn(modalSubmit, 'Invalid birthday. Please enter valid numbers for month (1-12) and day (1-31)');
                    return;
                }

                birthdays[userId] = `${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                sortBirthdays();
                fs.writeFileSync('birthdays.json', JSON.stringify(birthdays, null, 2));

                // Move to the page where the user was added
                const userIndex = userIds.indexOf(userId);
                currentPage = Math.floor(userIndex / 4);
                
                // Update UI via the Modal Interaction
                await sendOrUpdateMessage(modalSubmit, true);
                await modalSubmit.deferUpdate();

            } else if (i.customId.startsWith('username_')) {
                const userId = i.customId.split('_')[1];
                const modal = new ModalBuilder()
                    .setCustomId(`birthday_modal_${userId}`)
                    .setTitle('Edit Birthday');

                const monthInput = new TextInputBuilder()
                    .setCustomId('month').setLabel("Month (1-12)").setPlaceholder('MM')
                    .setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(2);

                const dayInput = new TextInputBuilder()
                    .setCustomId('day').setLabel("Day (1-31)").setPlaceholder('DD')
                    .setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(2);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(monthInput),
                    new ActionRowBuilder().addComponents(dayInput)
                );

                await i.showModal(modal);

                // Wait for submission
                const modalSubmit = await i.awaitModalSubmit({
                    filter: (m) => m.customId === `birthday_modal_${userId}` && m.user.id === i.user.id,
                    time: 60000
                }).catch(() => null);

                if (!modalSubmit) return;

                const month = modalSubmit.fields.getTextInputValue('month');
                const day = modalSubmit.fields.getTextInputValue('day');

                if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
                    await sendErrorAndReturn(modalSubmit, 'Invalid birthday. Please enter valid numbers for month (1-12) and day (1-31)');
                    return;
                }

                birthdays = JSON.parse(fs.readFileSync('birthdays.json', 'utf8'));
                birthdays[userId] = `${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                sortBirthdays();
                fs.writeFileSync('birthdays.json', JSON.stringify(birthdays, null, 2));

                // Ensure we stay on correct page
                const userIndex = userIds.indexOf(userId);
                currentPage = Math.floor(userIndex / 4);

                await sendOrUpdateMessage(modalSubmit, true);
                await modalSubmit.deferUpdate();
            }
        });

        collector.on('end', async () => {
            if (activeSessions.has(interaction.user.id)) {
                const session = activeSessions.get(interaction.user.id);
                activeSessions.delete(interaction.user.id);
                
                const embed = new EmbedBuilder()
                    .setColor(0xF0B132)
                    .setAuthor({ name: 'SESSION EXPIRED', iconURL: 'https://cdn3.emoji.gg/emojis/4260-info.png' })
                    .setDescription('This session has expired automatically after 10 minutes. Use the /customize command again to continue');

                try {
                    await session.message.edit({
                        content: '',
                        embeds: [embed],
                        components: [] 
                    });
                } catch (e) { }
            }
        });
    },
};