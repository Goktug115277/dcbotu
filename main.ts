import {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  type Interaction,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
} from "discord.js";
import express from "express"; // Render port hatasını çözmek için

// 1. BASİT LOGGER SİSTEMİ (Harici dosya bağımlılığını bitirmek için)
const logger = {
  info: (msg: string | object, detail?: string) => console.log(`[INFO]`, msg, detail || ""),
  error: (msg: string | object, detail?: string) => console.error(`[ERROR]`, msg, detail || "")
};

// 2. ORTAM DEĞİŞKENLERİ KONTROLÜ
const token = process.env["DISCORD_BOT_TOKEN"];
const clientId = process.env["DISCORD_CLIENT_ID"];
const PORT = process.env["PORT"] || 3000; // Render otomatik bir port atar

if (!token) throw new Error("DISCORD_BOT_TOKEN environment variable is required");
if (!clientId) throw new Error("DISCORD_CLIENT_ID environment variable is required");

// 3. SLASH KOMUT TANIMI
const command = new SlashCommandBuilder()
  .setName("gelcek")
  .setDescription("Oyun için birini ara")
  .addStringOption((opt) =>
    opt.setName("oyun").setDescription("Oyun adı").setRequired(true)
  );

// 4. KOMUTLARI DİSCORD'A KAYDETME FONKSİYONU
async function registerCommands() {
  const rest = new REST().setToken(token!);
  try {
    await rest.put(Routes.applicationCommands(clientId!), {
      body: [command.toJSON()],
    });
    logger.info("Discord slash komutları kaydedildi");
  } catch (err) {
    logger.error("Slash komutları kaydedilemedi", err as string);
  }
}

// 5. ETKİLEŞİM YÖNETİCİLERİ (Handlers)
async function handleGelcek(interaction: ChatInputCommandInteraction) {
  const oyun = interaction.options.getString("oyun", true);
  const kullanici = interaction.user;
  const zaman = `<t:${Math.floor(Date.now() / 1000)}:F>`;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🎮 Oyuncu Aranıyor!")
    .setDescription(`${kullanici} **gelcek** birisini arıyor`)
    .addFields(
      { name: "🎮 Oyun", value: oyun, inline: true },
      { name: "⏰ Mesaj Atılan Zaman", value: zaman, inline: true },
      { name: "👤 Kişi", value: `${kullanici}`, inline: true }
    )
    .setThumbnail(kullanici.displayAvatarURL())
    .setFooter({ text: "Gelmek için aşağıdaki butona bas!" });

  const button = new ButtonBuilder()
    .setCustomId(`gelcem_${kullanici.id}`)
    .setLabel("Gelcem!")
    .setStyle(ButtonStyle.Success)
    .setEmoji("✅");

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

  await interaction.reply({ content: "@everyone", embeds: [embed], components: [row] });
}

async function handleGelcemButton(interaction: ButtonInteraction) {
  const customId = interaction.customId;
  const arayanId = customId.replace("gelcem_", "");
  const gelen = interaction.user;

  if (gelen.id === arayanId) {
    await interaction.reply({
      content: "Kendi mesajına gelcem diyemezsin!",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: `<@${arayanId}> <@${gelen.id}> bu kişi **gelcem** dedi!`,
  });
}

// 6. BOTU BAŞLATMA VE RENDER İÇİN WEB SERVER KURULUMU
export async function startBot() {
  // Render port hatası vermesin ve bot açık kalsın diye mini web sunucusu açıyoruz
  const app = express();
  app.get("/", (req, res) => res.send("Bot aktif ve çalışıyor!"));
  app.listen(PORT, () => logger.info(`Render port dinleniyor: ${PORT}`));

  await registerCommands();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once(Events.ClientReady, (c) => {
    logger.info(`Discord botu hazır: ${c.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === "gelcek") {
        await handleGelcek(interaction);
      } else if (interaction.isButton() && interaction.customId.startsWith("gelcem_")) {
        await handleGelcemButton(interaction);
      }
    } catch (err) {
      logger.error("Interaction hatası", err as string);
      if (interaction.isRepliable() && !interaction.replied) {
        await interaction.reply({
          content: "Bir hata oluştu, lütfen tekrar dene.",
          ephemeral: true,
        });
      }
    }
  });

  await client.login(token);
}

// Botu direkt çalıştırmak için (efter export)
startBot();
