from pathlib import Path
import subprocess
import datetime

config = Path('/etc/nginx/nginx.conf')
original = config.read_text()
marker = '        # Celebrating Prisca preview'
block = '''        # Celebrating Prisca preview
        location = /celebrating-prisca { return 301 /celebrating-prisca/; }
        location ^~ /celebrating-prisca/ {
            client_max_body_size 325m;
            proxy_pass http://127.0.0.1:4100/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $remote_addr;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 120s;
        }

'''
if marker not in original:
    anchor = '        location /api/ {'
    if original.count(anchor) != 1:
        raise RuntimeError('Unexpected nginx layout; no change made')
    backup = config.with_name('nginx.conf.before-prisca-' + datetime.datetime.now().strftime('%Y%m%d%H%M%S'))
    backup.write_text(original)
    config.write_text(original.replace(anchor, block + anchor, 1))
    try:
        subprocess.run(['nginx', '-t'], check=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
    except Exception:
        config.write_text(original)
        subprocess.run(['nginx', '-t'], check=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
        raise
    print('Preview route added; previous config backed up at', backup)
else:
    print('Preview route already configured')
