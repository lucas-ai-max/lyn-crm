#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Webhook Diagnostics - Ferramenta de diagnóstico para webhooks
Testa conectividade, simula payloads e captura respostas
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import requests
from colorama import Fore, Style, init
from dotenv import load_dotenv

# Inicializa colorama para Windows
init(autoreset=True)

# Diretório de logs
LOGS_DIR = Path(__file__).parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)


def log_to_file(data: dict, prefix: str = "diagnostic"):
    """Salva dados em arquivo de log JSON"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = LOGS_DIR / f"{prefix}_{timestamp}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)
    return filename


def print_header(text: str):
    """Exibe cabeçalho formatado"""
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"{Fore.CYAN}{text}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}\n")


def print_success(text: str):
    print(f"{Fore.GREEN}✓ {text}{Style.RESET_ALL}")


def print_error(text: str):
    print(f"{Fore.RED}✗ {text}{Style.RESET_ALL}")


def print_warning(text: str):
    print(f"{Fore.YELLOW}⚠ {text}{Style.RESET_ALL}")


def print_info(text: str):
    print(f"{Fore.BLUE}ℹ {text}{Style.RESET_ALL}")


def test_connection(url: str, api_key: str = None, timeout: int = 10) -> dict:
    """Testa conectividade básica com a URL do webhook"""
    print_header("TESTE DE CONECTIVIDADE")
    print_info(f"URL: {url}")
    
    result = {
        "test_type": "connection",
        "url": url,
        "timestamp": datetime.now().isoformat(),
        "success": False
    }
    
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
        headers["apikey"] = api_key
    
    # Teste 1: HEAD request
    print("\n[1/3] Testando HEAD request...")
    try:
        resp = requests.head(url, headers=headers, timeout=timeout)
        result["head_status"] = resp.status_code
        if resp.status_code < 500:
            print_success(f"HEAD retornou status {resp.status_code}")
        else:
            print_error(f"HEAD retornou erro {resp.status_code}")
    except requests.exceptions.RequestException as e:
        result["head_error"] = str(e)
        print_error(f"HEAD falhou: {e}")
    
    # Teste 2: OPTIONS request (CORS)
    print("\n[2/3] Testando OPTIONS request (CORS)...")
    try:
        resp = requests.options(url, headers=headers, timeout=timeout)
        result["options_status"] = resp.status_code
        result["cors_headers"] = dict(resp.headers)
        if resp.status_code == 200:
            print_success(f"OPTIONS retornou {resp.status_code}")
            if "access-control-allow-origin" in resp.headers:
                print_success(f"CORS habilitado: {resp.headers.get('access-control-allow-origin')}")
        else:
            print_warning(f"OPTIONS retornou {resp.status_code}")
    except requests.exceptions.RequestException as e:
        result["options_error"] = str(e)
        print_error(f"OPTIONS falhou: {e}")
    
    # Teste 3: POST vazio
    print("\n[3/3] Testando POST vazio...")
    try:
        resp = requests.post(url, json={}, headers=headers, timeout=timeout)
        result["post_status"] = resp.status_code
        result["post_response"] = resp.text[:500] if resp.text else ""
        if resp.status_code in [200, 400, 405]:
            print_success(f"POST retornou {resp.status_code} - Servidor respondendo")
        elif resp.status_code == 401:
            print_warning(f"POST retornou 401 - Autenticação necessária")
        else:
            print_warning(f"POST retornou {resp.status_code}")
    except requests.exceptions.RequestException as e:
        result["post_error"] = str(e)
        print_error(f"POST falhou: {e}")
    
    # Verifica sucesso geral
    if result.get("post_status") and result["post_status"] < 500:
        result["success"] = True
        print_success("\nConectividade OK - Servidor acessível")
    else:
        print_error("\nProblemas de conectividade detectados")
    
    log_file = log_to_file(result, "connection_test")
    print_info(f"Log salvo em: {log_file}")
    
    return result


def test_payload(url: str, api_key: str = None, instance: str = "test_instance", timeout: int = 10) -> dict:
    """Simula um payload da Evolution API"""
    print_header("TESTE DE PAYLOAD SIMULADO")
    print_info(f"URL: {url}")
    print_info(f"Instância: {instance}")
    
    # Payload típico da Evolution API
    payload = {
        "event": "messages.upsert",
        "instance": instance,
        "data": {
            "key": {
                "remoteJid": "5511999999999@s.whatsapp.net",
                "fromMe": False,
                "id": f"TEST_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            },
            "message": {
                "conversation": "Mensagem de teste para diagnóstico de webhook"
            },
            "messageTimestamp": int(datetime.now().timestamp()),
            "pushName": "Teste Diagnóstico"
        }
    }
    
    result = {
        "test_type": "payload_simulation",
        "url": url,
        "timestamp": datetime.now().isoformat(),
        "payload_sent": payload,
        "success": False
    }
    
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Evolution-API/2.0"
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
        headers["apikey"] = api_key
    
    print("\nEnviando payload simulado...")
    print(f"\n{Fore.YELLOW}Payload:{Style.RESET_ALL}")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=timeout)
        
        result["response_status"] = resp.status_code
        result["response_headers"] = dict(resp.headers)
        result["response_body"] = resp.text[:2000] if resp.text else ""
        result["response_time_ms"] = resp.elapsed.total_seconds() * 1000
        
        print(f"\n{Fore.CYAN}Resposta:{Style.RESET_ALL}")
        print(f"Status Code: {resp.status_code}")
        print(f"Tempo: {result['response_time_ms']:.2f}ms")
        print(f"Headers: {dict(resp.headers)}")
        print(f"Body: {resp.text[:500]}")
        
        if resp.status_code == 200:
            print_success("\n✓ Webhook aceitou o payload com sucesso!")
            result["success"] = True
        elif resp.status_code == 401:
            print_error("\n✗ Erro 401 - Autenticação rejeitada")
            print_warning("  → Verifique se verify_jwt está desabilitado na Edge Function")
        elif resp.status_code == 400:
            print_warning("\n⚠ Erro 400 - Payload rejeitado (mas servidor acessível)")
        else:
            print_warning(f"\n⚠ Código de resposta inesperado: {resp.status_code}")
            
    except requests.exceptions.Timeout:
        result["error"] = "Timeout"
        print_error("\n✗ Timeout - Servidor demorou muito para responder")
    except requests.exceptions.ConnectionError as e:
        result["error"] = str(e)
        print_error(f"\n✗ Erro de conexão: {e}")
    except Exception as e:
        result["error"] = str(e)
        print_error(f"\n✗ Erro inesperado: {e}")
    
    log_file = log_to_file(result, "payload_test")
    print_info(f"\nLog salvo em: {log_file}")
    
    return result


def main():
    load_dotenv()
    
    parser = argparse.ArgumentParser(
        description="Ferramenta de diagnóstico para webhooks Evolution API → CRM",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos de uso:
  python webhook_diagnostics.py --url https://example.com/webhook --test connection
  python webhook_diagnostics.py --url https://example.com/webhook --test payload
  python webhook_diagnostics.py --test all
        """
    )
    
    parser.add_argument(
        "--url",
        default=os.getenv("CRM_WEBHOOK_URL"),
        help="URL do webhook do CRM (default: variável CRM_WEBHOOK_URL)"
    )
    parser.add_argument(
        "--api-key",
        default=os.getenv("CRM_API_KEY"),
        help="API Key do CRM para autenticação (opcional)"
    )
    parser.add_argument(
        "--instance",
        default=os.getenv("WHATSAPP_INSTANCE_NAME", "test_instance"),
        help="Nome da instância WhatsApp para simular"
    )
    parser.add_argument(
        "--test",
        choices=["connection", "payload", "all"],
        default="all",
        help="Tipo de teste a executar"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=10,
        help="Timeout em segundos (default: 10)"
    )
    
    args = parser.parse_args()
    
    if not args.url:
        print_error("Erro: URL do webhook não especificada!")
        print_info("Use --url ou defina CRM_WEBHOOK_URL no .env")
        sys.exit(1)
    
    print_header("WEBHOOK DIAGNOSTICS - LYN CRM")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"URL alvo: {args.url}")
    
    results = {}
    
    if args.test in ["connection", "all"]:
        results["connection"] = test_connection(args.url, args.api_key, args.timeout)
    
    if args.test in ["payload", "all"]:
        results["payload"] = test_payload(args.url, args.api_key, args.instance, args.timeout)
    
    # Resumo final
    print_header("RESUMO DO DIAGNÓSTICO")
    
    all_ok = True
    for test_name, result in results.items():
        if result.get("success"):
            print_success(f"{test_name.upper()}: OK")
        else:
            print_error(f"{test_name.upper()}: FALHOU")
            all_ok = False
    
    if all_ok:
        print(f"\n{Fore.GREEN}{'='*60}")
        print(f"{Fore.GREEN}TODOS OS TESTES PASSARAM!")
        print(f"{Fore.GREEN}{'='*60}{Style.RESET_ALL}")
    else:
        print(f"\n{Fore.RED}{'='*60}")
        print(f"{Fore.RED}ALGUNS TESTES FALHARAM - VERIFIQUE OS LOGS")
        print(f"{Fore.RED}{'='*60}{Style.RESET_ALL}")
    
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
