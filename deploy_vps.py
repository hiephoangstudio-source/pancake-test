#!/usr/bin/env python3
"""Full deployment script for 2H Studio Dashboard to VPS using paramiko SFTP."""
import sys
import os
import time
import paramiko

# VPS config
VPS_IP = "163.223.13.238"
VPS_USER = "root"
VPS_PASSWORD = "*v%-uo2W"
VPS_PORT = 8686
DOMAIN = "pancake.2hstudio.vn"
DB_NAME = "studio2h"
DB_USER = "studio2h"
DB_PASS = "Studio2h@2026!"
APP_DIR = "/var/www/2hstudio-api"
FRONTEND_DIR = "/var/www/2hstudio-frontend"

def get_client():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_IP, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=15)
    return client

def run(client, cmd, show=True):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    exit_code = stdout.channel.recv_exit_status()
    if show:
        if out: print(out)
        if err and exit_code != 0: print(f"[stderr] {err}")
    return out, err, exit_code

def sftp_upload_dir(sftp, local_dir, remote_dir):
    """Recursively upload a directory via SFTP."""
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        sftp.mkdir(remote_dir)
    
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"
        
        if item in ('node_modules', '.git', '__pycache__'):
            continue
            
        if os.path.isdir(local_path):
            sftp_upload_dir(sftp, local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)
            print(f"  📄 {item}")

def setup_database(client):
    """Create PostgreSQL database and user."""
    print("\n" + "="*50)
    print("📦 Setting up PostgreSQL database...")
    print("="*50)
    
    # Check if DB already exists
    out, _, _ = run(client, f"sudo -u postgres psql -tAc \"SELECT 1 FROM pg_database WHERE datname='{DB_NAME}'\"", show=False)
    if out.strip() == '1':
        print(f"Database '{DB_NAME}' already exists. Skipping creation.")
    else:
        # Create user (ignore if exists)
        run(client, f"sudo -u postgres psql -c \"DO \\$\\$ BEGIN CREATE USER {DB_USER} WITH PASSWORD '{DB_PASS}'; EXCEPTION WHEN duplicate_object THEN NULL; END \\$\\$;\"")
        # Create database
        run(client, f"sudo -u postgres psql -c \"CREATE DATABASE {DB_NAME} OWNER {DB_USER};\"")
        print(f"✅ Database '{DB_NAME}' created with user '{DB_USER}'")
    
    # Grant privileges
    run(client, f"sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE {DB_NAME} TO {DB_USER};\"")
    run(client, f"sudo -u postgres psql -d {DB_NAME} -c \"GRANT ALL ON SCHEMA public TO {DB_USER};\"")
    print("✅ Privileges granted")
    
    db_url = f"postgresql://{DB_USER}:{DB_PASS}@localhost:5432/{DB_NAME}"
    return db_url

def deploy_backend(client, db_url):
    """Deploy backend to VPS."""
    print("\n" + "="*50)
    print("🚀 Deploying backend...")
    print("="*50)
    
    # Create app directory
    run(client, f"mkdir -p {APP_DIR}")
    
    # Upload server files via SFTP
    print("Uploading server files...")
    sftp = client.open_sftp()
    
    server_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server')
    
    # Upload individual files
    for fname in ['index.js', 'db.js', 'seed.js', 'schema.sql', 'package.json', 'package-lock.json']:
        src = os.path.join(server_dir, fname)
        if os.path.exists(src):
            sftp.put(src, f"{APP_DIR}/{fname}")
            print(f"  ✅ {fname}")
    
    # Upload directories
    for dname in ['routes', 'middleware', 'services', 'utils']:
        src = os.path.join(server_dir, dname)
        if os.path.isdir(src):
            print(f"  📁 {dname}/")
            sftp_upload_dir(sftp, src, f"{APP_DIR}/{dname}")
    
    sftp.close()
    print("✅ All files uploaded")
    
    # Create .env file on server
    env_content = f"""# 2H Studio Dashboard — Server Environment
DATABASE_URL={db_url}
API_PORT=3001
JWT_SECRET=2hstudio-jwt-secret-{int(time.time())}
NODE_ENV=production
"""
    run(client, f"cat > {APP_DIR}/.env << 'ENVEOF'\n{env_content}ENVEOF")
    print("✅ .env created")
    
    # Install npm dependencies
    print("Installing npm dependencies (this may take a minute)...")
    out, err, code = run(client, f"cd {APP_DIR} && npm install --production 2>&1 | tail -5")
    if code != 0:
        print(f"❌ npm install failed: {err}")
        return False
    print("✅ Dependencies installed")
    
    # Initialize database schema
    print("Initializing database schema...")
    out, err, code = run(client, f'cd {APP_DIR} && node -e "import(\'dotenv/config\').then(() => import(\'./db.js\')).then(m => m.initDB().then(() => {{ console.log(\'Schema OK\'); process.exit(0); }}))" 2>&1')
    print(f"Schema init: {out}")
    if "Schema OK" in out or "initialized" in out:
        print("✅ Database schema initialized")
    else:
        print(f"⚠️ Schema init result: {out[:200]}")
    
    # Start/restart with PM2
    print("Starting backend with PM2...")
    run(client, "pm2 delete 2hstudio-api 2>/dev/null || true", show=False)
    out, err, code = run(client, f"cd {APP_DIR} && pm2 start index.js --name 2hstudio-api")
    run(client, "pm2 save", show=False)
    print("✅ Backend started with PM2")
    
    # Verify backend is running
    time.sleep(3)
    out, _, _ = run(client, "curl -s http://localhost:3001/api/health 2>&1")
    print(f"Health: {out}")
    
    return True

