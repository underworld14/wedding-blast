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
client.once("ready", async () => {
  console.log("Client is ready!");

  // start blasting message once client is ready
  await prepareAndBlast();
});

// When the client received QR-Code
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

// Start your client
client.initialize();

const processWaNumber = (waNumber) => {
  waNumber = waNumber?.replace(/\D/g, "")?.trim();

  if (waNumber?.startsWith("0")) {
    waNumber = "62" + waNumber.substring(1);
  }

  return waNumber;
};

const sendMessage = async (name, number, link) => {
  const contact = await client.getNumberId(number);
  if (!contact) {
    throw new Error(`Contact ${name} (${number}) not found!`);
  }
  let message = `🎉👰🤵 Hello {{name}} and family! 🎉👰🤵

We're excited to share some wonderful news with you! On April 28, 2024, Yusril and Dian will be tying the knot, and we'd be honored to have you join us for the celebration of our love!

Please save the date, as your presence would mean the world to us! 

For more details and to RSVP, please visit {{link}}

Thank you for being a part of our journey. We can't wait to celebrate with you all! 🎊❤️

Best regards,
Yusril and Dian
`;

  message = message.replace("{{name}}", name).replace("{{link}}", link);

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
        await sendMessage(contact.name, contact.whatsapp, contact.link);
        console.log(
          ` 🎊❤️ Wedding invitation sent to ${contact.name} (${
            contact.whatsapp
          }) at ${new Date().toLocaleTimeString()}`
        );
      } catch {
        errors.push(contact);
        console.error(`Failed to send message to ${contact.name} (${contact.whatsapp})`);
      }
    }, 5000 * index);
  });
}
