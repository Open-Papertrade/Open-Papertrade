"""
HTML email templates matching the Pencil design system.

Design tokens (from paper_trading.pen):
- Background: #0A0A0B
- Header bg: #111113, border: #1F1F23
- Card bg: #1A1A1D
- Font: 'DM Mono', monospace
- Accent: #FF5C00
- Text primary: #FFFFFF
- Text secondary: #8E8E93
- Text muted: #6B6B70
- Text dim: #4A4A50
- Divider: #1F1F23
- Border: #2A2A2E
"""


def _base_layout(content: str) -> str:
    """Wrap content in the shared email layout (background + centered 600px container)."""
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Open Papertrade</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0B;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0B;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#0A0A0B;">
{content}
</table>
</td></tr>
</table>
</body>
</html>'''


def _header() -> str:
    """Email header with logo."""
    return '''<tr><td style="background-color:#111113;padding:48px 40px;border-bottom:1px solid #1F1F23;text-align:center;">
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
<tr>
<td style="vertical-align:middle;"><div style="width:8px;height:8px;background-color:#FF5C00;border-radius:50%;"></div></td>
<td style="padding-left:10px;font-family:'DM Mono',monospace;font-size:16px;letter-spacing:3px;color:#FFFFFF;">OPEN</td>
<td style="padding-left:10px;font-family:'DM Mono',monospace;font-size:16px;font-weight:700;letter-spacing:3px;color:#FF5C00;">PAPERTRADE</td>
</tr>
</table>
</td></tr>'''


def _divider() -> str:
    """Horizontal divider row."""
    return '<tr><td style="height:1px;background-color:#1F1F23;font-size:0;line-height:0;">&nbsp;</td></tr>'


def _footer() -> str:
    """Email footer with social icons, links, and copyright."""
    return '''<tr><td style="padding:32px 40px;text-align:center;">
<p style="margin:0 0 20px 0;font-family:'DM Mono',monospace;font-size:11px;color:#4A4A50;">
Didn&#8217;t request this email? You can safely ignore it.
</p>
<p style="margin:0 0 20px 0;font-family:'DM Mono',monospace;font-size:11px;color:#6B6B70;">
Help Center &nbsp;&bull;&nbsp; Privacy Policy &nbsp;&bull;&nbsp; Terms of Service
</p>
<p style="margin:0;font-family:'DM Mono',monospace;font-size:10px;color:#3A3A40;">
&copy; 2026 Open Papertrade. All rights reserved.
</p>
</td></tr>'''


def _cta_button(text: str, url: str) -> str:
    """Orange call-to-action button."""
    return f'''<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
<tr><td style="background-color:#FF5C00;border-radius:8px;text-align:center;">
<a href="{url}" target="_blank" style="display:inline-block;padding:16px 32px;font-family:'DM Mono',monospace;font-size:14px;font-weight:700;letter-spacing:2px;color:#0A0A0B;text-decoration:none;">{text}</a>
</td></tr>
</table>'''


def _alt_link(url: str) -> str:
    """Alternative link box below the CTA."""
    return f'''<p style="margin:0 0 12px 0;font-family:'DM Mono',monospace;font-size:12px;color:#6B6B70;text-align:center;">
Or copy and paste this link into your browser:
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="background-color:#111113;border:1px solid #2A2A2E;border-radius:6px;padding:14px 16px;">
<a href="{url}" style="font-family:'DM Mono',monospace;font-size:11px;color:#FF5C00;text-decoration:none;word-break:break-all;">{url}</a>
</td></tr>
</table>'''


def _expire_note(text: str) -> str:
    """Expiry notice pill."""
    return f'''<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
<tr><td style="background-color:#1A1A1D;border-radius:6px;padding:12px 16px;">
<span style="font-family:'DM Mono',monospace;font-size:12px;color:#6B6B70;">&#9201; {text}</span>
</td></tr>
</table>'''


# ---------------------------------------------------------------------------
# Verification Email
# ---------------------------------------------------------------------------

def verification_email_html(user_name: str, verify_url: str) -> str:
    """Build the Verify Account email HTML matching the Pencil design."""
    content_section = f'''<tr><td style="padding:48px 40px;text-align:center;">
