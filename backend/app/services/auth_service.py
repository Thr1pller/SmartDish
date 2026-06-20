import pyotp, qrcode, io, base64

def generate_2fa_secret():
    return pyotp.random_base32()

def generate_qr_code(email, secret):
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(name=email, issuer_name="KulinarAI")
    
    qr = qrcode.make(totp_uri)
    buffered = io.BytesIO()
    qr.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode()