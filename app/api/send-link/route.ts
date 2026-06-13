import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { email, url } = await req.json();

  if (!email || !url) {
    return NextResponse.json({ error: "Missing email or url" }, { status: 400 });
  }

  const { error } = await resend.emails.send({
    from: "ExcelMastery <noreply@exceltutor.live>",
    to: email,
    subject: "Your Excel scenario is waiting 📊",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:#2563eb;border-radius:12px;padding:12px 16px;">
            <span style="color:white;font-size:20px;font-weight:bold;">⊞ ExcelMastery</span>
          </div>
        </div>
        <h2 style="color:#0f172a;font-size:20px;margin-bottom:8px;">Your scenario is ready on desktop</h2>
        <p style="color:#475569;font-size:15px;line-height:1.6;margin-bottom:24px;">
          You were checking out an Excel scenario on your phone. Open the link below on your laptop or desktop to dive in — it only takes a minute to get started.
        </p>
        <a href="${url}" style="display:block;background:#2563eb;color:white;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;margin-bottom:24px;">
          Open scenario on desktop →
        </a>
        <p style="color:#94a3b8;font-size:12px;text-align:center;">
          ExcelMastery · Learn Excel. Work Smarter.
        </p>
      </div>
    `,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
