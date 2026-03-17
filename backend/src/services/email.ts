import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

export const sendOrderReceivedEmail = async (
  to: string,
  customerName: string,
  productName: string,
  emails: string[]
): Promise<void> => {
  try {
    await resend.emails.send({
      from: `ديجيتال بلس <${FROM}>`,
      to,
      subject: `✅ تم استلام طلبك — ${productName}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; background: #f9f9f9; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #702dff, #9044ff); padding: 1.5rem; border-radius: 8px; text-align: center; margin-bottom: 1.5rem;">
            <h1 style="color: #fff; margin: 0; font-size: 1.4rem;">ديجيتال بلس</h1>
          </div>
          <h2 style="color: #090040;">مرحباً ${customerName}،</h2>
          <p style="color: #374151; line-height: 1.8;">تم استلام طلبك بنجاح. فريقنا يعمل الآن على تفعيل:</p>
          <div style="background: #fff; border: 1px solid rgba(112,45,255,0.2); border-radius: 10px; padding: 1rem 1.5rem; margin: 1rem 0;">
            <strong style="color: #702dff; font-size: 1.1rem;">🛒 ${productName}</strong>
            <p style="margin: 0.5rem 0 0; color: #6b7280; font-size: 0.9rem;">الإيميلات المراد تفعيلها: <strong>${emails.join(", ")}</strong></p>
          </div>
          <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 1rem 1.5rem; margin: 1rem 0;">
            <p style="margin: 0; color: #92400e;">⏳ طلبك قيد المعالجة. ستصلك رسالة أخرى فور الانتهاء مع تفاصيل التفعيل.</p>
          </div>
          <p style="color: #9ca3af; font-size: 0.85rem; margin-top: 2rem; text-align: center;">فريق ديجيتال بلس</p>
        </div>
      `,
    });
    console.log(`📧 Confirmation email sent to ${to}`);
  } catch (err) {
    console.error("Failed to send confirmation email:", err);
  }
};

export const sendOrderCompletedEmail = async (
  to: string,
  customerName: string,
  productName: string,
  resultDetails: string
): Promise<void> => {
  try {
    await resend.emails.send({
      from: `ديجيتال بلس <${FROM}>`,
      to,
      subject: `🎉 تم تفعيل طلبك — ${productName}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; background: #f9f9f9; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #702dff, #9044ff); padding: 1.5rem; border-radius: 8px; text-align: center; margin-bottom: 1.5rem;">
            <h1 style="color: #fff; margin: 0; font-size: 1.4rem;">ديجيتال بلس</h1>
          </div>
          <h2 style="color: #090040;">مرحباً ${customerName}،</h2>
          <p style="color: #374151; line-height: 1.8;">🎉 تم تفعيل طلبك بنجاح! إليك تفاصيل التفعيل:</p>
          <div style="background: #fff; border: 2px solid #702dff; border-radius: 10px; padding: 1.25rem 1.5rem; margin: 1rem 0;">
            <strong style="color: #702dff; font-size: 1rem;">📦 ${productName}</strong>
            <div style="margin-top: 0.85rem; padding: 0.85rem; background: #f5f4ff; border-radius: 8px; white-space: pre-line; color: #090040; font-size: 0.95rem; line-height: 1.8;">
              ${resultDetails}
            </div>
          </div>
          <p style="color: #6b7280; font-size: 0.9rem;">يمكنك أيضاً الاطلاع على التفاصيل في صفحة طلباتك على الموقع.</p>
          <p style="color: #9ca3af; font-size: 0.85rem; margin-top: 2rem; text-align: center;">فريق ديجيتال بلس</p>
        </div>
      `,
    });
    console.log(`📧 Completion email sent to ${to}`);
  } catch (err) {
    console.error("Failed to send completion email:", err);
  }
};

export const sendOrderRejectedEmail = async (
  to: string,
  customerName: string,
  productName: string,
  reason: string,
  creditsRefunded: number
): Promise<void> => {
  try {
    await resend.emails.send({
      from: `ديجيتال بلس <${FROM}>`,
      to,
      subject: `❌ تم رفض طلبك — ${productName}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; background: #f9f9f9; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #702dff, #9044ff); padding: 1.5rem; border-radius: 8px; text-align: center; margin-bottom: 1.5rem;">
            <h1 style="color: #fff; margin: 0; font-size: 1.4rem;">ديجيتال بلس</h1>
          </div>
          <h2 style="color: #090040;">مرحباً ${customerName}،</h2>
          <p style="color: #374151; line-height: 1.8;">نأسف لإبلاغك بأنه تم رفض طلبك للمنتج:</p>
          <div style="background: #fff; border: 1px solid #fecaca; border-radius: 10px; padding: 1rem 1.5rem; margin: 1rem 0;">
            <strong style="color: #dc2626; font-size: 1rem;">❌ ${productName}</strong>
            <p style="margin: 0.5rem 0 0; color: #6b7280; font-size: 0.9rem;">سبب الرفض: <strong>${reason}</strong></p>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 1rem 1.5rem; margin: 1rem 0;">
            <p style="margin: 0; color: #16a34a;">✅ تم إرجاع <strong>${creditsRefunded} رصيد</strong> إلى حسابك تلقائياً.</p>
          </div>
          <p style="color: #6b7280; font-size: 0.9rem;">يمكنك التواصل معنا إذا كان لديك أي استفسار.</p>
          <p style="color: #9ca3af; font-size: 0.85rem; margin-top: 2rem; text-align: center;">فريق ديجيتال بلس</p>
        </div>
      `,
    });
    console.log(`📧 Rejection email sent to ${to}`);
  } catch (err) {
    console.error("Failed to send rejection email:", err);
  }
};