<!-- Icon -->
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 32px auto;">
<tr><td style="width:80px;height:80px;background-color:#1A1A1D;border-radius:40px;text-align:center;vertical-align:middle;font-size:36px;">
&#9993;
</td></tr>
</table>

<!-- Headline -->
<h1 style="margin:0 0 16px 0;font-family:'DM Mono',monospace;font-size:28px;font-weight:700;letter-spacing:1px;color:#FFFFFF;">
Verify Your Email
</h1>

<!-- Subtext -->
<p style="margin:0 0 32px 0;font-family:'DM Mono',monospace;font-size:14px;line-height:1.6;color:#8E8E93;max-width:440px;display:inline-block;">
Thanks for signing up for Open Papertrade! Please verify your email address to activate your account and start paper trading.
</p>

<!-- CTA Button -->
{_cta_button('VERIFY EMAIL ADDRESS', verify_url)}

<!-- Alt link -->
<div style="margin-top:32px;">
{_alt_link(verify_url)}
</div>

<!-- Expire note -->
<div style="margin-top:24px;">
{_expire_note('This link expires in 24 hours')}
</div>
</td></tr>'''

    features_section = '''<tr><td style="background-color:#111113;padding:32px 40px;">
<p style="margin:0 0 24px 0;font-family:'DM Mono',monospace;font-size:14px;font-weight:600;letter-spacing:1px;color:#FFFFFF;">
What you can do with Open Papertrade:
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:0 0 16px 0;">
<span style="color:#FF5C00;font-size:18px;vertical-align:middle;">&#8599;</span>
<span style="padding-left:12px;font-family:'DM Mono',monospace;font-size:13px;color:#8E8E93;">Practice trading with $100,000 virtual cash</span>
</td></tr>
<tr><td style="padding:0 0 16px 0;">
<span style="color:#FF5C00;font-size:18px;vertical-align:middle;">&#9636;</span>
<span style="padding-left:12px;font-family:'DM Mono',monospace;font-size:13px;color:#8E8E93;">Track real-time market data and performance</span>
</td></tr>
<tr><td style="padding:0 0 16px 0;">
<span style="color:#FF5C00;font-size:18px;vertical-align:middle;">&#9745;</span>
<span style="padding-left:12px;font-family:'DM Mono',monospace;font-size:13px;color:#8E8E93;">Learn strategies risk-free before real investing</span>
</td></tr>
<tr><td style="padding:0;">
<span style="color:#FF5C00;font-size:18px;vertical-align:middle;">&#128065;</span>
<span style="padding-left:12px;font-family:'DM Mono',monospace;font-size:13px;color:#8E8E93;">Build and monitor your watchlist</span>
</td></tr>
</table>
</td></tr>'''

    return _base_layout(
        _header()
        + content_section
        + _divider()
        + features_section
        + _divider()
        + _footer()
    )


def verification_email_text(user_name: str, verify_url: str) -> str:
    return f'''OPEN PAPERTRADE

Verify Your Email

Thanks for signing up for Open Papertrade! Please verify your email address to activate your account and start paper trading.

Verify here: {verify_url}

This link expires in 24 hours.

---

What you can do with Open Papertrade:
- Practice trading with $100,000 virtual cash
- Track real-time market data and performance
- Learn strategies risk-free before real investing
- Build and monitor your watchlist

---

Didn't request this email? You can safely ignore it.
© 2026 Open Papertrade. All rights reserved.
'''


# ---------------------------------------------------------------------------
# Password Reset Email
# ---------------------------------------------------------------------------

def password_reset_email_html(user_name: str, reset_url: str) -> str:
    """Build the Password Reset email HTML matching the Pencil design."""
    content_section = f'''<tr><td style="padding:48px 40px;text-align:center;">
