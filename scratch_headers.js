require('dotenv').config({ path: '.env' });
const { google } = require('googleapis');

async function run() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    });
    
    const sheetName = spreadsheet.data.sheets[0].properties.title;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
      range: `${sheetName}!A1:ZZ1`,
    });

    console.log("HEADERS:", response.data.values[0]);
  } catch (err) {
    console.error(err);
  }
}

run();
