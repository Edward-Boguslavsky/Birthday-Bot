# Birthday-Bot
A Discord bot built with [discord.js](https://discord.js.org/) and [CommandKit](https://commandkit.dev/) to wish your channel members happy birthday for you and give them a special, limited time gift! The bot features a clean GUI built into Discord's chat that can be accessed by server admins to easily configure settings and birthdays without having to memorize clunky commands!

## How it works
<img width="573" height="151" alt="Image" src="https://github.com/user-attachments/assets/2e141018-75c6-4252-bdd6-e94a7fbe697f" />

<sup>Birthday message</sup>

<img width="604" height="583" alt="Image" src="https://github.com/user-attachments/assets/35fa2fa9-88b2-4ae3-9674-ee53e974849c" />

<sup>Birthday bot settings GUI</sup>

### 1️⃣ Open GUI
Open up the bot's GUI by entering the `/settings` command in any text channel

<img width="815" height="107" alt="Image" src="https://github.com/user-attachments/assets/76f96b58-92f2-4a45-a27b-c42c4bdbbaa6" />

### 2️⃣ Set Announcement Channel
Select a channel to send the birthday wish into

<img width="425" height="268" alt="Image" src="https://github.com/user-attachments/assets/a100f11c-bffe-4cdc-9095-a8c02060b47d" />

### 3️⃣ Set Birthday Role
Select a role for the member to enjoy during their birthday

<img width="425" height="266" alt="Image" src="https://github.com/user-attachments/assets/60c3430c-17ce-4fd9-9f29-cff1d8f5e99f" />

### 4️⃣ Set Announcement Timezone
Select the timezone the server uses such that your birthday wishes are sent out at midnight

<img width="425" height="323" alt="Image" src="https://github.com/user-attachments/assets/e2c006b5-48d0-4ee2-b74d-243e8f189ba9" />

### 5️⃣ Add Birthdays
Add, edit, or delete birthdays from a saved list by entering their user ID, month, and day

<img width="425" height="326" alt="Image" src="https://github.com/user-attachments/assets/c4c1e44e-8a9b-4bd4-8453-a76b90ed3edb" />
<img width="708" height="715" alt="Image" src="https://github.com/user-attachments/assets/23ccf405-f7c0-4624-b319-de3a39ecc8b6" />

### 6️⃣ Sit back and enjoy the peace of mind!

## How to host it for yourself
#### 1. Find hosting service (ex. GCP)
   1. Create a new "compute engine" instance
   2. Open the SSH terminal
#### 2. Install Node.js
   1. Run `sudo apt-get update` to update the package lists
   2. If successful, run `sudo apt-get install -y nodejs npm` to install Node.js and npm
#### 3. Clone repository
   1. In a folder of your choice, run `git clone https://github.com/Edward-Boguslavsky/Birthday-Bot.git`
   2. After completion, enter the repo folder with `cd Birthday-Bot`
   3. In the repo folder, run `npm install` to install the bot's dependencies
#### 4. Add your Discord bot API token
   1. Enter `nano .env` to create an "environment variable" file
   2. Type in `DISCORD_BOT_TOKEN=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` where the `X`s represent your 72-character API token
   3. Save and exit with the commands `CTRL + O` followed by `CTRL + X`
#### 5. Run the bot 24/7
   1. Run `sudo npm install pm2 -g` to install PM2
   2. After installation, run `pm2 start index.js --name Birthday-Bot` to start the process
   3. To restart the process automatically in case of an outage, run `pm2 startup` to get your own custom command
   4. Copy, paste, and run your custom command. It should look like `sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u XXXXXXXXXXXXXXXX --hp /home/XXXXXXXXXXXXXXXX` where the `X`s represent your GCP username
   5. Finally, run `pm2 save` to save your process