<!-- Icon -->
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 32px auto;">
<tr><td style="width:80px;height:80px;background-color:#1A1A1D;border-radius:40px;text-align:center;vertical-align:middle;font-size:36px;">
&#128273;
</td></tr>
</table>

<!-- Headline -->
<h1 style="margin:0 0 16px 0;font-family:'DM Mono',monospace;font-size:28px;font-weight:700;letter-spacing:1px;color:#FFFFFF;">
Reset Your Password
</h1>

<!-- Subtext -->
<p style="margin:0 0 32px 0;font-family:'DM Mono',monospace;font-size:14px;line-height:1.6;color:#8E8E93;max-width:440px;display:inline-block;">
We received a request to reset the password for your Open Papertrade account. Click the button below to create a new password.
</p>

<!-- CTA Button -->
{_cta_button('RESET PASSWORD', reset_url)}

<!-- Alt link -->
<div style="margin-top:32px;">
{_alt_link(reset_url)}
</div>

<!-- Expire note -->
<div style="margin-top:24px;">
{_expire_note('This link expires in 1 hour')}
</div>
</td></tr>'''

    security_section = '''<tr><td style="background-color:#111113;padding:32px 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
<tr>
<td style="color:#FF5C00;font-size:18px;vertical-align:middle;">&#128737;</td>
<td style="padding-left:10px;font-family:'DM Mono',monospace;font-size:14px;font-weight:600;letter-spacing:1px;color:#FFFFFF;">Security Notice</td>
</tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:0 0 12px 0;">
<span style="color:#FF5C00;font-family:'DM Mono',monospace;font-size:13px;">&bull;</span>
<span style="padding-left:12px;font-family:'DM Mono',monospace;font-size:13px;line-height:1.5;color:#8E8E93;">If you didn&#8217;t request this reset, ignore this email</span>
</td></tr>
<tr><td style="padding:0 0 12px 0;">
<span style="color:#FF5C00;font-family:'DM Mono',monospace;font-size:13px;">&bull;</span>
<span style="padding-left:12px;font-family:'DM Mono',monospace;font-size:13px;line-height:1.5;color:#8E8E93;">Never share your password or this link with anyone</span>
</td></tr>
<tr><td style="padding:0;">
<span style="color:#FF5C00;font-family:'DM Mono',monospace;font-size:13px;">&bull;</span>
<span style="padding-left:12px;font-family:'DM Mono',monospace;font-size:13px;line-height:1.5;color:#8E8E93;">Use a strong, unique password with letters, numbers, and symbols</span>
</td></tr>
</table>
</td></tr>'''

    footer = '''<tr><td style="padding:32px 40px;text-align:center;">
<p style="margin:0 0 20px 0;font-family:'DM Mono',monospace;font-size:11px;color:#4A4A50;">
Need help? Contact our support team anytime.
</p>
<p style="margin:0 0 20px 0;font-family:'DM Mono',monospace;font-size:11px;color:#6B6B70;">
Help Center &nbsp;&bull;&nbsp; Privacy Policy &nbsp;&bull;&nbsp; Terms of Service
</p>
<p style="margin:0;font-family:'DM Mono',monospace;font-size:10px;color:#3A3A40;">
&copy; 2026 Open Papertrade. All rights reserved.
</p>
</td></tr>'''

    return _base_layout(
        _header()
        + content_section
        + _divider()
        + security_section
        + _divider()
        + footer
    )


def password_reset_email_text(user_name: str, reset_url: str) -> str:
    return f'''OPEN PAPERTRADE

Reset Your Password

We received a request to reset the password for your Open Papertrade account. Click the link below to create a new password.

Reset here: {reset_url}

This link expires in 1 hour.

---

Security Notice:
- If you didn't request this reset, ignore this email
- Never share your password or this link with anyone
- Use a strong, unique password with letters, numbers, and symbols

---

Need help? Contact our support team anytime.
© 2026 Open Papertrade. All rights reserved.
'''
