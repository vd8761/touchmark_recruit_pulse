import { Resend } from "resend";
import { prisma } from "./prisma";

// Ensure this doesn't crash if the key is missing in development
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function getAlertEmail() {
  const settingsRow = await prisma.appSetting.findUnique({
    where: { key: "alertEmailId" },
  });
  
  if (!settingsRow || !settingsRow.value) return null;
  return settingsRow.value;
}

// Helper to get currency settings for formatting emails
async function getCurrencySettings() {
  const settingsRow = await prisma.appSetting.findMany({
    where: { key: { in: ["currencyCode", "currencyLocale"] } }
  });
  let currencyCode = "USD";
  let currencyLocale = "en-US";
  if (settingsRow && settingsRow.length > 0) {
    const codeSetting = settingsRow.find(s => s.key === "currencyCode");
    const localeSetting = settingsRow.find(s => s.key === "currencyLocale");
    if (codeSetting?.value) currencyCode = codeSetting.value;
    if (localeSetting?.value) currencyLocale = localeSetting.value;
  }
  return { currencyCode, currencyLocale };
}

// Ensure the sender email is configured, fallback to a standard no-reply format
// Note: In a real Resend setup, you MUST use a verified domain (e.g., alerts@yourdomain.com)
// If you are just testing, you can use the default "onboarding@resend.dev" which only sends to your own email.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "no-reply@recruit.touchmarkdes.com";


function wrapEmailTemplate(content: string, previewText: string = "Touchmark Recruit Pulse Update") {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${previewText}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
        
        <!-- Header -->
        <div style="padding: 30px 40px; border-bottom: 1px solid #f1f5f9; text-align: center; background-color: #ffffff;">
          <div style="display: inline-block; text-align: left;">
            <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.25em; color: #334155; text-transform: uppercase; line-height: 1; margin-bottom: 4px;">TOUCHMARK</div>
            <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.025em; color: #0f172a; line-height: 1;">
              Recruit<span style="color: #f59e0b;">Pulse</span>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div style="padding: 40px; color: #334155; line-height: 1.6; font-size: 15px;">
          ${content}
        </div>

        <!-- Footer -->
        <div style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
          <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: 500;">
            &copy; ${new Date().getFullYear()} Touchmark Descience. All rights reserved.
          </p>
          <p style="margin: 6px 0 0 0; font-size: 12px; color: #94a3b8;">
            This is an automated message. Please do not reply directly to this email.
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `;
}

function buildKeyValueTable(items: { label: string; value: string | number }[]) {
  const rows = items.map(item => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600; width: 40%; vertical-align: top;">
        ${item.label}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 500; vertical-align: top;">
        ${item.value}
      </td>
    </tr>
  `).join("");

  return `
    <table style="width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #fafafa;">
      ${rows}
    </table>
  `;
}

// ------------------------------------------------------------------
// 2FA Auth Emails
// ------------------------------------------------------------------

export async function send2FAEmail(email: string, name: string, otp: string) {
  if (!resend) return console.warn("RESEND_API_KEY not set. Skipping 2FA email.");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Your Touchmark 2FA Code",
      html: wrapEmailTemplate(`
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #f59e0b;">Login Verification</h2>
          <p>Hi ${name},</p>
          <p>Your one-time passcode for logging in is:</p>
          <div style="background: #f1f5f9; padding: 16px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; border-radius: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes. If you did not request this code, please contact your administrator immediately.</p>
          <p>Best,<br>Touchmark RecruitPulse</p>
        </div>
      `),
    });
  } catch (error) {
    console.error("Failed to send 2FA email:", error);
  }
}

