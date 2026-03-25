#!/usr/bin/env python3
"""SSH helper for VPS operations using paramiko."""
import sys
import os
import paramiko

# VPS config from .env
VPS_IP = "163.223.13.238"
VPS_USER = "root"
VPS_PASSWORD = "*v%-uo2W"
VPS_PORT = 8686

def get_client():
    """Create and return an SSH client connected to VPS."""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_IP, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=15)
    return client

def run_cmd(client, cmd, show=True):
    """Run a command on the VPS and return stdout."""
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if show:
        if out:
            print(out)
        if err:
            print(f"[stderr] {err}", file=sys.stderr)
    return out

def check_env():
    """Check VPS environment."""
    client = get_client()
    print("=== Connected to VPS ===")
    
    commands = [
        ("OS", "cat /etc/os-release | head -3"),
        ("PostgreSQL", "which psql 2>/dev/null && psql --version || echo 'NOT INSTALLED'"),
        ("PostgreSQL Service", "systemctl is-active postgresql 2>/dev/null || echo 'NOT ACTIVE'"),
        ("Nginx", "which nginx 2>/dev/null && nginx -v 2>&1 || echo 'NOT INSTALLED'"),
        ("Nginx Service", "systemctl is-active nginx 2>/dev/null || echo 'NOT ACTIVE'"),
        ("Node.js", "node --version 2>/dev/null || echo 'NOT INSTALLED'"),
        ("npm", "npm --version 2>/dev/null || echo 'NOT INSTALLED'"),
        ("PM2", "pm2 --version 2>/dev/null || echo 'NOT INSTALLED'"),
        ("Docker", "docker --version 2>/dev/null || echo 'NOT INSTALLED'"),
        ("Certbot", "certbot --version 2>/dev/null || echo 'NOT INSTALLED'"),
        ("Disk", "df -h / | tail -1"),
        ("Memory", "free -h | head -2"),
        ("Existing sites", "ls -la /var/www/ 2>/dev/null || echo 'No /var/www'"),
    ]
    
    for label, cmd in commands:
        print(f"\n=== {label} ===")
        run_cmd(client, cmd)
    
    client.close()

def setup_ssh_key():
    """Copy SSH public key to VPS for passwordless auth."""
    client = get_client()
    pub_key_path = os.path.expanduser("~/.ssh/id_rsa.pub")
    if os.path.exists(pub_key_path):
        with open(pub_key_path, 'r') as f:
            pub_key = f.read().strip()
        run_cmd(client, "mkdir -p ~/.ssh && chmod 700 ~/.ssh")
        run_cmd(client, f'grep -q "{pub_key[:50]}" ~/.ssh/authorized_keys 2>/dev/null || echo "{pub_key}" >> ~/.ssh/authorized_keys')
        run_cmd(client, "chmod 600 ~/.ssh/authorized_keys")
        print("SSH key copied successfully!")
    else:
        print("No SSH public key found!")
    client.close()

def run_remote(cmd):
    """Run a single command on VPS."""
    client = get_client()
    result = run_cmd(client, cmd)
    client.close()
    return result

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "check"
    
    if action == "check":
        check_env()
    elif action == "setup-key":
        setup_ssh_key()
    elif action == "run":
        cmd = " ".join(sys.argv[2:])
        run_remote(cmd)
    else:
        print(f"Unknown action: {action}")
        print("Usage: ssh_helper.py [check|setup-key|run <command>]")
