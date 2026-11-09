#!/usr/bin/env python3
"""情绪菜园 · 本地服务器（只用 Python 标准库，无需安装任何包）

作用：
  1) 把本文件夹当网站发给手机（HTTPS，手机摄像头才能用）
  2) 接收手机"确认并保存"时发来的记录，追加到 records.csv

用法：
  python server.py            # 默认 HTTPS，端口 8443（首次会自动生成自签名证书，需要电脑装有 openssl）
  python server.py --http     # 纯 HTTP，端口 8000（只适合电脑本机 localhost 测试）
  python server.py --port 9000
"""
import argparse, csv, json, os, socket, ssl, subprocess, sys, threading, time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(ROOT, 'records.csv')
CERT, KEY, CERT_IPS = (os.path.join(ROOT, n) for n in ('cert.pem', 'key.pem', 'cert_ips.txt'))
FIELDS = ['id', 'server_time', 'client_time', 'zone', 'emotion', 'emoji', 'word', 'level', 'solfege',
          'stage', 'special', 'instrument', 'confidence', 'device']
LOCK = threading.Lock()


def seen_ids():
    if not os.path.exists(CSV_PATH):
        return set()
    try:
        with open(CSV_PATH, newline='', encoding='utf-8-sig') as f:
            return {r.get('id') for r in csv.DictReader(f)}
    except Exception:
        return set()


def migrate_csv():
    """旧版 records.csv 没有 emoji / word 两列：启动时补齐表头，避免新旧记录错位（旧文件备份为 records.csv.bak）。"""
    if not os.path.exists(CSV_PATH):
        return
    try:
        with open(CSV_PATH, newline='', encoding='utf-8-sig') as f:
            rd = csv.DictReader(f)
            old, rows = rd.fieldnames or [], list(rd)
        if old == FIELDS:
            return
        os.replace(CSV_PATH, CSV_PATH + '.bak')
        with open(CSV_PATH, 'w', newline='', encoding='utf-8-sig') as f:
            w = csv.DictWriter(f, FIELDS)
            w.writeheader()
            for r in rows:
                w.writerow({k: r.get(k, '') for k in FIELDS})
        print('已把旧的 records.csv 升级为新表头（旧文件备份为 records.csv.bak）')
    except PermissionError:
        print('!! records.csv 被占用（Excel 开着？），没能升级表头；请关掉后重启服务器')


migrate_csv()
SEEN = seen_ids()


def lan_ips():
    ips = set()
    try:                                   # 不会真的发包，只是让系统选出对外网卡
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('10.255.255.255', 1))
        ips.add(s.getsockname()[0]); s.close()
    except Exception:
        pass
    try:
        ips.update(socket.gethostbyname_ex(socket.gethostname())[2])
    except Exception:
        pass
    return sorted(i for i in ips if not i.startswith('127.'))


def _cert_openssl(ips):
    """用 openssl + 临时配置文件生成（不依赖系统默认 openssl.cnf，也不需要 -addext）。"""
    import tempfile
    san = ','.join(['DNS:localhost', 'IP:127.0.0.1'] + ['IP:' + i for i in ips])
    cnf = ('[req]\ndistinguished_name=dn\nx509_extensions=v3\nprompt=no\n'
           '[dn]\nCN=emotion-garden\n[v3]\nsubjectAltName=' + san + '\n')
    fd, cnf_path = tempfile.mkstemp(suffix='.cnf')
    try:
        with os.fdopen(fd, 'w') as f:
            f.write(cnf)
        r = subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '825',
                            '-keyout', KEY, '-out', CERT, '-config', cnf_path],
                           capture_output=True, text=True)
        if r.returncode != 0:
            raise RuntimeError((r.stderr or r.stdout or '').strip()[-400:])
    finally:
        try: os.remove(cnf_path)
        except OSError: pass


def _cert_cryptography(ips):
    """备用：用 Python 的 cryptography 包生成（conda / pip 环境里常已自带）。"""
    import datetime, ipaddress
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'emotion-garden')])
    san = [x509.DNSName('localhost'), x509.IPAddress(ipaddress.ip_address('127.0.0.1'))]
    san += [x509.IPAddress(ipaddress.ip_address(i)) for i in ips]
    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(now - datetime.timedelta(days=1))
            .not_valid_after(now + datetime.timedelta(days=825))
            .add_extension(x509.SubjectAlternativeName(san), critical=False)
            .sign(key, hashes.SHA256()))
    open(KEY, 'wb').write(key.private_bytes(serialization.Encoding.PEM,
                          serialization.PrivateFormat.TraditionalOpenSSL, serialization.NoEncryption()))
    open(CERT, 'wb').write(cert.public_bytes(serialization.Encoding.PEM))


def ensure_cert(ips):
    """证书里写入电脑当前局域网 IP；IP 变了会自动重新生成。"""
    want = ','.join(ips)
    if os.path.exists(CERT) and os.path.exists(KEY) and os.path.exists(CERT_IPS):
        if open(CERT_IPS).read().strip() == want:
            return True
    errs = []
    for name, fn in (('openssl', _cert_openssl), ('cryptography', _cert_cryptography)):
        try:
            fn(ips)
            open(CERT_IPS, 'w').write(want)
            print('已生成自签名证书（方式：%s，有效期约 2 年）' % name)
            return True
        except Exception as e:
            errs.append('%s：%s' % (name, e))
    print('!! 生成证书失败')
    for e in errs:
        print('   -', e)
    print('   解决办法：运行  pip install cryptography  后重试；或看 README 改用 --http + 隧道。')
    return False