export async function sendUserInviteEmail(email: string, name: string, tempPassword: string) {
  if (!resend) return console.warn("RESEND_API_KEY not set. Skipping Invite email.");

  const loginUrl = process.env.NEXTAUTH_URL || "http://localhost:3000/login";

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Welcome to Touchmark Recruit Pulse",
      html: wrapEmailTemplate(`
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #0f172a;">Welcome, ${name}!</h2>
          <p>An administrator has created an account for you on the Touchmark Recruit Pulse portal.</p>
          <p>Your login credentials are:</p>
          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p>Please log in and update your password or 2FA settings if required.</p>
          <div style="margin: 30px 0;">
            <a href="${loginUrl}" style="background: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Log in to Portal</a>
          </div>
          <p>Best,<br>Touchmark Recruit Pulse</p>
        </div>
      `),
    });
  } catch (error) {
    console.error("Failed to send invite email:", error);
  }
}

export async function sendClientCreatedAlert(clientName: string, companyName: string, creatorName: string = "System") {
  if (!resend) return console.warn("RESEND_API_KEY not set. Skipping Client Created email.");
  const to = await getAlertEmail();
  if (!to) return console.warn("No alert email configured in settings. Skipping email.");

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `New Client Onboarded: ${companyName}`,
    html: wrapEmailTemplate(`
      <h2>New Client Alert</h2>
      <p>A new client has been added to Touchmark Recruit Pulse.</p>
      ${buildKeyValueTable([
        { label: "Company Name", value: companyName },
        { label: "Primary Contact", value: clientName },
        { label: "Added By", value: creatorName },
      ])}
      <p style="margin-top: 16px;">Log in to the dashboard to view full details.</p>
    `),
  });
}

export async function sendClientModifiedAlert(companyName: string, modifierName: string = "System") {
  if (!resend) return console.warn("RESEND_API_KEY not set. Skipping Client Modified email.");
  const to = await getAlertEmail();
  if (!to) return console.warn("No alert email configured in settings. Skipping email.");

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Client Profile Updated: ${companyName}`,
    html: wrapEmailTemplate(`
      <h2>Client Update Alert</h2>
      <p>The profile for <strong>${companyName}</strong> was recently updated by ${modifierName}.</p>
      <p>Log in to the dashboard to view the changes.</p>
    `),
  });
}

export async function sendPositionCreatedAlert(position: any, clientName: string, creatorName: string = "System") {
  if (!resend) return console.warn("RESEND_API_KEY not set. Skipping Position Created email.");
  const to = await getAlertEmail();
  if (!to) return console.warn("No alert email configured in settings. Skipping email.");

  const isHighBudget = parseFloat(position.per_resource_cost) > 10000; // Arbitrary threshold
  const isHighPriority = position.priority === "High" || position.priority === "Critical";
  
  let tags = [];
  if (isHighPriority) tags.push(`🔥 ${position.priority} Priority`);
  if (isHighBudget) tags.push("💰 High Budget");

  const { currencyCode, currencyLocale } = await getCurrencySettings();
  const formattedCost = new Intl.NumberFormat(currencyLocale, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(position.per_resource_cost || 0);

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `New Position Opened: ${position.role_name} at ${clientName}`,
    html: wrapEmailTemplate(`
      <h2>New Position Alert ${tags.length > 0 ? '(' + tags.join(', ') + ')' : ''}</h2>
      <p>A new position has been opened for <strong>${clientName}</strong>.</p>
      ${buildKeyValueTable([
        { label: "Role", value: position.role_name },
        { label: "Department", value: position.department },
        { label: "Requested Resources", value: position.requested_count },
        { label: "Per Resource Cost", value: `${formattedCost} (${position.billing_slab})` },
        { label: "Created By", value: creatorName },
      ])}
      <p style="margin-top: 16px;">Please review the priority and fulfillment schedule in the dashboard.</p>
    `),
  });
}

export async function sendResourceClosedAlert(position: any, closedCount: number, closureDetails: string, closerName: string = "System") {
  if (!resend) return console.warn("RESEND_API_KEY not set. Skipping Resource Closed email.");
  const to = await getAlertEmail();
  if (!to) return console.warn("No alert email configured in settings. Skipping email.");

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Resource(s) Closed: ${position.role_name}`,
    html: wrapEmailTemplate(`
      <h2>Fulfillment Update</h2>
      <p><strong>${closerName}</strong> has just logged a closure for the <strong>${position.role_name}</strong> position.</p>
      ${buildKeyValueTable([
        { label: "Resources Closed", value: closedCount },
        { label: "Details", value: closureDetails },
        { label: "Current Progress", value: `${position.closed_count} / ${position.requested_count} Resources` },
        { label: "Status", value: position.status },
      ])}
      ${position.status === "Closed" ? "<h3 style='color: #059669; background: #ecfdf5; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #a7f3d0;'>🎉 This position is now fully closed!</h3>" : ""}
    `),
  });
}

