#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Evolution API Checker - Verifica configurações de instâncias e webhooks
Gera relatório detalhado em markdown
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


class EvolutionAPIChecker:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.headers = {
            "Content-Type": "application/json",
            "apikey": api_key
        }
        self.report = []
        self.issues = []
    
    def _request(self, method: str, endpoint: str, data: dict = None) -> dict:
        """Faz requisição à Evolution API"""
        url = f"{self.base_url}/{endpoint}"
        try:
            if method == "GET":
                resp = requests.get(url, headers=self.headers, timeout=15)
            elif method == "POST":
                resp = requests.post(url, headers=self.headers, json=data or {}, timeout=15)
            else:
                return {"error": f"Método {method} não suportado"}
            
            if resp.status_code == 200:
                return resp.json() if resp.text else {}
            else:
                return {"error": f"HTTP {resp.status_code}", "body": resp.text[:200]}
        except Exception as e:
            return {"error": str(e)}
    
    def check_connection(self) -> bool:
        """Testa conexão com a API"""
        print_info("Testando conexão com Evolution API...")
        result = self._request("GET", "instance/fetchInstances")
        if "error" in result:
            print_error(f"Falha na conexão: {result['error']}")
            return False
        print_success("Conexão OK")
        return True
    
    def list_instances(self) -> list:
        """Lista todas as instâncias"""
        print_info("Buscando instâncias...")
        result = self._request("GET", "instance/fetchInstances")
        if "error" in result:
            print_error(f"Erro ao listar instâncias: {result['error']}")
            return []
        
        instances = result if isinstance(result, list) else result.get("instances", [])
        print_success(f"Encontradas {len(instances)} instância(s)")
        return instances
    
    def get_instance_status(self, instance_name: str) -> dict:
        """Obtém status de conexão de uma instância"""
        result = self._request("GET", f"instance/connectionState/{instance_name}")
        return result
    
    def get_webhook_config(self, instance_name: str) -> dict:
        """Obtém configuração de webhook de uma instância"""
        result = self._request("GET", f"webhook/find/{instance_name}")
        return result
    
    def analyze_instance(self, instance: dict) -> dict:
        """Analisa uma instância completa"""
        name = instance.get("name") or instance.get("instanceName") or instance.get("instance", {}).get("instanceName", "unknown")
        
        analysis = {
            "name": name,
            "status": "unknown",
            "webhook_url": None,
            "webhook_events": [],
            "issues": []
        }
        
        print(f"\n{Fore.YELLOW}📱 Analisando: {name}{Style.RESET_ALL}")
        
        # Status da conexão
        status = self.get_instance_status(name)
        if "error" in status:
            analysis["status"] = "error"
            analysis["issues"].append(f"Erro ao obter status: {status['error']}")
            print_error(f"  Status: Erro - {status['error']}")
        else:
            state = status.get("state") or status.get("instance", {}).get("state", "unknown")
            analysis["status"] = state
            if state == "open":
                print_success(f"  Status: Conectado ✓")
            elif state == "close":
                print_warning(f"  Status: Desconectado")
                analysis["issues"].append("Instância desconectada")
            else:
                print_info(f"  Status: {state}")
        
        # Configuração de webhook
        webhook = self.get_webhook_config(name)
        if "error" in webhook:
            analysis["issues"].append(f"Erro ao obter webhook: {webhook['error']}")
            print_warning(f"  Webhook: Erro ao obter configuração")
        else:
            url = webhook.get("url") or webhook.get("webhook", {}).get("url")
            events = webhook.get("events") or webhook.get("webhook", {}).get("events", [])
            enabled = webhook.get("enabled", webhook.get("webhook", {}).get("enabled", False))
            
            analysis["webhook_url"] = url
            analysis["webhook_events"] = events
            analysis["webhook_enabled"] = enabled
            
            if not url:
                print_error(f"  Webhook: NÃO CONFIGURADO ✗")
                analysis["issues"].append("Webhook URL não configurada")
            elif not enabled:
                print_warning(f"  Webhook: Desabilitado")
                print_info(f"    URL: {url}")
                analysis["issues"].append("Webhook desabilitado")
            else:
                print_success(f"  Webhook: Configurado ✓")
                print_info(f"    URL: {url}")
            
            if events:
                print_info(f"    Eventos: {', '.join(events[:5])}...")
                if "messages.upsert" not in events:
                    analysis["issues"].append("Evento 'messages.upsert' não habilitado")
                    print_warning(f"    ⚠ messages.upsert NÃO está nos eventos!")
            else:
                analysis["issues"].append("Nenhum evento de webhook configurado")
                print_warning(f"    ⚠ Nenhum evento configurado!")
        
        return analysis
    
    def generate_report(self, analyses: list) -> str:
        """Gera relatório em markdown"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        report = f"""# Relatório de Diagnóstico - Evolution API

