const path = require("node:path");
const process = require("node:process");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const readXlsxFile = require("read-excel-file/node");

const client = new Client({
  webVersion: "2.2410.1",
  webVersionCache: {
    type: "remote",
    remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2410.1.html",
  },
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--no-first-run",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--single-process",
      "--no-zygote",
    ],
  },
});

// When the client is ready, run this code (only once)
client.once("ready", () => {
  console.log("Client is ready!");

  // start blasting message once client is ready
  prepareAndBlast();
});

// When the client received QR-Code
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

// Start your client
// client.initialize();

prepareAndBlast();

const processWaNumber = (waNumber) => {
  waNumber = waNumber?.replace(/\D/g, "")?.trim();

  if (waNumber?.startsWith("0")) {
    waNumber = "62" + waNumber.substring(1);
  }

  return waNumber;
};

const sendMessage = async (name, number) => {
  const contact = await client.getNumberId(number);
  const message = `Halo ${name}, terima kasih sudah mengisi form RSVP kami. Silakan klik link berikut untuk mengisi formulir RSVP: ${link}`;
  await client.sendMessage(contact._serialized, message);
};

async function prepareAndBlast() {
  const pathToExcel = path.join(process.cwd(), "input/wedding.xlsx");
  const excelSchema = {
    Nama: {
      prop: "name",
      type: String,
    },
    "No Whatsapp": {
      prop: "whatsapp",
      type: String,
    },
  };

  const { rows } = await readXlsxFile(pathToExcel, { schema: excelSchema });

  const validWhatsapp = rows.map((row) => ({
    ...row,
    whatsapp: processWaNumber(row.whatsapp),
    link: `https://dianyusril.izza.dev?to=${encodeURIComponent(row.name)}`,
  }));

  let errors = [];

  validWhatsapp.forEach(async (contact, index) => {
    setTimeout(async () => {
      try {
        await sendMessage(contact.name, contact.whatsapp);
        console.log(`Message sent to ${contact.name} (${contact.whatsapp})`);
      } catch {
        errors.push(contact);
        console.error(`Failed to send message to ${contact.name} (${contact.whatsapp})`);
      }
    }, 5000 * index);
  });
}
