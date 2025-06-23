// File: src/backend/templates/professionalTemplate.js

// A professional, responsive HTML email template for various notifications.
export const professionalTemplate = ({ preheader, title, bodyHtml, cta }) => {
    const primaryColor = '#4A5568';
    const secondaryColor = '#48BB78';
    const backgroundColor = '#f7fafc';
    const textColor = '#2D3748';
    const lightTextColor = '#718096';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { margin: 0; padding: 0; background-color: ${backgroundColor}; font-family: 'Inter', sans-serif; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; }
            .content { color: ${textColor}; font-size: 16px; line-height: 1.6; }
            .button { background-color: ${secondaryColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; }
        </style>
    </head>
    <body>
        <span style="display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
            ${preheader}
        </span>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${backgroundColor};">
            <tr>
                <td align="center">
                    <div class="container">
                        <h1 style="font-size: 28px; font-weight: 700; color: ${primaryColor}; margin-top: 0;">${title}</h1>
                        
                        <div class="content">
                            ${bodyHtml}
                        </div>

                        ${cta && cta.url && cta.text ? `
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${cta.url}" target="_blank" class="button">${cta.text}</a>
                        </div>
                        ` : ''}

                        <div style="margin-top: 30px; text-align: center; color: ${lightTextColor}; font-size: 12px;">
                            <p>This is an automated message from Chaseless.</p>
                            <p>&copy; ${new Date().getFullYear()} Chaseless Inc. All rights reserved.</p>
                        </div>
                    </div>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};