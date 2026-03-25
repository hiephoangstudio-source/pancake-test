#!/usr/bin/env python3
"""Upload frontend dist to VPS."""
import os
import paramiko

VPS_IP = "163.223.13.238"
VPS_USER = "root"
VPS_PASSWORD = "*v%-uo2W"
VPS_PORT = 8686
FRONTEND_DIR = "/var/www/pancake-2hstudio-frontend"

def get_client():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_IP, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=15)
    return client

def run(client, cmd):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    code = stdout.channel.recv_exit_status()
    if out: print(out)
    if err and code != 0: print(f"[err] {err}")
    return out

def sftp_upload_dir(sftp, local_dir, remote_dir):
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        sftp.mkdir(remote_dir)
    
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"
        
        if os.path.isdir(local_path):
            sftp_upload_dir(sftp, local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)
            print(f"  {item}")

if __name__ == "__main__":
    dist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist2')
    
    if not os.path.isdir(dist_dir):
        print(f"ERROR: {dist_dir} not found!")
        exit(1)
    
    client = get_client()
    print(f"Connected to VPS")
    
    # Clean and recreate frontend dir
    run(client, f"rm -rf {FRONTEND_DIR}/*")
    run(client, f"mkdir -p {FRONTEND_DIR}")
    
    sftp = client.open_sftp()
    print("Uploading dist/...")
    sftp_upload_dir(sftp, dist_dir, FRONTEND_DIR)
    sftp.close()
    
    print("\nReloading nginx...")
    run(client, "systemctl reload nginx")
    
    print("\nVerifying...")
    run(client, f"ls -la {FRONTEND_DIR}/ | head -20")
    
    client.close()
    print("\nDone! Frontend deployed.")
