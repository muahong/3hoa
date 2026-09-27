# Dùng: python scripts/dkl-phuc-vu.py 8790 .   (chạy ở gốc repo)
# Máy chủ tĩnh cho gốc repo, hàng đợi kết nối lớn (http.server mặc định chỉ 5: Chrome mở nhiều kết nối cùng lúc bị từ chối).
import functools, http.server, socketserver, sys
class May(http.server.ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True
cong = int(sys.argv[1]); goc = sys.argv[2]
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=goc)
H.log_message = lambda *a, **k: None
May(('127.0.0.1', cong), H).serve_forever()
