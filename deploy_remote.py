import paramiko
import os
import sys

VPS_IP = "163.223.13.238"
VPS_USER = "root"
VPS_PASSWORD = "*v%-uo2W"
VPS_PORT = 8686

def run(client, cmd):
    print(f">> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    exit_code = stdout.channel.recv_exit_status()
    if out: print(out.encode('cp1252', 'replace').decode('cp1252', 'replace'))
    if exit_code != 0: print(f"ERROR: {err}")
    return exit_code

def sftp_upload_dir(sftp, local_dir, remote_dir):
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        sftp.mkdir(remote_dir)
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"
        if item in ('node_modules', '.git', '__pycache__', 'dist'): continue
        if os.path.isdir(local_path):
            sftp_upload_dir(sftp, local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)
            # print(f"  📄 {item}")

def main():
    print("Connecting to VPS...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_IP, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=15)
    
    TMP_DIR = "/var/www/pancake-tmp"
    run(client, f"rm -rf {TMP_DIR} && mkdir -p {TMP_DIR}")
    
    print("Uploading source files (this will take 1-2 minutes)...")
    sftp = client.open_sftp()
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    for fname in ['package.json', 'vite.config.js', 'index.html', 'index.css']:
        if os.path.exists(os.path.join(base_dir, fname)):
            sftp.put(os.path.join(base_dir, fname), f"{TMP_DIR}/{fname}")
    
    for dname in ['src', 'server', 'public']:
        src = os.path.join(base_dir, dname)
        if os.path.isdir(src):
            print(f"Uploading {dname}/...")
            sftp_upload_dir(sftp, src, f"{TMP_DIR}/{dname}")
            
    sftp.close()
    
    print("Building Frontend on VPS...")
    run(client, f"cd {TMP_DIR} && npm install")
    run(client, f"cd {TMP_DIR} && npm run build")
    
    print("Deploying final files to Nginx & PM2 directories...")
    run(client, f"rm -rf /var/www/2hstudio-frontend/*")
    run(client, f"cp -r {TMP_DIR}/dist/* /var/www/2hstudio-frontend/")
    
    run(client, f"cp -r {TMP_DIR}/server/* /var/www/2hstudio-api/")
    run(client, f"cp {TMP_DIR}/package.json /var/www/2hstudio-api/")
    run(client, "cd /var/www/2hstudio-api && npm install --production")
    
    print("Restarting Server...")
    run(client, "pm2 restart 2hstudio-api")
    run(client, "systemctl reload nginx")
    
    # Cleanup broken process if any
    run(client, "pm2 delete pancake-v2-api || true")
    run(client, "pm2 save")
    
    client.close()
    print("DEPLOYMENT DONE!")

if __name__ == '__main__':
    main()