export async function sendDailySummaryAlert(summaryData: { clientName: string; openPositions: number; closedPositions: number; activeResources: number; fulfilledResources: number }[]) {
  if (!resend) return console.warn("RESEND_API_KEY not set. Skipping Daily Summary email.");
  const to = await getAlertEmail();
  if (!to) return console.warn("No alert email configured in settings. Skipping email.");

  let htmlRows = summaryData.map(client => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${client.clientName}</strong></td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${client.openPositions}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${client.closedPositions}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${client.activeResources}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; color: #059669; font-weight: bold;">${client.fulfilledResources}</td>
    </tr>
  `).join('');

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Daily Closure & Fulfillment Summary`,
    html: wrapEmailTemplate(`
      <h2>Daily Fulfillment Summary</h2>
      <p>Here is your daily breakdown of open positions vs. closed positions across all clients.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Client</th>
            <th style="padding: 12px 10px; text-align: center; border-bottom: 2px solid #e2e8f0;">Open Pos.</th>
            <th style="padding: 12px 10px; text-align: center; border-bottom: 2px solid #e2e8f0;">Closed Pos.</th>
            <th style="padding: 12px 10px; text-align: center; border-bottom: 2px solid #e2e8f0;">Active Need</th>
            <th style="padding: 12px 10px; text-align: center; border-bottom: 2px solid #e2e8f0;">Total Fulfilled</th>
          </tr>
        </thead>
        <tbody>
          ${htmlRows}
        </tbody>
      </table>
      <p style="margin-top: 30px; font-size: 12px; color: #64748b;">This is an automated report generated by Touchmark Recruit Pulse.</p>
    `),
  });
}

export async function sendClientDeletedAlert(companyName: string, deleterName: string = "System") {
  if (!resend) return console.warn("RESEND_API_KEY not set. Skipping Client Deleted email.");
  const to = await getAlertEmail();
  if (!to) return console.warn("No alert email configured in settings. Skipping email.");

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `🚨 Client Profile Deleted: ${companyName}`,
    html: wrapEmailTemplate(`
      <h2 style="color: #dc2626;">Client Deletion Alert</h2>
      <p>The profile for <strong>${companyName}</strong> was deleted from the system by ${deleterName}.</p>
      <p>This action has soft-deleted the client. If this was a mistake, a database administrator can restore it.</p>
    `),
  });
}

