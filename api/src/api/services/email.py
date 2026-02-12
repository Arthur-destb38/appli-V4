"""Email service for sending verification and reset emails."""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import secrets


def generate_verification_token() -> str:
    """Generate a secure verification token."""
    return secrets.token_urlsafe(32)


def is_email_enabled() -> bool:
    """Check if email service is configured."""
    try:
        return all([
            os.getenv("SMTP_HOST"),
            os.getenv("SMTP_USER"),
            os.getenv("SMTP_PASSWORD"),
        ])
    except:
        return False


def send_email(to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> bool:
    """Send an email using SMTP configuration."""
    if not is_email_enabled():
        print(f"📧 Email disabled - Would send to {to_email}: {subject}")
        return True  # Simulate success when email is not configured
    
    try:
        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        from_email = os.getenv("FROM_EMAIL", smtp_user)
        
        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_email
        msg["To"] = to_email
        
        # Add text and HTML parts
        if text_content:
            text_part = MIMEText(text_content, "plain")
            msg.attach(text_part)
        
        html_part = MIMEText(html_content, "html")
        msg.attach(html_part)
        
        # Send email
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        print(f"✅ Email sent to {to_email}: {subject}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {e}")
        return True  # Return True anyway to not block registration


def send_verification_email(email: str, username: str, token: str) -> bool:
    """Send email verification email."""
    base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    verify_url = f"{base_url}/verify-email?token={token}"
    
    subject = "Vérifiez votre email - Gorillax"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Vérification email</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333;">🦍 Gorillax</h1>
        </div>
        
        <h2 style="color: #333;">Bienvenue {username} !</h2>
        
        <p>Merci de vous être inscrit sur Gorillax. Pour activer votre compte, veuillez vérifier votre adresse email en cliquant sur le lien ci-dessous :</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{verify_url}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Vérifier mon email
            </a>
        </div>
        
        <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
        <p style="word-break: break-all; color: #666;">{verify_url}</p>
        
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
            Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte Gorillax, ignorez cet email.
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px; text-align: center;">
            Gorillax - L'app de fitness sociale
        </p>
    </body>
    </html>
    """
    
    text_content = f"""
    Bienvenue {username} !
    
    Merci de vous être inscrit sur Gorillax. Pour activer votre compte, veuillez vérifier votre adresse email en visitant ce lien :
    
    {verify_url}
    
    Ce lien expire dans 24 heures.
    
    Si vous n'avez pas créé de compte Gorillax, ignorez cet email.
    
    Gorillax - L'app de fitness sociale
    """
    
    return send_email(email, subject, html_content, text_content)


def send_password_reset_email(email: str, username: str, token: str) -> bool:
    """Send password reset email."""
    base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    reset_url = f"{base_url}/reset-password?token={token}"
    
    subject = "Réinitialisation de mot de passe - Gorillax"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Réinitialisation mot de passe</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333;">🦍 Gorillax</h1>
        </div>
        
        <h2 style="color: #333;">Réinitialisation de mot de passe</h2>
        
        <p>Bonjour {username},</p>
        
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" 
               style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Réinitialiser mon mot de passe
            </a>
        </div>
        
        <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
        <p style="word-break: break-all; color: #666;">{reset_url}</p>
        
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
            Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px; text-align: center;">
            Gorillax - L'app de fitness sociale
        </p>
    </body>
    </html>
    """
    
    text_content = f"""
    Réinitialisation de mot de passe
    
    Bonjour {username},
    
    Vous avez demandé la réinitialisation de votre mot de passe. Visitez ce lien pour créer un nouveau mot de passe :
    
    {reset_url}
    
    Ce lien expire dans 1 heure.
    
    Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
    
    Gorillax - L'app de fitness sociale
    """
    
    return send_email(email, subject, html_content, text_content)