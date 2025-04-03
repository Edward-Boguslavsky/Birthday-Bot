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

                await session.message.edit({
                    content: '',
                    embeds: [embed],
                    components: []
                });

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
            
            if (edit && activeSessions.has(int.user.id)) {
                const session = activeSessions.get(int.user.id);
                try {
                    await session.message.edit(messageOptions);
                } catch (error) {
                    if (error.code === 10008) { // Unknown Message error
                        // Message no longer exists, send a new one and update the session
                        const newMessage = await int.reply(messageOptions);
                        session.message = newMessage;
                    } else {
                        throw error; // Re-throw if it's a different error
                    }
                }
            } else {
                return await int.reply(messageOptions);
            }
        };

        const reply = await sendOrUpdateMessage(interaction);

        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 600000 // 10 minutes
        });

        // Store the new session
        activeSessions.set(interaction.user.id, {
            collector: collector,
            message: reply,
            guildId: guildId
        });

        collector.on('collect', async i => {
            if (i.customId === 'previous') {
                currentPage = Math.max(0, currentPage - 1);
            } else if (i.customId === 'next') {
                currentPage = Math.min(Math.ceil(userIds.length / 4) - 1, currentPage + 1);
            } else if (i.customId === 'add') {
                const modal = new ModalBuilder()
                    .setCustomId('add_birthday_modal')
                    .setTitle('Add Birthday');

                const userIdInput = new TextInputBuilder()
                    .setCustomId('userId')
                    .setLabel("User ID")
                    .setPlaceholder('XXXXXXXXXXXXXXXXXX')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMinLength(18)
                    .setMaxLength(18);

                const monthInput = new TextInputBuilder()
                    .setCustomId('month')
                    .setLabel("Month (1-12)")
                    .setPlaceholder('MM')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(2);

                const dayInput = new TextInputBuilder()
                    .setCustomId('day')
                    .setLabel("Day (1-31)")
                    .setPlaceholder('DD')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(2);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(userIdInput),
                    new ActionRowBuilder().addComponents(monthInput),
                    new ActionRowBuilder().addComponents(dayInput)
                );

                await i.showModal(modal);
                return;
            } else if (i.customId.startsWith('remove_')) {
                const userId = i.customId.split('_')[1];
                delete birthdays[userId];
                sortBirthdays();
                fs.writeFileSync('birthdays.json', JSON.stringify(birthdays, null, 2));
                if (currentPage > 0 && currentPage * 4 >= userIds.length) {
                    currentPage--;
                }
            } else if (i.customId.startsWith('username_')) {
                const userId = i.customId.split('_')[1];
                const modal = new ModalBuilder()
                    .setCustomId(`birthday_modal_${userId}`)
                    .setTitle('Edit Birthday');

                const monthInput = new TextInputBuilder()
                    .setCustomId('month')
                    .setLabel("Month (1-12)")
                    .setPlaceholder('MM')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(2);

                const dayInput = new TextInputBuilder()
                    .setCustomId('day')
                    .setLabel("Day (1-31)")
                    .setPlaceholder('DD')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(2);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(monthInput),
                    new ActionRowBuilder().addComponents(dayInput)
                );

                await i.showModal(modal);
                return;
            }

            // Pass the interaction object directly
            await sendOrUpdateMessage(i, true);
            await i.deferUpdate();
        });

        collector.on('end', async () => {
            // Remove the session when the collector ends
            const session = activeSessions.get(interaction.user.id);
            activeSessions.delete(interaction.user.id);

            const embed = new EmbedBuilder()
                .setColor(0xF0B132)
                .setAuthor({ name: 'SESSION EXPIRED', iconURL: 'https://cdn3.emoji.gg/emojis/4260-info.png' })
                .setDescription('This session has expired automatically after 10 minutes. Use the /customize command again to continue')

            // Edit the original reply
            await session.message.edit({
                content: '',
                embeds: [embed],
                components: [] // Remove all components
            });
        });

        // Handle modal submissions
        interaction.client.on('interactionCreate', async (modalInteraction) => {
            if (!modalInteraction.isModalSubmit()) return;

            const createErrorEmbed = (description) => {
                return new EmbedBuilder()
                    .setColor(0xED4245)
                    .setAuthor({ name: 'ERROR', iconURL: 'https://cdn3.emoji.gg/emojis/6426-error.png' })
                    .setDescription(description);
            };

            const sendErrorAndReturn = async (description) => {
                await modalInteraction.reply({ 
                    embeds: [createErrorEmbed(description)], 
                    ephemeral: true 
                });

                setTimeout(async () => {
                    await modalInteraction.deleteReply();
                }, 10000); // 10 seconds

                return;
            };

            if (modalInteraction.customId === 'add_birthday_modal') {
                const userId = modalInteraction.fields.getTextInputValue('userId');
                const month = modalInteraction.fields.getTextInputValue('month');
                const day = modalInteraction.fields.getTextInputValue('day');

                birthdays = JSON.parse(fs.readFileSync('birthdays.json', 'utf8'));

                // Validate input
                if (birthdays.hasOwnProperty(userId)) {
                    await sendErrorAndReturn('This user already has a birthday set. Use the edit function to change it');
                    return;
                }

                if (!/^\d{18}$/.test(userId)) {
                    await sendErrorAndReturn('Invalid User ID. Please enter a valid 18-digit user ID');
                    return;
                }

                if (!(await modalInteraction.guild.members.fetch(userId).catch(() => null))) {
                    await sendErrorAndReturn('Invalid User ID. There are no users in this server with that user ID');
                    return;
                }

                if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
                    await sendErrorAndReturn('Invalid birthday. Please enter valid numbers for month (1-12) and day (1-31)');
                    return;
                }

                const newBirthday = `${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                birthdays[userId] = newBirthday;

                // Sort birthdays and update userIds
                sortBirthdays();

                // Update birthdays.json
                fs.writeFileSync('birthdays.json', JSON.stringify(birthdays, null, 2));

                // Find the new page for the added user
                const userIndex = userIds.indexOf(userId);
                currentPage = Math.floor(userIndex / 4);
            } else if (modalInteraction.customId.startsWith('birthday_modal_')) {
                const userId = modalInteraction.customId.split('_')[2];
                const month = modalInteraction.fields.getTextInputValue('month');
                const day = modalInteraction.fields.getTextInputValue('day');

                // Validate input
                if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
                    await sendErrorAndReturn('Invalid birthday. Please enter valid numbers for month (1-12) and day (1-31)');
                    return;
                }

                const newBirthday = `${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                birthdays[userId] = newBirthday;

                // Sort birthdays and update userIds
                sortBirthdays();

                // Update birthdays.json
                fs.writeFileSync('birthdays.json', JSON.stringify(birthdays, null, 2));

                // Find the new page for the edited user
                const userIndex = userIds.indexOf(userId);
                currentPage = Math.floor(userIndex / 4);
            }

            // Update the message after processing the modal
            if (activeSessions.has(modalInteraction.user.id)) {
                await sendOrUpdateMessage(modalInteraction, true);
            }
            
            // Acknowledge the modal submission without sending a visible reply
            if (!modalInteraction.deferred && !modalInteraction.replied) {
                await modalInteraction.deferUpdate();
            }
        });
    },
};