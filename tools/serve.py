#!/usr/bin/env python3
"""Máy chủ tĩnh nhỏ để xem trước Kozl Music ở máy local.

Khác với `python3 -m http.server`, máy chủ này hỗ trợ HTTP Range request —
nhờ vậy thanh waveform có thể tua (seek) được khi xem trước.

Chạy:
    python3 tools/serve.py            # http://localhost:8080
    python3 tools/serve.py 9000       # đổi cổng
"""
import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class RangeHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        rng = self.headers.get("Range")
        if not rng:
            return super().do_GET()
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().do_GET()
        try:
            f = open(path, "rb")
        except OSError:
            return super().do_GET()
        with f:
            size = os.fstat(f.fileno()).st_size
            m = re.match(r"bytes=(\d*)-(\d*)", rng)
            if not m:
                return super().do_GET()
            start = int(m.group(1)) if m.group(1) else 0
            end = int(m.group(2)) if m.group(2) else size - 1
            if start >= size:
                self.send_response(416)
                self.send_header("Content-Range", "bytes */%d" % size)
                self.end_headers()
                return
            end = min(end, size - 1)
            length = end - start + 1
            self.send_response(206)
            self.send_header("Content-Type", self.guess_type(path))
            self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
            self.send_header("Content-Length", str(length))
            self.end_headers()
            f.seek(start)
            remaining = length
            while remaining > 0:
                chunk = f.read(min(65536, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    ThreadingHTTPServer.allow_reuse_address = True
    with ThreadingHTTPServer(("0.0.0.0", port), RangeHandler) as httpd:
        print("Kozl Music -> http://localhost:%d/  (Ctrl+C để dừng)" % port)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nĐã dừng.")


if __name__ == "__main__":
    main()
