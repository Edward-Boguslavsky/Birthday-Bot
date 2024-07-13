const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const moment = require('moment');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('customize')
        .setDescription('Add, edit, or remove users\' birthdays'),

    async execute(interaction) {
        let originalInteraction = interaction;
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

            // Calculate total pages, ensuring at least 1 page even when empty
            const totalPages = Math.max(1, Math.ceil(userIds.length / 4));

            // Adjust currentPage if it's out of bounds
            currentPage = Math.min(currentPage, totalPages - 1);

            const messageOptions = { 
                content: '## Add, edit, or remove users\' birthdays\n\n' + 
                        `-# Page ${currentPage + 1} of ${totalPages}`,
                components: rows,
                ephemeral: true
            };
            
            if (edit) {
                await originalInteraction.editReply(messageOptions);
            } else {
                await int.reply(messageOptions);
                originalInteraction = int;
            }
        };

        await sendOrUpdateMessage(interaction);

        // Create a message collector and set a time limit for collecting interactions
        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 900000 // 15 minutes
        });

        collector.on('collect', async i => {
            if (i.customId === 'previous') {
                currentPage = Math.max(0, currentPage - 1);
                await sendOrUpdateMessage(null, true);
                await i.deferUpdate();
            } else if (i.customId === 'next') {
                currentPage = Math.min(Math.ceil(userIds.length / 4) - 1, currentPage + 1);
                await sendOrUpdateMessage(null, true);
                await i.deferUpdate();
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

                const firstActionRow = new ActionRowBuilder().addComponents(userIdInput);
                const secondActionRow = new ActionRowBuilder().addComponents(monthInput);
                const thirdActionRow = new ActionRowBuilder().addComponents(dayInput);

                modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

                await i.showModal(modal);
            } else if (i.customId.startsWith('remove_')) {
                const userId = i.customId.split('_')[1];
                delete birthdays[userId];
                sortBirthdays();
                fs.writeFileSync('birthdays.json', JSON.stringify(birthdays, null, 2));
                if (currentPage > 0 && currentPage * 4 >= userIds.length) {
                    currentPage--;
                }
                await sendOrUpdateMessage(null, true);
                await i.deferUpdate();
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

                const firstActionRow = new ActionRowBuilder().addComponents(monthInput);
                const secondActionRow = new ActionRowBuilder().addComponents(dayInput);

                modal.addComponents(firstActionRow, secondActionRow);

                await i.showModal(modal);
            }
        });

        collector.on('end', async () => {
            const embed = new EmbedBuilder()
                .setColor(0xF0B132)
                .setAuthor({ name: 'SESSION EXPIRED', iconURL: 'https://cdn3.emoji.gg/emojis/4260-info.png' })
                .setDescription('The previous session has expired. Please use the /customize command again')

            // Edit the original reply
            await originalInteraction.editReply({
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

                // Update the original message
                await sendOrUpdateMessage(null, true);
                await modalInteraction.deferUpdate();
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

                // Update the original message
                await sendOrUpdateMessage(null, true);
                await modalInteraction.deferUpdate();
            }
        });
    },
};