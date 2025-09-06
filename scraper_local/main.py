#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Oto Parça Panel - Python Scraper Bot
GUI arayüzlü tedarikçi fiyat ve stok bilgisi toplama botu
"""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import requests
import json
import threading
import time
import random
from datetime import datetime
from typing import Dict, Any, Optional
from flask import Flask, request, jsonify
from flask_cors import CORS
import urllib3
import ssl

# Disable SSL warnings for development
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class ScraperBot:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Oto Parça Panel - Scraper Bot")
        self.root.geometry("900x700")
        self.root.resizable(True, True)
        
        # Load configuration
        self.config = self.load_config()
        
        # API Configuration - Use development settings
        self.api_base_url = self.config['development']['api_base_url']
        self.is_running = False
        self.current_request = None
        self.last_request = None
        self.scraper_id = None
        self.request_history = []
        
        # Flask app for receiving requests
        self.flask_app = Flask(__name__)
        CORS(self.flask_app)  # Enable CORS for all routes
        self.setup_flask_routes()
        
        # Setup GUI
        self.setup_gui()
        
        # Start listening for requests (but don't register yet)
        self.start_listening()
        
    def load_config(self):
        """Load configuration from config.json"""
        try:
            with open('config.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return {
                'production': {
                    'api_base_url': 'https://otopanel.isletmemdijitalde.com/api',
                    'ssl_verify': False,
                    'timeout': 30
                },
                'scraper': {
                    'user_agent': 'OtoParcaPanel-Scraper/1.0',
                    'request_delay': {'min': 1, 'max': 3}
                }
            }
        except json.JSONDecodeError as e:
            self.log_message(f"Config dosyası okunamadı: {str(e)}", "ERROR")
            return {}
        
    def setup_flask_routes(self):
        """Setup Flask routes for receiving requests"""
        @self.flask_app.route('/scrape', methods=['POST'])
        def handle_scrape_request():
            try:
                data = request.get_json()
                stock_code = data.get('stockCode')
                supplier = data.get('supplier')
                
                if not stock_code or not supplier:
                    response = jsonify({
                        'success': False,
                        'error': 'Stock code and supplier are required'
                    })
                    response.headers['Content-Type'] = 'application/json'
                    response.headers['Access-Control-Allow-Origin'] = '*'
                    return response, 400
                
                # Process the request and generate demo data
                result = self.generate_demo_data(stock_code, supplier)
                
                # Log the request
                self.log_message(f"Web panelden istek alındı: {supplier} - {stock_code}")
                
                response = jsonify(result)
                response.headers['Content-Type'] = 'application/json'
                response.headers['Access-Control-Allow-Origin'] = '*'
                return response
                
            except Exception as e:
                self.log_message(f"Flask istek hatası: {str(e)}", "ERROR")
                response = jsonify({
                    'success': False,
                    'error': str(e)
                })
                response.headers['Content-Type'] = 'application/json'
                response.headers['Access-Control-Allow-Origin'] = '*'
                return response, 500
                
        @self.flask_app.route('/health', methods=['GET'])
        def health_check():
            response = jsonify({'status': 'running', 'bot_active': self.is_running})
            response.headers['Content-Type'] = 'application/json'
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response
            
    def generate_demo_data(self, stock_code: str, supplier: str) -> Dict[str, Any]:
        """Generate demo data for scraping request"""
        # Simulate processing time
        processing_time = random.uniform(1, 3)
        time.sleep(processing_time)
        
        # Generate realistic demo data
        price = round(random.uniform(100, 5000), 2)
        stock = random.randint(0, 100)
        
        # Create request data
        request_data = {
            'stockCode': stock_code,
            'supplier': supplier,
            'price': price,
            'stock': stock,
            'processingTime': round(processing_time, 2),
            'timestamp': datetime.now()
        }
        
        # Update GUI with current request
        self.root.after(0, lambda: self.update_current_request(request_data))
        
        return {
            'success': True,
            'stockCode': stock_code,
            'supplier': supplier,
            'price': price,
            'stock': stock,
            'isAvailable': stock > 0,
            'scrapedAt': datetime.now().isoformat(),
            'processingTime': round(processing_time, 2)
        }
        
    def update_current_request(self, request_data: Dict[str, Any]):
        """Update GUI with current request info"""
        # Move current to last if exists
        if self.current_request:
            self.last_request = self.current_request.copy()
            self.update_last_request_display()
        
        # Set new current request
        self.current_request = request_data
        
        # Update current request display
        self.current_stock_code.config(text=request_data['stockCode'])
        self.current_supplier.config(text=request_data['supplier'])
        self.current_price.config(text=f"₺{request_data['price']:.2f}")
        self.current_stock_qty.config(text=str(request_data['stock']))
        self.processing_time.config(text=f"{request_data['processingTime']:.2f}s")
        
        # Add to history
        self.request_history.append(request_data)
        if len(self.request_history) > 10:  # Keep only last 10 requests
            self.request_history.pop(0)
        
        # Update total requests counter
        self.total_requests.config(text=str(len(self.request_history)))
        
        # Clear current request after 10 seconds
        self.root.after(10000, self.clear_current_request)
        
    def update_last_request_display(self):
        """Update last request display"""
        if self.last_request:
            self.last_stock_code.config(text=self.last_request['stockCode'])
            self.last_supplier.config(text=self.last_request['supplier'])
            self.last_price.config(text=f"₺{self.last_request['price']:.2f}")
            self.last_stock_qty.config(text=str(self.last_request['stock']))
            self.last_time.config(text=self.last_request['timestamp'].strftime("%H:%M:%S"))
        
    def start_flask_server(self):
        """Start Flask server in a separate thread"""
        port = self.config['development']['scraper_port']
        def run_flask():
            self.flask_app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)
            
        flask_thread = threading.Thread(target=run_flask, daemon=True)
        flask_thread.start()
        self.log_message(f"Flask server başlatıldı (Port: {port})", "SUCCESS")
    
    def setup_gui(self):
        """Setup the GUI components"""
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(5, weight=1)
        
        # Title
        title_label = ttk.Label(main_frame, text="Oto Parça Panel - Scraper Bot", 
                               font=('Arial', 16, 'bold'))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # Status frame
        status_frame = ttk.LabelFrame(main_frame, text="Bot Durumu", padding="10")
        status_frame.grid(row=1, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        status_frame.columnconfigure(1, weight=1)
        
        # Status indicators
        ttk.Label(status_frame, text="Durum:").grid(row=0, column=0, sticky=tk.W)
        self.status_label = ttk.Label(status_frame, text="Hazır", foreground="green")
        self.status_label.grid(row=0, column=1, sticky=tk.W, padx=(10, 0))
        
        ttk.Label(status_frame, text="API Bağlantısı:").grid(row=1, column=0, sticky=tk.W)
        self.api_status_label = ttk.Label(status_frame, text="Bağlanıyor...", foreground="orange")
        self.api_status_label.grid(row=1, column=1, sticky=tk.W, padx=(10, 0))
        
        # Control frame
        control_frame = ttk.LabelFrame(main_frame, text="Kontroller", padding="10")
        control_frame.grid(row=2, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # Control buttons
        self.start_button = ttk.Button(control_frame, text="Bot'u Başlat", 
                                      command=self.start_bot)
        self.start_button.grid(row=0, column=0, padx=(0, 10))
        
        self.stop_button = ttk.Button(control_frame, text="Bot'u Durdur", 
                                     command=self.stop_bot, state="disabled")
        self.stop_button.grid(row=0, column=1, padx=(0, 10))
        
        self.test_button = ttk.Button(control_frame, text="Test İsteği Gönder", 
                                     command=self.send_test_request)
        self.test_button.grid(row=0, column=2)
        
        # Request info frames
        request_container = ttk.Frame(main_frame)
        request_container.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        request_container.columnconfigure(0, weight=1)
        request_container.columnconfigure(1, weight=1)
        
        # Current request frame
        current_frame = ttk.LabelFrame(request_container, text="Mevcut İstek", padding="10")
        current_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), padx=(0, 5))
        current_frame.columnconfigure(1, weight=1)
        
        ttk.Label(current_frame, text="Stok Kodu:").grid(row=0, column=0, sticky=tk.W)
        self.current_stock_code = ttk.Label(current_frame, text="-")
        self.current_stock_code.grid(row=0, column=1, sticky=tk.W, padx=(10, 0))
        
        ttk.Label(current_frame, text="Tedarikçi:").grid(row=1, column=0, sticky=tk.W)
        self.current_supplier = ttk.Label(current_frame, text="-")
        self.current_supplier.grid(row=1, column=1, sticky=tk.W, padx=(10, 0))
        
        ttk.Label(current_frame, text="Fiyat:").grid(row=2, column=0, sticky=tk.W)
        self.current_price = ttk.Label(current_frame, text="-")
        self.current_price.grid(row=2, column=1, sticky=tk.W, padx=(10, 0))
        
        ttk.Label(current_frame, text="Stok:").grid(row=3, column=0, sticky=tk.W)
        self.current_stock_qty = ttk.Label(current_frame, text="-")
        self.current_stock_qty.grid(row=3, column=1, sticky=tk.W, padx=(10, 0))
        
        ttk.Label(current_frame, text="İşlem Zamanı:").grid(row=4, column=0, sticky=tk.W)
        self.processing_time = ttk.Label(current_frame, text="-")
        self.processing_time.grid(row=4, column=1, sticky=tk.W, padx=(10, 0))
        
        # Last request frame
        last_frame = ttk.LabelFrame(request_container, text="Son İstek", padding="10")
        last_frame.grid(row=0, column=1, sticky=(tk.W, tk.E, tk.N, tk.S), padx=(5, 0))
        last_frame.columnconfigure(1, weight=1)
        
        ttk.Label(last_frame, text="Stok Kodu:").grid(row=0, column=0, sticky=tk.W)
        self.last_stock_code = ttk.Label(last_frame, text="-")
        self.last_stock_code.grid(row=0, column=1, sticky=tk.W, padx=(10, 0))
        
        ttk.Label(last_frame, text="Tedarikçi:").grid(row=1, column=0, sticky=tk.W)
        self.last_supplier = ttk.Label(last_frame, text="-")
        self.last_supplier.grid(row=1, column=1, sticky=tk.W, padx=(10, 0))
        
        ttk.Label(last_frame, text="Fiyat:").grid(row=2, column=0, sticky=tk.W)
        self.last_price = ttk.Label(last_frame, text="-")
        self.last_price.grid(row=2, column=1, sticky=tk.W, padx=(10, 0))
        
        ttk.Label(last_frame, text="Stok:").grid(row=3, column=0, sticky=tk.W)
        self.last_stock_qty = ttk.Label(last_frame, text="-")
        self.last_stock_qty.grid(row=3, column=1, sticky=tk.W, padx=(10, 0))
        
        ttk.Label(last_frame, text="Zaman:").grid(row=4, column=0, sticky=tk.W)
        self.last_time = ttk.Label(last_frame, text="-")
        self.last_time.grid(row=4, column=1, sticky=tk.W, padx=(10, 0))
        
        # Statistics frame
        stats_frame = ttk.LabelFrame(main_frame, text="İstatistikler", padding="10")
        stats_frame.grid(row=4, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        
        ttk.Label(stats_frame, text="Toplam İstek:").grid(row=0, column=0, sticky=tk.W)
        self.total_requests = ttk.Label(stats_frame, text="0")
        self.total_requests.grid(row=0, column=1, sticky=tk.W, padx=(10, 0))
        
        ttk.Label(stats_frame, text="Scraper ID:").grid(row=0, column=2, sticky=tk.W, padx=(20, 0))
        self.scraper_id_label = ttk.Label(stats_frame, text="-")
        self.scraper_id_label.grid(row=0, column=3, sticky=tk.W, padx=(10, 0))
        
        # Log frame
        log_frame = ttk.LabelFrame(main_frame, text="İşlem Logları", padding="10")
        log_frame.grid(row=5, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        
        # Log text area
        self.log_text = scrolledtext.ScrolledText(log_frame, height=12, width=80)
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Clear log button
        clear_button = ttk.Button(log_frame, text="Logları Temizle", 
                                 command=self.clear_logs)
        clear_button.grid(row=1, column=0, pady=(10, 0))
    
    def log_message(self, message: str, level: str = "INFO"):
        """Add a message to the log"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {level}: {message}\n"
        
        self.log_text.insert(tk.END, log_entry)
        self.log_text.see(tk.END)
        
        # Color coding
        if level == "ERROR":
            self.log_text.tag_add("error", f"end-{len(log_entry)}c", "end-1c")
            self.log_text.tag_config("error", foreground="red")
        elif level == "SUCCESS":
            self.log_text.tag_add("success", f"end-{len(log_entry)}c", "end-1c")
            self.log_text.tag_config("success", foreground="green")
        elif level == "WARNING":
            self.log_text.tag_add("warning", f"end-{len(log_entry)}c", "end-1c")
            self.log_text.tag_config("warning", foreground="orange")
    
    def clear_logs(self):
        """Clear the log text area"""
        self.log_text.delete(1.0, tk.END)
        self.log_message("Loglar temizlendi")
    
    def start_bot(self):
        """Start the scraper bot"""
        self.is_running = True
        self.start_button.config(state="disabled")
        self.stop_button.config(state="normal")
        self.status_label.config(text="Çalışıyor", foreground="green")
        
        self.log_message("Scraper bot başlatıldı", "SUCCESS")
        
        # Register with panel
        if self.register_with_panel():
            # Start heartbeat thread
            self.start_heartbeat_thread()
        
        # Start Flask server
        self.start_flask_server()
        
        # Start listening thread
        threading.Thread(target=self.listen_for_requests, daemon=True).start()
    
    def stop_bot(self):
        """Stop the scraper bot"""
        self.is_running = False
        self.start_button.config(state="normal")
        self.stop_button.config(state="disabled")
        self.status_label.config(text="Durduruldu", foreground="red")
        
        self.log_message("Scraper bot durduruldu", "WARNING")
    
    def start_listening(self):
        """Start listening for API connectivity"""
        threading.Thread(target=self.check_api_connection, daemon=True).start()
    
    def check_api_connection(self):
        """Check API connection status"""
        while True:
            try:
                response = requests.get(
                    f"{self.api_base_url}/scraper/health", 
                    timeout=10,
                    verify=False,  # Disable SSL verification for self-signed certificates
                    headers={
                        'User-Agent': 'OtoParcaPanel-Scraper/1.0',
                        'Accept': 'application/json'
                    }
                )
                if response.status_code == 200:
                    self.api_status_label.config(text="Bağlı", foreground="green")
                else:
                    self.api_status_label.config(text="Hata", foreground="red")
                    self.log_message(f"API bağlantı hatası: {response.status_code}", "ERROR")
            except requests.exceptions.RequestException as e:
                self.api_status_label.config(text="Bağlantı Yok", foreground="red")
                self.log_message(f"API bağlantı hatası: {str(e)}", "ERROR")
            
            time.sleep(30)  # Check every 30 seconds
    
    def listen_for_requests(self):
        """Listen for incoming scraper requests"""
        self.log_message("İstek dinleme başlatıldı")
        
        while self.is_running:
            try:
                # Wait for real requests from web panel
                time.sleep(2)
                    
            except Exception as e:
                self.log_message(f"İstek dinleme hatası: {str(e)}", "ERROR")
                time.sleep(5)
    
    def clear_current_request(self):
        """Clear current request information"""
        self.current_stock_code.config(text="-")
        self.current_supplier.config(text="-")
        self.current_price.config(text="-")
        self.current_stock_qty.config(text="-")
        self.processing_time.config(text="-")
        self.current_request = None
    
    def send_test_request(self):
        """Send a test request"""
        if not self.is_running:
            messagebox.showwarning("Uyarı", "Önce bot'u başlatın!")
            return
        
        # Simulate a test request
        test_data = {
            'stockCode': 'TEST123',
            'supplier': 'Dinamik',
            'price': 299.99,
            'stock': 15,
            'processingTime': 1.5,
            'timestamp': datetime.now()
        }
        
        self.log_message("Test isteği simüle ediliyor...", "INFO")
        self.update_current_request(test_data)
    
    def get_local_ip(self):
        """Get local IP address"""
        try:
            import socket
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "127.0.0.1"
    
    def register_with_panel(self):
        """Register this scraper with the web panel"""
        try:
            import socket
            local_ip = self.get_local_ip()
            scraper_port = self.config['development']['scraper_port']
            registration_data = {
                "name": f"Scraper-{socket.gethostname()}",
                "ipAddress": local_ip,
                "port": scraper_port,
                "capabilities": ["dinamik", "basbug", "dogus"]
            }
            
            response = requests.post(
                f"{self.api_base_url}/scraper/register",
                json=registration_data,
                timeout=10,
                verify=False
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.scraper_id = data.get('scraperId')
                self.scraper_id_label.config(text=self.scraper_id[:20] + "..." if len(self.scraper_id) > 20 else self.scraper_id)
                self.log_message(f"Panel'e başarıyla kaydoldu: {self.scraper_id}", "SUCCESS")
                return True
            else:
                self.log_message(f"Kayıt hatası: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log_message(f"Kayıt hatası: {str(e)}", "ERROR")
            return False
    
    def send_heartbeat(self):
        """Send heartbeat to maintain registration"""
        if hasattr(self, 'scraper_id') and self.scraper_id:
            try:
                response = requests.post(
                    f"{self.api_base_url}/scraper/heartbeat/{self.scraper_id}",
                    timeout=5,
                    verify=False
                )
                return response.status_code == 200
            except:
                return False
        return False
    
    def start_heartbeat_thread(self):
        """Start heartbeat thread"""
        def heartbeat_loop():
            while self.is_running:
                self.send_heartbeat()
                time.sleep(30)  # Send heartbeat every 30 seconds
        
        threading.Thread(target=heartbeat_loop, daemon=True).start()

    def run(self):
        """Run the application"""
        self.log_message("Scraper Bot başlatıldı")
        self.log_message(f"API URL: {self.api_base_url}")
        self.log_message("API Bağlantısı kontrol ediliyor...")
        
        # Don't register on startup, only when bot is started
        
        try:
            self.root.mainloop()
        except KeyboardInterrupt:
            self.log_message("Uygulama kapatılıyor...", "WARNING")
        except Exception as e:
            self.log_message(f"Uygulama hatası: {str(e)}", "ERROR")

if __name__ == "__main__":
    # Create and run the scraper bot
    bot = ScraperBot()
    bot.run()