**Gerado em:** {timestamp}  
**URL da API:** {self.base_url}

---

## Resumo

| Instância | Status | Webhook | Issues |
|-----------|--------|---------|--------|
"""
        for a in analyses:
            status_emoji = "🟢" if a["status"] == "open" else "🔴" if a["status"] == "close" else "🟡"
            webhook_emoji = "✅" if a.get("webhook_url") and a.get("webhook_enabled") else "❌"
            issues_count = len(a["issues"])
            report += f"| {a['name']} | {status_emoji} {a['status']} | {webhook_emoji} | {issues_count} |\n"
        
        report += "\n---\n\n## Detalhes por Instância\n\n"
        
        for a in analyses:
            report += f"### 📱 {a['name']}\n\n"
            report += f"- **Status:** {a['status']}\n"
            report += f"- **Webhook URL:** `{a.get('webhook_url') or 'Não configurado'}`\n"
            report += f"- **Webhook Habilitado:** {'Sim' if a.get('webhook_enabled') else 'Não'}\n"
            
            if a.get("webhook_events"):
                report += f"- **Eventos:** {', '.join(a['webhook_events'])}\n"
            
            if a["issues"]:
                report += "\n**⚠️ Problemas Identificados:**\n"
                for issue in a["issues"]:
                    report += f"- {issue}\n"
            else:
                report += "\n**✅ Nenhum problema identificado**\n"
            
            report += "\n---\n\n"
        
        # Seção de ações recomendadas
        all_issues = [issue for a in analyses for issue in a["issues"]]
        if all_issues:
            report += "## 🔧 Ações Recomendadas\n\n"
            if any("não configurada" in i.lower() for i in all_issues):
                report += "1. **Configurar URL do webhook** usando `fix_webhook.py`\n"
            if any("messages.upsert" in i for i in all_issues):
                report += "2. **Habilitar evento messages.upsert** no webhook\n"
            if any("desabilitado" in i.lower() for i in all_issues):
                report += "3. **Ativar webhook** na instância\n"
            if any("desconectada" in i.lower() for i in all_issues):
                report += "4. **Reconectar instância** via painel Evolution\n"
        
        return report
    
    def run(self) -> tuple:
        """Executa verificação completa"""
        print_header("EVOLUTION API CHECKER")
        print_info(f"URL: {self.base_url}")
        
        if not self.check_connection():
            return None, []
        
        instances = self.list_instances()
        if not instances:
            print_warning("Nenhuma instância encontrada")
            return None, []
        
        analyses = []
        for inst in instances:
            analysis = self.analyze_instance(inst)
            analyses.append(analysis)
        
        report = self.generate_report(analyses)
        
        # Salva relatório
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = LOGS_DIR / f"evolution_report_{timestamp}.md"
        with open(report_file, "w", encoding="utf-8") as f:
            f.write(report)
        
        print_header("RELATÓRIO GERADO")
        print_success(f"Arquivo salvo: {report_file}")
        
        # Conta issues
        total_issues = sum(len(a["issues"]) for a in analyses)
        if total_issues > 0:
            print_warning(f"Total de problemas encontrados: {total_issues}")
        else:
            print_success("Nenhum problema encontrado!")
        
        return report, analyses


def main():
    load_dotenv()
    
    parser = argparse.ArgumentParser(description="Verifica configurações da Evolution API")
    parser.add_argument("--url", default=os.getenv("EVOLUTION_API_URL"), help="URL da Evolution API")
    parser.add_argument("--api-key", default=os.getenv("EVOLUTION_API_KEY"), help="API Key")
    
    args = parser.parse_args()
    
    if not args.url or not args.api_key:
        print_error("URL e API Key são obrigatórios!")
        print_info("Use --url e --api-key ou configure no .env")
        sys.exit(1)
    
    checker = EvolutionAPIChecker(args.url, args.api_key)
    report, analyses = checker.run()
    
    if report:
        print("\n" + report)
    
    return 0 if report else 1


if __name__ == "__main__":
    sys.exit(main())
