#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Webhook Interceptor - Servidor local para interceptar e logar webhooks
Útil para debug e verificação de payloads da Evolution API
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

from colorama import Fore, Style, init
from dotenv import load_dotenv
from flask import Flask, request, jsonify

# Inicializa colorama para Windows
init(autoreset=True)

# Carrega variáveis de ambiente
load_dotenv()

app = Flask(__name__)

# Diretório de logs
LOGS_DIR = Path(__file__).parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# Contador de requisições
request_count = 0


def log_request_to_file(data: dict) -> Path:
    """Salva requisição em arquivo JSON"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = LOGS_DIR / f"webhook_received_{timestamp}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)
    return filename


def print_colored_json(data: dict, indent: int = 2):
    """Exibe JSON colorido no terminal"""
    json_str = json.dumps(data, indent=indent, ensure_ascii=False, default=str)
    # Colorização simples
    for line in json_str.split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            print(f"{Fore.CYAN}{key}{Style.RESET_ALL}:{Fore.GREEN}{value}{Style.RESET_ALL}")
        else:
            print(f"{Fore.YELLOW}{line}{Style.RESET_ALL}")


@app.route('/webhook', methods=['POST', 'GET', 'OPTIONS'])
def webhook_handler():
    """Handler principal do webhook"""
    global request_count
    request_count += 1
    
    timestamp = datetime.now().isoformat()
    
    # Coleta dados da requisição
    request_data = {
        "request_number": request_count,
        "timestamp": timestamp,
        "method": request.method,
        "url": request.url,
        "headers": dict(request.headers),
        "args": dict(request.args),
        "remote_addr": request.remote_addr
    }
    
    # Corpo da requisição
    if request.method == 'POST':
        try:
            if request.is_json:
                request_data["body"] = request.get_json()
            else:
                request_data["body_raw"] = request.get_data(as_text=True)
        except Exception as e:
            request_data["body_error"] = str(e)
    
    # Exibe no terminal em tempo real
    print(f"\n{Fore.CYAN}{'='*70}")
    print(f"{Fore.GREEN}[#{request_count}] {timestamp} - {request.method} {request.path}")
    print(f"{Fore.CYAN}{'='*70}{Style.RESET_ALL}")
    
    print(f"\n{Fore.YELLOW}📍 Remote IP:{Style.RESET_ALL} {request.remote_addr}")
    
    print(f"\n{Fore.YELLOW}📋 Headers:{Style.RESET_ALL}")
    for key, value in request.headers:
        if key.lower() in ['content-type', 'authorization', 'apikey', 'user-agent']:
            print(f"  {Fore.CYAN}{key}:{Style.RESET_ALL} {value}")
    
    if "body" in request_data:
        print(f"\n{Fore.YELLOW}📦 Body (JSON):{Style.RESET_ALL}")
        print_colored_json(request_data["body"])
        
        # Destaca informações importantes para Evolution API
        body = request_data["body"]
        if isinstance(body, dict):
            if "event" in body:
                print(f"\n{Fore.MAGENTA}⚡ Event:{Style.RESET_ALL} {body['event']}")
            if "instance" in body:
                print(f"{Fore.MAGENTA}📱 Instance:{Style.RESET_ALL} {body['instance']}")
            if "data" in body and isinstance(body["data"], dict):
                data = body["data"]
                if "key" in data:
                    print(f"{Fore.MAGENTA}🔑 RemoteJid:{Style.RESET_ALL} {data['key'].get('remoteJid', 'N/A')}")
                if "pushName" in data:
                    print(f"{Fore.MAGENTA}👤 PushName:{Style.RESET_ALL} {data['pushName']}")
                if "message" in data:
                    msg = data["message"]
                    if isinstance(msg, dict) and "conversation" in msg:
                        print(f"{Fore.MAGENTA}💬 Mensagem:{Style.RESET_ALL} {msg['conversation'][:100]}")
    
    elif "body_raw" in request_data:
        print(f"\n{Fore.YELLOW}📦 Body (Raw):{Style.RESET_ALL}")
        print(request_data["body_raw"][:500])
    
    # Salva em arquivo
    log_file = log_request_to_file(request_data)
    print(f"\n{Fore.BLUE}💾 Log salvo:{Style.RESET_ALL} {log_file}")
    print(f"{Fore.CYAN}{'='*70}{Style.RESET_ALL}\n")
    
    # Sempre retorna 200 OK para confirmar recebimento
    return jsonify({
        "status": "received",
        "request_number": request_count,
        "timestamp": timestamp
    }), 200


@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint de health check"""
    return jsonify({
        "status": "healthy",
        "requests_received": request_count,
        "uptime": datetime.now().isoformat()
    }), 200


@app.route('/', methods=['GET'])
def index():
    """Página inicial com instruções"""
    return """
    <html>
    <head><title>Webhook Interceptor</title></head>
    <body style="font-family: Arial; padding: 20px; background: #1a1a2e; color: #eee;">
        <h1 style="color: #00d4ff;">🎯 Webhook Interceptor</h1>
        <p>Servidor ativo e pronto para receber webhooks.</p>
        <h2>Endpoints:</h2>
        <ul>
            <li><code style="color: #00ff88;">POST /webhook</code> - Recebe webhooks</li>
            <li><code style="color: #00ff88;">GET /health</code> - Health check</li>
        </ul>
        <h2>Uso com ngrok:</h2>
        <pre style="background: #0f0f23; padding: 15px; border-radius: 5px;">
ngrok http 5000
        </pre>
        <p>Requisições recebidas: <strong>""" + str(request_count) + """</strong></p>
    </body>
    </html>
    """


def main():
    port = int(os.getenv("LOCAL_SERVER_PORT", 5000))
    
    print(f"""
{Fore.CYAN}{'='*60}
{Fore.GREEN}   WEBHOOK INTERCEPTOR - Servidor de Debug
{Fore.CYAN}{'='*60}{Style.RESET_ALL}

{Fore.YELLOW}📡 Servidor iniciando em:{Style.RESET_ALL} http://localhost:{port}
{Fore.YELLOW}🎯 Endpoint webhook:{Style.RESET_ALL} http://localhost:{port}/webhook

{Fore.MAGENTA}Para expor publicamente, use ngrok:{Style.RESET_ALL}
  ngrok http {port}

{Fore.CYAN}{'='*60}{Style.RESET_ALL}
{Fore.GREEN}Aguardando requisições... (Ctrl+C para sair){Style.RESET_ALL}
""")
    
    # Roda o servidor Flask
    app.run(host="0.0.0.0", port=port, debug=False)


if __name__ == "__main__":
    main()
