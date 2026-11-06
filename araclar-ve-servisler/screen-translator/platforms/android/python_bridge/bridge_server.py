import http.server
import json
import logging
from typing import Optional
try:
    from core.config import config_manager
    from core.registry import PluginRegistry
    from core import engines
except ImportError:
    from ....core.config import config_manager
    from ....core.registry import PluginRegistry
    from ....core import engines

logger = logging.getLogger("AndroidBridgeServer")

class BridgeRequestHandler(http.server.BaseHTTPRequestHandler):
    pipeline = None

    def do_POST(self):
        if self.path == "/translate":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)

            try:
                data = json.loads(post_data.decode('utf-8'))
                texts = data.get("texts", [])
                target_lang = data.get("target_lang", "tr")

                # Çevirmen motorunu çağır
                translator = PluginRegistry.create_translator(
                    config_manager.get("translation_engine", "gemini"),
                    api_key=config_manager.get("gemini_api_key", ""),
                    target_lang=target_lang
                ) or PluginRegistry.create_translator("google", target_lang=target_lang)

                translations = translator.translate_batch(texts)

                response_data = json.dumps({"translations": translations}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(response_data)))
                self.end_headers()
                self.wfile.write(response_data)

            except Exception as e:
                logger.error(f"Köprü işleme hatası: {e}")
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Sessiz HTTP sunucusu
        pass

def run_bridge_server(port: int = 8765):
    server_address = ('', port)
    httpd = http.server.HTTPServer(server_address, BridgeRequestHandler)
    logger.info(f"Android Python Köprü Sunucusu {port} portunda çalışıyor...")
    httpd.serve_forever()

if __name__ == '__main__':
    run_bridge_server()
