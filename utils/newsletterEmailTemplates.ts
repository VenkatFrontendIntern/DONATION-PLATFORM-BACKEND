/**
 * Welcome email template for newsletter subscription
 */
export const generateWelcomeEmailTemplate = (): string => {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          <!-- Welcome Icon -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
            <tr>
              <td align="center" style="width: 80px; height: 80px; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 50%;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" height="100%">
                  <tr>
                    <td align="center" valign="middle" style="padding: 0;">
                      <span style="font-size: 40px; line-height: 1;">📧</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 28px; font-weight: 700; line-height: 1.3; text-align: center;">
            Welcome to Engala Trust Newsletter!
          </h2>
          <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
            Thank you for subscribing! We're excited to keep you updated on our latest campaigns, impact stories, and ways to make a difference.
          </p>
        </td>
      </tr>

      <!-- What to Expect -->
      <tr>
        <td style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-top: 24px;">
          <p style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 600;">
            What to Expect:
          </p>
          <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
            <li style="margin-bottom: 8px;">Updates on new campaigns and their progress</li>
            <li style="margin-bottom: 8px;">Impact stories from our community</li>
            <li style="margin-bottom: 8px;">Tips on how you can help create change</li>
            <li style="margin-bottom: 8px;">Exclusive updates and opportunities</li>
          </ul>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td style="padding-top: 32px; text-align: center;">
          <p style="margin: 0; color: #059669; font-size: 16px; font-weight: 600; line-height: 1.6;">
            Together, we can make a real difference! 🌱
          </p>
          <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
            With gratitude,<br>The Engala Trust Team
          </p>
        </td>
      </tr>
    </table>
  `;
};

/**
 * Convert rich text editor HTML to email-safe HTML with inline styles
 */
const convertToEmailSafeHTML = (html: string): string => {
  return html
    .replace(/<h1[^>]*>/gi, '<p style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 700; line-height: 1.3;">')
    .replace(/<\/h1>/gi, '</p>')
    .replace(/<h2[^>]*>/gi, '<p style="margin: 0 0 14px 0; color: #111827; font-size: 20px; font-weight: 600; line-height: 1.3;">')
    .replace(/<\/h2>/gi, '</p>')
    .replace(/<h3[^>]*>/gi, '<p style="margin: 0 0 12px 0; color: #111827; font-size: 18px; font-weight: 600; line-height: 1.3;">')
    .replace(/<\/h3>/gi, '</p>')
    .replace(/<p(?![^>]*style)/gi, '<p style="margin: 0 0 16px 0; color: #4b5563; font-size: 16px; line-height: 1.6;"')
    .replace(/<ul(?![^>]*style)/gi, '<ul style="margin: 16px 0; padding-left: 24px; color: #4b5563; font-size: 16px; line-height: 1.6;"')
    .replace(/<ol(?![^>]*style)/gi, '<ol style="margin: 16px 0; padding-left: 24px; color: #4b5563; font-size: 16px; line-height: 1.6;"')
    .replace(/<li(?![^>]*style)/gi, '<li style="margin: 8px 0; line-height: 1.6;"')
    .replace(/<a(?![^>]*style)/gi, '<a style="color: #059669; text-decoration: underline;"')
    .replace(/<strong(?![^>]*style)/gi, '<strong style="font-weight: 600; color: #111827;"')
    .replace(/<em(?![^>]*style)/gi, '<em style="font-style: italic;"')
    .replace(/<u(?![^>]*style)/gi, '<u style="text-decoration: underline;"');
};

/**
 * Generate campaign section HTML for newsletter
 */
const generateCampaignSection = (campaignData: any): string => {
  if (!campaignData) return '';

  const progressPercentage = Math.round((campaignData.raisedAmount / campaignData.goalAmount) * 100);
  return `
    <!-- Campaign Highlight -->
    <tr>
      <td style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-top: 24px; border-left: 4px solid #059669;">
        <p style="margin: 0 0 12px 0; color: #111827; font-size: 18px; font-weight: 600;">
          ${campaignData.title}
        </p>
        <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
          ${campaignData.description?.substring(0, 200)}${campaignData.description?.length > 200 ? '...' : ''}
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td>
              <p style="margin: 0; color: #065f46; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                Progress
              </p>
              <p style="margin: 4px 0 0 0; color: #111827; font-size: 20px; font-weight: 700;">
                ₹${campaignData.raisedAmount?.toLocaleString('en-IN')} / ₹${campaignData.goalAmount?.toLocaleString('en-IN')} (${progressPercentage}%)
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
};

/**
 * Create newsletter email content with campaign details
 */
export const createNewsletterEmailContent = (customContent: string, campaignData: any = null): string => {
  const emailContent = convertToEmailSafeHTML(customContent);
  const campaignSection = generateCampaignSection(campaignData);

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="padding-bottom: 24px;">
          ${emailContent}
        </td>
      </tr>
      ${campaignSection}
      <!-- Footer CTA -->
      <tr>
        <td style="padding-top: 32px; text-align: center;">
          <p style="margin: 0; color: #059669; font-size: 16px; font-weight: 600; line-height: 1.6;">
            Thank you for being part of our community! 🙏
          </p>
          <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
            With gratitude,<br>The Engala Trust Team
          </p>
        </td>
      </tr>
    </table>
  `;
};

