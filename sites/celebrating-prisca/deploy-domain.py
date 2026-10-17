from pathlib import Path
import subprocess
import datetime

main = Path('/etc/nginx/nginx.conf')
domain = Path('/etc/nginx/prisca-domain.conf')
original = main.read_text()
include = '    include /etc/nginx/prisca-domain.conf;'
if not domain.exists():
    domain.write_text('''server {
    listen 80;
    listen [::]:80;
    server_name 2410.ceo;
    client_max_body_size 325m;
    location / {
        proxy_pass http://127.0.0.1:4100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
''')
if include not in original:
    if original.count('http {') != 1:
        raise RuntimeError('Unexpected nginx layout')
    backup = main.with_name('nginx.conf.before-2410-' + datetime.datetime.now().strftime('%Y%m%d%H%M%S'))
    backup.write_text(original)
    main.write_text(original.replace('http {', 'http {\n' + include, 1))
try:
    subprocess.run(['nginx','-t'],check=True)
    subprocess.run(['systemctl','reload','nginx'],check=True)
except Exception:
    main.write_text(original)
    subprocess.run(['nginx','-t'],check=True)
    subprocess.run(['systemctl','reload','nginx'],check=True)
    raise
print('2410.ceo HTTP host configured')
