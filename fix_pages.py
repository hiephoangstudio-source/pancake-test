import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('163.223.13.238', port=8686, username='root', password='*v%-uo2W')

# Use Node.js on server to call Pancake API with master token
cmd = """cd /var/www/2hstudio-api && node -e "
const TOKEN = process.env.PANCAKE_MASTER_TOKEN || '$(grep PANCAKE_MASTER_TOKEN .env | cut -d= -f2-)';
const pages = [
  '346608549120005','108441951509429','2292553917624578',
  '106944044994391','106658275579351','694833703706618','101151818904558'
];
(async () => {
  // Try different Pancake API endpoints
  for (const pid of pages) {
    try {
      // Try the tags endpoint which is known to work  
      const r = await fetch('https://pages.fm/api/public_api/v1/pages/' + pid + '?api_key=' + TOKEN);
      const text = await r.text();
      if (text.startsWith('{')) {
        const d = JSON.parse(text);
        console.log(pid + ' => ' + (d.name || d.page?.name || d.fb_page?.name || 'NO_NAME: ' + Object.keys(d).join(',')));
      } else {
        console.log(pid + ' => HTML (status: ' + r.status + ')');
      }
    } catch(e) { console.log(pid + ' => ERROR: ' + e.message); }
  }

  // Also try listing all pages
  try {
    const r2 = await fetch('https://pages.fm/api/public_api/v1/pages?api_key=' + TOKEN);
    const text2 = await r2.text();
    if (text2.startsWith('{') || text2.startsWith('[')) {
      const d2 = JSON.parse(text2);
      console.log('\\n=== ALL PAGES ===');
      const arr = d2.pages || d2.data || d2;
      if (Array.isArray(arr)) {
        arr.forEach(p => console.log(p.id + ' | ' + p.fb_page_id + ' | ' + (p.name || p.page_name || '?')));
      } else {
        console.log('Keys: ' + Object.keys(d2).join(','));
        console.log(JSON.stringify(d2).substring(0, 500));
      }
    } else {
      console.log('ALL PAGES => HTML (status: ' + r2.status + ')');
    }
  } catch(e) { console.log('ALL PAGES => ERROR: ' + e.message); }
})();
" """
_, stdout, stderr = ssh.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print(out)
if err: print("STDERR:", err[:500])

ssh.close()
