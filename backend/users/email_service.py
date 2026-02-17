"""
Email service for sending verification and transactional emails.
Uses SMTP settings stored in SiteSettings model.
"""

import logging
import secrets
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from django.utils import timezone

logger = logging.getLogger(__name__)


def generate_verification_token():
    """Generate a secure random token for email verification."""
    return secrets.token_urlsafe(48)


def _get_smtp_connection(settings):
    """Create an SMTP connection from SiteSettings."""
    if settings.smtp_use_ssl:
        server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=10)
    else:
        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10)
        if settings.smtp_use_tls:
            server.starttls()

    if settings.smtp_username and settings.smtp_password:
        server.login(settings.smtp_username, settings.smtp_password)

    return server


def _build_email(from_email, from_name, to_email, subject, html_body, text_body):
    """Build a MIME email message."""
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'{from_name} <{from_email}>' if from_name else from_email
    msg['To'] = to_email
    msg.attach(MIMEText(text_body, 'plain'))
    msg.attach(MIMEText(html_body, 'html'))
    return msg


def send_email(to_email, subject, html_body, text_body):
    """
    Send an email using SMTP settings from SiteSettings.
    Returns (success: bool, error_message: str | None).
    """
    from .models import SiteSettings

    settings = SiteSettings.load()

    if not settings.email_verification_enabled:
        return False, 'Email sending is disabled'

    if not settings.smtp_host or not settings.smtp_from_email:
        return False, 'SMTP settings are not configured'

    try:
        msg = _build_email(
            from_email=settings.smtp_from_email,
            from_name=settings.smtp_from_name,
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
        )

        server = _get_smtp_connection(settings)
        server.sendmail(settings.smtp_from_email, to_email, msg.as_string())
        server.quit()

        return True, None

    except Exception as e:
        logger.error(f'Failed to send email to {to_email}: {e}')
        return False, str(e)


def send_test_email(to_email):
    """
    Send a test email to verify SMTP settings work.
    Bypasses the email_verification_enabled check.
    Returns (success: bool, error_message: str | None).
    """
    from .models import SiteSettings

    settings = SiteSettings.load()

    if not settings.smtp_host or not settings.smtp_from_email:
        return False, 'SMTP settings are not configured. Please set SMTP host and from email.'

    subject = 'Open Papertrade - Test Email'
    html_body = '''
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #FF5C00; margin: 0 0 16px 0;">SMTP Configuration Working</h2>
        <p style="color: #333; font-size: 15px; line-height: 1.6;">
            This is a test email from <strong>Open Papertrade</strong>.
            If you received this, your SMTP settings are configured correctly.
        </p>
    </div>
    '''
    text_body = 'SMTP Configuration Working\n\nThis is a test email from Open Papertrade. If you received this, your SMTP settings are configured correctly.'

    try:
        msg = _build_email(
            from_email=settings.smtp_from_email,
            from_name=settings.smtp_from_name,
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
        )

        server = _get_smtp_connection(settings)
        server.sendmail(settings.smtp_from_email, to_email, msg.as_string())
        server.quit()

        return True, None

    except Exception as e:
        logger.error(f'Failed to send test email to {to_email}: {e}')
        return False, str(e)


def send_verification_email(user):
    """
    Generate a verification token and send verification email to user.
    Returns (success: bool, error_message: str | None).
    """
    from .models import SiteSettings
    from .email_templates import verification_email_html, verification_email_text

    settings = SiteSettings.load()
    token = generate_verification_token()

    user.email_verification_token = token
    user.email_verification_sent_at = timezone.now()
    user.save(update_fields=['email_verification_token', 'email_verification_sent_at'])

    verify_url = f'{settings.frontend_url}/verify-email?token={token}'

    subject = 'Verify your email - Open Papertrade'
    html_body = verification_email_html(user.name, verify_url)
    text_body = verification_email_text(user.name, verify_url)

    return send_email(user.email, subject, html_body, text_body)


def send_password_reset_email(user, reset_url):
    """
    Send a password reset email to user.
    Returns (success: bool, error_message: str | None).
    """
    from .email_templates import password_reset_email_html, password_reset_email_text

    subject = 'Reset your password - Open Papertrade'
    html_body = password_reset_email_html(user.name, reset_url)
    text_body = password_reset_email_text(user.name, reset_url)

    return send_email(user.email, subject, html_body, text_body)