export async function sendPositionModifiedAlert(
  position: any, 
  existingPosition: any, 
  remarks: string, 
  clientName: string, 
  modifierName: string = "System"
) {
  if (!resend) return console.warn("RESEND_API_KEY not set. Skipping Position Modified email.");
  const to = await getAlertEmail();
  if (!to) return console.warn("No alert email configured in settings. Skipping email.");

  const { currencyCode, currencyLocale } = await getCurrencySettings();
  const formattedCost = new Intl.NumberFormat(currencyLocale, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(position.per_resource_cost || 0);

  let locationsHtml = "";
  const isMultiLocation = Array.isArray(position.locations) && position.locations.length > 0;
  if (isMultiLocation) {
    locationsHtml = `
      <div style="margin-top: 16px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #334155;">Location-Based Requirements</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 8px; border-bottom: 1px solid #cbd5e1; color: #475569;">Location</th>
              <th style="text-align: center; padding: 8px; border-bottom: 1px solid #cbd5e1; color: #475569;">Previous Need</th>
              <th style="text-align: center; padding: 8px; border-bottom: 1px solid #cbd5e1; color: #475569;">New Need</th>
            </tr>
          </thead>
          <tbody>
            ${position.locations.map((loc: any) => {
              const oldLoc = Array.isArray(existingPosition.locations) 
                ? existingPosition.locations.find((l: any) => l.name === loc.name) 
                : null;
              const oldCount = oldLoc ? oldLoc.count : 0;
              const newCount = loc.count;
              const diffHtml = oldCount === newCount 
                ? `<span style="color: #64748b;">${newCount}</span>`
                : `<span style="color: ${newCount > oldCount ? '#059669' : '#dc2626'}; font-weight: bold;">${newCount}</span>`;
              
              return `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;"><strong>${loc.name}</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #64748b;">${oldCount || 'N/A'}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: center;">${diffHtml}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  const remarksHtml = remarks ? `
    <div style="margin-top: 16px; background: #fffbeb; padding: 16px; border-radius: 8px; border: 1px solid #fde68a;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #b45309;">Modification Remarks</h3>
      <p style="margin: 0; color: #78350f; font-size: 13px; font-style: italic;">"${remarks}"</p>
    </div>
  ` : "";

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Position Updated: ${position.role_name} at ${clientName}`,
    html: wrapEmailTemplate(`
      <h2>Position Update Alert</h2>
      <p>The details for the <strong>${position.role_name}</strong> position at <strong>${clientName}</strong> were updated by ${modifierName}.</p>
      ${buildKeyValueTable([
        { label: "Status", value: existingPosition.status !== position.status ? `${existingPosition.status} ➔ ${position.status}` : position.status },
        { label: "Overall Resources", value: existingPosition.requested_count !== position.requested_count ? `${existingPosition.requested_count} ➔ ${position.requested_count}` : position.requested_count },
        { label: "Per Resource Cost", value: `${formattedCost} (${position.billing_slab})` },
        { label: "Priority", value: existingPosition.priority !== position.priority ? `${existingPosition.priority} ➔ ${position.priority}` : position.priority },
      ])}
      ${locationsHtml}
      ${remarksHtml}
      <p style="margin-top: 16px;">Log in to the dashboard to view the full changes.</p>
    `),
  });
}

export async function sendPositionDeletedAlert(roleName: string, clientName: string, deleterName: string = "System") {
  if (!resend) return console.warn("RESEND_API_KEY not set. Skipping Position Deleted email.");
  const to = await getAlertEmail();
  if (!to) return console.warn("No alert email configured in settings. Skipping email.");

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `🚨 Position Deleted: ${roleName} at ${clientName}`,
    html: wrapEmailTemplate(`
      <h2 style="color: #dc2626;">Position Deletion Alert</h2>
      <p>The position for <strong>${roleName}</strong> under <strong>${clientName}</strong> was deleted by ${deleterName}.</p>
      <p>This action has soft-deleted the position. If this was a mistake, a database administrator can restore it.</p>
    `),
  });
}

export async function sendClosureDeletedAlert(roleName: string, clientName: string, closedCount: number, deleterName: string = "System") {
  if (!resend) return console.warn("RESEND_API_KEY not set. Skipping Closure Deleted email.");
  const to = await getAlertEmail();
  if (!to) return console.warn("No alert email configured in settings. Skipping email.");

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `⚠️ Resource Closure Reverted: ${roleName} at ${clientName}`,
    html: wrapEmailTemplate(`
      <h2 style="color: #d97706;">Closure Reverted Alert</h2>
      <p>A past closure of <strong>${closedCount} resource(s)</strong> for the <strong>${roleName}</strong> position was deleted by ${deleterName}.</p>
      <p>The fulfillment progress for this position has been reduced, and its status may have reverted to Open or Partially Closed.</p>
    `),
  });
}
