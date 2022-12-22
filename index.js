const {
  DisconnectReason,
  useSingleFileAuthState,
} = require("@adiwajshing/baileys");
const { default: axios } = require("axios");
const makeWaSocket = require("@adiwajshing/baileys").default;
require("dotenv").config();

const startSock = () => {
  const { state, saveState } = useSingleFileAuthState("./auth.json");
  const sock = makeWaSocket({
    printQRInTerminal: true,
    auth: state,
  });
  sock.ev.on("connection.update", function (update, connection2) {
    let _a, _b;
    let connection = update.connection,
      lastDisconnect = update.lastDisconnect;
    if (connection == "close") {
      if (
        ((_b =
          (_a = lastDisconnect.error) === null || _a === void 0
            ? void 0
            : _a.output) === null || _b === void 0
          ? void 0
          : _b.statusCode) !== DisconnectReason.loggedOut
      ) {
        startSock();
      }
    } else {
      console.log("connection closed");
    }
    console.log("connection update ", update);
  });

  sock.ev.on("creds.update", saveState);

  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    console.log(JSON.stringify(msg));
    const getNews = (tanggal, offset) => {
      const url = `${process.env.APP_URL}/api/berita?api_key=${process.env.API_KEY}&tanggal=${tanggal}&limit=1&offset=${offset}`;
      axios
        .get(url)
        .then(async (response) => {
          console.log(response.data);
          const { status, berita } = response.data;
          if (status) {
            function formatFullDate(date) {
              const monthNames = [
                "Januari",
                "Februari",
                "Maret",
                "April",
                "Mei",
                "Juni",
                "Juli",
                "Agustus",
                "September",
                "Oktober",
                "November",
                "Desember",
              ];
              let d = new Date(date),
                month = "" + monthNames[d.getMonth()],
                day = "" + d.getDate(),
                year = d.getFullYear();

              return [day, month, year].join(" ");
            }
            const buttons = [
              {
                buttonId: offset + 1 + "T" + tanggal,
                buttonText: { displayText: "Berita Lain" },
                type: 1,
              },
            ];

            const buttonMessage = {
              image: {
                url: `${process.env.APP_URL}/asset/foto_berita/${berita[0].gambar}`,
              },
              caption: `${berita[0].hari}, ${formatFullDate(
                berita[0].tanggal
              )}\n\n*${berita[0].judul}*\n\nBaca Selengkapnya ${
                process.env.APP_URL + "/berita/detail/" + berita[0].judul_seo
              }`,
              footer: "By Dinkominfo Demak",
              buttons: buttons,
              headerType: 4,
            };

            const sendMsg = await sock.sendMessage(
              msg.key.remoteJid,
              buttonMessage
            );
          }
        })
        .catch((err) => {
          // console.log(err);
          if (!err.response.data.status) {
            sock.sendMessage(msg.key.remoteJid, {
              text: "Berita tidak ditemukan!\n\nSapa Bot dengan ketik *Hai* / *Halo* / *Hi*",
            });
          }
        });
    };
    if (!msg.key.fromMe && m.type === "notify") {
      if (msg.key.remoteJid.includes("@s.whatsapp.net")) {
        //check if messages not come from group
        if (msg.message) {
          const dateNow = new Date().toISOString().split("T")[0];
          const conversation = msg.message.conversation.toLowerCase();
          const subConv2 = conversation.substring(0, 2);
          const btnRes = msg.message.buttonsResponseMessage;
          if (
            conversation == "hai" ||
            conversation == "halo" ||
            conversation == "hi"
          ) {
            const buttons = [
              {
                buttonId: "hari_ini",
                buttonText: { displayText: "Berita Hari Ini" },
                type: 1,
              },
            ];

            const buttonMessage = {
              text: `Hai ${msg.pushName},\n*SELAMAT DATANG DI BOT BERITA DINKOMINFO KABUPATEN DEMAK*\n\nklik tombol dibawah untuk melihat berita hari ini.\nCari berita berdasarkan tanggal ketik (contoh: 2022-01-31)`,
              footer: "By Dinkominfo Demak",
              buttons: buttons,
              headerType: 1,
            };
            await sock.sendMessage(msg.key.remoteJid, buttonMessage);
          } else if (subConv2 == "20") {
            function formatDate(date) {
              let d = new Date(date),
                month = "" + (d.getMonth() + 1),
                day = "" + d.getDate(),
                year = d.getFullYear();
              if (month.length < 2) month = "0" + month;
              if (day.length < 2) day = "0" + day;

              return [year, month, day].join("-");
            }
            const getDate = formatDate(conversation);
            getNews(getDate, 0);
          } else if (btnRes) {
            if (btnRes.selectedButtonId == "hari_ini") {
              getNews(dateNow, 0);
            } else if (btnRes.selectedDisplayText == "Berita Lain") {
              let tanggal = btnRes.selectedButtonId.split("T")[1];
              let offset = parseInt(btnRes.selectedButtonId.split("T")[0]);
              getNews(tanggal, offset);
            }
          }
          // else {
          //   await sock.sendMessage(msg.key.remoteJid, {
          //     text: "Welcome to Test Bot",
          //   });
          // }
        }
      }
    }
  });
};

startSock();
