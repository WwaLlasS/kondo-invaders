"""Take real in-game screenshots using headless Google Chrome.

Usage: python3 tools/take_screenshots.py
"""
import http.server
import os
import socketserver
import subprocess
import threading
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DOCS_IMG = os.path.join(ROOT, 'docs', 'img')
os.makedirs(DOCS_IMG, exist_ok=True)

CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, format, *args):
        pass


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def main():
    httpd = ReusableTCPServer(('127.0.0.1', 0), Handler)
    port = httpd.server_address[1]

    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    time.sleep(0.3)

    targets = [
        ('screenshot-menu.png', f'http://127.0.0.1:{port}/?scene=menu', 1800),
        ('screenshot-shipselect.png', f'http://127.0.0.1:{port}/?scene=shipselect', 2200),
        ('screenshot-gameplay.png', f'http://127.0.0.1:{port}/?scene=game', 4500),
    ]

    for name, url, budget in targets:
        out_path = os.path.join(DOCS_IMG, name)
        cmd = [
            CHROME_BIN,
            '--headless=new',
            '--disable-gpu',
            '--hide-scrollbars',
            '--window-size=450,820',
            f'--virtual-time-budget={budget}',
            f'--screenshot={out_path}',
            url
        ]
        subprocess.run(cmd, check=True)
        print(f'Captured {name} ({os.path.getsize(out_path)} bytes)')

    httpd.shutdown()


if __name__ == '__main__':
    main()