class QuietServer(ThreadingHTTPServer):
    """手机在传图/传页面中途切走、锁屏、刷新，会让连接被掐断（常见于 TLS：ssl.SSLError / 连接重置）。
    这是正常现象，不影响使用，不要把整段 traceback 打到屏幕上。其它真正的异常照常显示。"""
    def handle_error(self, request, client_address):
        if isinstance(sys.exc_info()[1], (ssl.SSLError, ConnectionError, TimeoutError)):
            return
        super().handle_error(request, client_address)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')       # 允许页面放在别处（如 GitHub Pages）时跨域上报
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    # 这些文件不对外提供（含你的数据、私钥、源码）。静态网页文件照常提供。
    BLOCKED = {'records.csv', 'records.csv.bak', 'key.pem', 'cert.pem', 'cert_ips.txt', 'server.py', 'download_vendor.py',
               'start.bat', 'start.sh', 'start.command', 'readme.md', '.gitignore'}

    def _blocked(self):
        path = self.path.split('?')[0].lower()
        return '..' in path or os.path.basename(path.rstrip('/')) in self.BLOCKED

    def do_GET(self):
        if self.path.split('?')[0] == '/api/ping':       # 页面用它判断"有没有后端"；没有就进演示模式
            return self._json(200, {'ok': True})
        if self._blocked():
            return self.send_error(404)
        super().do_GET()

    def do_HEAD(self):
        if self._blocked():
            return self.send_error(404)
        super().do_HEAD()

    def do_OPTIONS(self):
        self.send_response(204); self.end_headers()

    def _json(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers(); self.wfile.write(b)

    def do_POST(self):
        if self.path.split('?')[0] != '/api/record':
            return self._json(404, {'ok': False, 'error': 'not found'})
        try:
            n = int(self.headers.get('Content-Length', 0))
            d = json.loads(self.rfile.read(n) or b'{}')
        except Exception:
            return self._json(400, {'ok': False, 'error': 'bad json'})
        rid = str(d.get('id') or '')
        with LOCK:
            if rid and rid in SEEN:                      # 手机重发时去重
                return self._json(200, {'ok': True, 'dup': True})
            row = {k: d.get(k, '') for k in FIELDS}
            row['id'] = rid
            row['server_time'] = time.strftime('%Y-%m-%d %H:%M:%S')
            row['device'] = self.headers.get('User-Agent', '')[:80]
            try:
                new = not os.path.exists(CSV_PATH)
                with open(CSV_PATH, 'a', newline='', encoding='utf-8-sig') as f:   # utf-8-sig：Excel 不乱码
                    w = csv.DictWriter(f, FIELDS)
                    if new:
                        w.writeheader()
                    w.writerow(row)
            except PermissionError:                      # 多半是 Excel 正开着 records.csv
                print('!! records.csv 被占用（是不是在 Excel 里打开着？）手机会稍后自动重发')
                return self._json(503, {'ok': False, 'error': 'csv locked'})
            if rid:
                SEEN.add(rid)
        print(f"[{row['server_time']}] 收到记录：{row['zone']} · {row['emotion']} {row['emoji']}{row['word']} · {row['level']}级({row['solfege']}) · {row['special'] or '无特殊状态'} · {row['instrument']}")
        self._json(200, {'ok': True})

    def log_message(self, fmt, *args):                  # 静音默认访问日志，只显示"收到记录"
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--http', action='store_true', help='使用纯 HTTP（手机上摄像头不可用）')
    ap.add_argument('--port', type=int, default=0)
    ap.add_argument('--ip', action='append', default=[], help='手动指定手机访问用的电脑 IP（可重复），自动识别不对时使用')
    a = ap.parse_args()
    ips = a.ip or lan_ips()
    use_tls = not a.http
    if use_tls and not ensure_cert(ips or ['127.0.0.1']):
        sys.exit(1)
    port = a.port or (8443 if use_tls else 8000)
    srv = QuietServer(('0.0.0.0', port), Handler)
    scheme = 'http'
    if use_tls:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(CERT, KEY)
        srv.socket = ctx.wrap_socket(srv.socket, server_side=True)
        scheme = 'https'
    print('=' * 58)
    print(' 情绪菜园 服务器已启动   （Ctrl+C 停止）')
    print(f'  电脑本机打开： {scheme}://localhost:{port}/')
    for ip in ips:
        print(f'  手机打开（需与电脑同一 Wi-Fi）： {scheme}://{ip}:{port}/')
    if use_tls:
        print('  手机首次打开会提示"不安全/证书无效"，点 高级 → 继续访问 即可。')
    print(f'  记录文件： {CSV_PATH}')
    print('=' * 58)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print('\n已停止')


if __name__ == '__main__':
    main()