def setup_nginx(client):
    """Configure Nginx reverse proxy with SSL."""
    print("\n" + "="*50)
    print("🌐 Configuring Nginx...")
    print("="*50)
    
    # Create frontend dir
    run(client, f"mkdir -p {FRONTEND_DIR}", show=False)
    
    nginx_config = """server {
    listen 80;
    server_name """ + DOMAIN + """;

    root """ + FRONTEND_DIR + """;
    index index.html;

    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_min_length 1000;

    # Cache static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
"""
    
    # Write nginx config using heredoc
    run(client, f"cat > /etc/nginx/sites-available/{DOMAIN} << 'NGINXEOF'\n{nginx_config}NGINXEOF")
    
    # Enable site
    run(client, f"ln -sf /etc/nginx/sites-available/{DOMAIN} /etc/nginx/sites-enabled/{DOMAIN}")
    run(client, "rm -f /etc/nginx/sites-enabled/default")
    
    # Test and reload
    out, err, code = run(client, "nginx -t 2>&1")
    combined = out + " " + err
    if "successful" in combined.lower() or code == 0:
        run(client, "systemctl reload nginx")
        print("✅ Nginx configured and reloaded")
    else:
        print(f"❌ Nginx config error: {combined}")
        return False
    
    # Setup SSL with certbot
    print("Setting up SSL certificate...")
    out, err, code = run(client, f"certbot --nginx -d {DOMAIN} --non-interactive --agree-tos --email admin@2hstudio.vn --redirect 2>&1")
    combined = out + " " + err
    if code == 0 or "successfully" in combined.lower():
        print("✅ SSL certificate installed")
    else:
        print(f"⚠️ SSL result: {combined[:300]}")
        print("(DNS must point to this IP for SSL to work)")
    
    return True

def deploy_frontend(client):
    """Upload built frontend to VPS."""
    print("\n" + "="*50)
    print("📦 Uploading frontend build...")
    print("="*50)
    
    dist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')
    if not os.path.isdir(dist_dir):
        print("❌ dist/ directory not found. Run 'npm run build' first!")
        return False
    
    run(client, f"mkdir -p {FRONTEND_DIR}")
    
    sftp = client.open_sftp()
    sftp_upload_dir(sftp, dist_dir, FRONTEND_DIR)
    sftp.close()
    
    print("✅ Frontend uploaded")
    run(client, "systemctl reload nginx")
    print("✅ Nginx reloaded")
    return True

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "all"
    
    client = get_client()
    print(f"✅ Connected to VPS {VPS_IP}")
    
    db_url = f"postgresql://{DB_USER}:{DB_PASS}@localhost:5432/{DB_NAME}"
    
    if action in ("all", "db"):
        db_url = setup_database(client)
    
    if action in ("all", "backend"):
        deploy_backend(client, db_url)
    
    if action in ("all", "nginx"):
        setup_nginx(client)
    
    if action in ("all", "frontend"):
        deploy_frontend(client)
    
    client.close()
    print("\n🎉 Done!")
