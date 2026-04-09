#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix Webhook - Corrige automaticamente a configuração de webhook na Evolution API
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

init(autoreset=True)

LOGS_DIR = Path(__file__).parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)


def print_header(text: str):
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


class WebhookFixer:
    def __init__(self, evo_url: str, evo_key: str):
        self.evo_url = evo_url.rstrip('/')
        self.evo_key = evo_key
        self.headers = {"Content-Type": "application/json", "apikey": evo_key}
    
    def _request(self, method: str, endpoint: str, data: dict = None) -> dict:
        url = f"{self.evo_url}/{endpoint}"
        try:
            if method == "GET":
                resp = requests.get(url, headers=self.headers, timeout=15)
            elif method == "POST":
                resp = requests.post(url, headers=self.headers, json=data or {}, timeout=15)
            elif method == "PUT":
                resp = requests.put(url, headers=self.headers, json=data or {}, timeout=15)
            else:
                return {"error": f"Método não suportado"}
            
            return {"status": resp.status_code, "data": resp.json() if resp.text else {}}
        except Exception as e:
            return {"error": str(e)}
    
    def check_instance(self, instance_name: str) -> bool:
        """Verifica se a instância existe"""
        result = self._request("GET", f"instance/connectionState/{instance_name}")
        if "error" in result:
            print_error(f"Instância não encontrada: {result['error']}")
            return False
        print_success(f"Instância '{instance_name}' encontrada")
        return True
    
    def get_current_webhook(self, instance_name: str) -> dict:
        """Obtém configuração atual do webhook"""
        result = self._request("GET", f"webhook/find/{instance_name}")
        return result.get("data", {})
    
    def set_webhook(self, instance_name: str, webhook_url: str, events: list = None) -> dict:
        """Configura webhook na instância"""
        if events is None:
            events = [
                "messages.upsert",
                "messages.update",
                "connection.update",
                "qrcode.updated"
            ]
        
        payload = {
            "url": webhook_url,
            "webhook_by_events": False,
            "webhook_base64": True,
            "events": events,
            "enabled": True
        }
        
        result = self._request("POST", f"webhook/set/{instance_name}", payload)
        return result
    
    def test_webhook(self, webhook_url: str) -> bool:
        """Testa se o webhook está respondendo"""
        print_info("Testando webhook...")
        
        test_payload = {
            "event": "test",
            "instance": "fix_webhook_test",
            "data": {"test": True, "timestamp": datetime.now().isoformat()}
        }
        
        try:
            resp = requests.post(webhook_url, json=test_payload, timeout=10)
            if resp.status_code == 200:
                print_success(f"Webhook respondeu com 200 OK")
                return True
            else:
                print_warning(f"Webhook respondeu com {resp.status_code}")
                return resp.status_code < 500
        except Exception as e:
            print_error(f"Erro ao testar webhook: {e}")
            return False
    
    def fix(self, instance_name: str, webhook_url: str, dry_run: bool = False) -> dict:
        """Executa a correção do webhook"""
        print_header("FIX WEBHOOK - EVOLUTION API")
        
        result = {
            "success": False,
            "instance": instance_name,
            "webhook_url": webhook_url,
            "timestamp": datetime.now().isoformat(),
            "steps": []
        }
        
        # Step 1: Verificar instância
        print("\n[1/4] Verificando instância...")
        if not self.check_instance(instance_name):
            result["steps"].append({"step": "check_instance", "success": False})
            return result
        result["steps"].append({"step": "check_instance", "success": True})
        
        # Step 2: Obter configuração atual
        print("\n[2/4] Obtendo configuração atual...")
        current = self.get_current_webhook(instance_name)
        result["previous_config"] = current
        print_info(f"URL atual: {current.get('url') or 'Não configurado'}")
        print_info(f"Habilitado: {current.get('enabled', False)}")
        result["steps"].append({"step": "get_current", "success": True, "data": current})
        
        # Step 3: Configurar webhook
        print("\n[3/4] Configurando webhook...")
        print_info(f"Nova URL: {webhook_url}")
        
        if dry_run:
            print_warning("DRY RUN - Nenhuma alteração feita")
            result["steps"].append({"step": "set_webhook", "success": True, "dry_run": True})
        else:
            set_result = self.set_webhook(instance_name, webhook_url)
            if "error" in set_result:
                print_error(f"Erro: {set_result['error']}")
                result["steps"].append({"step": "set_webhook", "success": False, "error": set_result["error"]})
                return result
            
            if set_result.get("status") == 200:
                print_success("Webhook configurado com sucesso!")
                result["steps"].append({"step": "set_webhook", "success": True})
            else:
                print_warning(f"Resposta: {set_result}")
                result["steps"].append({"step": "set_webhook", "success": True, "response": set_result})
        
        # Step 4: Testar webhook
        print("\n[4/4] Testando webhook...")
        if self.test_webhook(webhook_url):
            result["steps"].append({"step": "test_webhook", "success": True})
            result["success"] = True
        else:
            result["steps"].append({"step": "test_webhook", "success": False})
            print_warning("Webhook pode não estar funcionando corretamente")
        
        # Salvar log
        log_file = LOGS_DIR / f"fix_webhook_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False, default=str)
        
        print_header("RESULTADO")
        if result["success"]:
            print_success("Webhook configurado e testado com sucesso!")
        else:
            print_warning("Webhook configurado, mas pode haver problemas")
        
        print_info(f"Log salvo: {log_file}")
        
        return result


def main():
    load_dotenv()
    
    parser = argparse.ArgumentParser(
        description="Configura automaticamente webhook na Evolution API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python fix_webhook.py --instance minha_instancia --webhook-url https://meu-crm.com/webhook
  python fix_webhook.py --instance minha_instancia --dry-run
        """
    )
    
    parser.add_argument("--evo-url", default=os.getenv("EVOLUTION_API_URL"), help="URL da Evolution API")
    parser.add_argument("--evo-key", default=os.getenv("EVOLUTION_API_KEY"), help="API Key da Evolution")
    parser.add_argument("--instance", default=os.getenv("WHATSAPP_INSTANCE_NAME"), help="Nome da instância")
    parser.add_argument("--webhook-url", default=os.getenv("CRM_WEBHOOK_URL"), help="URL do webhook do CRM")
    parser.add_argument("--dry-run", action="store_true", help="Simula sem fazer alterações")
    
    args = parser.parse_args()
    
    if not all([args.evo_url, args.evo_key, args.instance, args.webhook_url]):
        print_error("Parâmetros obrigatórios faltando!")
        print_info("Use --help para ver opções ou configure no .env")
        sys.exit(1)
    
    fixer = WebhookFixer(args.evo_url, args.evo_key)
    result = fixer.fix(args.instance, args.webhook_url, args.dry_run)
    
    return 0 if result["success"] else 1


if __name__ == "__main__":
    sys.exit(main())
