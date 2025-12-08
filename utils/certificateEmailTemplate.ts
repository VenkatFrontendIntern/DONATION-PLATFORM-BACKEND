/**
 * Email template for 80G certificate
 */
export const generateCertificateEmailTemplate = (certificateNumber: string, amount: number): string => {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          <!-- Celebration Icon/Emoji -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
            <tr>
              <td align="center" style="width: 80px; height: 80px; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 50%;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" height="100%">
                  <tr>
                    <td align="center" valign="middle" style="padding: 0;">
                      <span style="font-size: 40px; line-height: 1;">🎉</span>
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
            Thank You for Your Generosity!
          </h2>
          <p style="margin: 0 0 32px 0; color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
            Your donation is making a real difference. We've attached your 80G tax exemption certificate for your records.
          </p>
        </td>
      </tr>

      <!-- Certificate Details Box -->
      <tr>
        <td>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; border: 2px solid #a7f3d0; overflow: hidden;">
            <tr>
              <td style="padding: 24px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding-bottom: 16px;">
                      <p style="margin: 0; color: #065f46; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        Certificate Number
                      </p>
                      <p style="margin: 8px 0 0 0; color: #111827; font-size: 20px; font-weight: 700; font-family: 'Courier New', monospace;">
                        ${certificateNumber}
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top: 1px solid #a7f3d0; padding-top: 16px;">
                      <p style="margin: 0; color: #065f46; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        Donation Amount
                      </p>
                      <p style="margin: 8px 0 0 0; color: #111827; font-size: 24px; font-weight: 700;">
                        ₹${amount.toLocaleString('en-IN')}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CTA Section -->
      <tr>
        <td style="padding-top: 32px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td align="center" style="padding-bottom: 16px;">
                <p style="margin: 0; color: #4b5563; font-size: 15px; font-weight: 500; line-height: 1.6;">
                  📎 Your 80G certificate is attached to this email
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom: 24px;">
                <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                  Please save this certificate for your tax filing purposes. You can claim a deduction under Section 80G of the Income Tax Act.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Additional Info -->
      <tr>
        <td style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
          <p style="margin: 0 0 12px 0; color: #111827; font-size: 16px; font-weight: 600;">
            What's Next?
          </p>
          <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
            <li style="margin-bottom: 8px;">Download and save the attached PDF certificate</li>
            <li style="margin-bottom: 8px;">Use this certificate when filing your income tax return</li>
            <li style="margin-bottom: 8px;">Keep this email for your records</li>
          </ul>
        </td>
      </tr>

      <!-- Thank You Message -->
      <tr>
        <td style="padding-top: 32px; text-align: center;">
          <p style="margin: 0; color: #059669; font-size: 16px; font-weight: 600; line-height: 1.6;">
            Your support helps us create lasting change. 🙏
          </p>
          <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
            With gratitude,<br>The Engala Trust Team
          </p>
        </td>
      </tr>
    </table>
  `;
};

