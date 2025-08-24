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

class ScraperBot:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Oto Parça Panel - Scraper Bot")
        self.root.geometry("800x600")
        self.root.resizable(True, True)
        
        # API Configuration
        self.api_base_url = "http://localhost:3001/api/scraper"
        self.is_running = False
        self.current_request = None
        
        # Flask app for receiving requests
        self.flask_app = Flask(__name__)
        CORS(self.flask_app)  # Enable CORS for all routes
        self.setup_flask_routes()
        
        # Setup GUI
        self.setup_gui()
        
        # Start listening for requests
        self.start_listening()
        
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
        
        # Update GUI with current request
        self.root.after(0, lambda: self.update_current_request(stock_code, supplier, processing_time))
        
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
        
    def update_current_request(self, stock_code: str, supplier: str, processing_time: float):
        """Update GUI with current request info"""
        self.current_stock_code.config(text=stock_code)
        self.current_supplier.config(text=supplier)
        self.processing_time.config(text=f"{processing_time:.2f}s")
        
        # Clear after 5 seconds
        self.root.after(5000, self.clear_current_request)
        
    def start_flask_server(self):
        """Start Flask server in a separate thread"""
        def run_flask():
            self.flask_app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
            
        flask_thread = threading.Thread(target=run_flask, daemon=True)
        flask_thread.start()
        self.log_message("Flask server başlatıldı (Port: 5000)", "SUCCESS")
    
    def setup_gui(self):
        """Setup the GUI components"""
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(4, weight=1)
        
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
        
        # Request info frame
        request_frame = ttk.LabelFrame(main_frame, text="Mevcut İstek", padding="10")
        request_frame.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        request_frame.columnconfigure(1, weight=1)
        
        ttk.Label(request_frame, text="Stok Kodu:").grid(row=0, column=0, sticky=tk.W)
        self.current_stock_code = ttk.Label(request_frame, text="-")
        self.current_stock_code.grid(row=0, column=1, sticky=tk.W, padx=(10, 0))
        
        ttk.Label(request_frame, text="Tedarikçi:").grid(row=1, column=0, sticky=tk.W)
        self.current_supplier = ttk.Label(request_frame, text="-")
        self.current_supplier.grid(row=1, column=1, sticky=tk.W, padx=(10, 0))
        
        ttk.Label(request_frame, text="İşlem Zamanı:").grid(row=2, column=0, sticky=tk.W)
        self.processing_time = ttk.Label(request_frame, text="-")
        self.processing_time.grid(row=2, column=1, sticky=tk.W, padx=(10, 0))
        
        # Log frame
        log_frame = ttk.LabelFrame(main_frame, text="İşlem Logları", padding="10")
        log_frame.grid(row=4, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        
        # Log text area
        self.log_text = scrolledtext.ScrolledText(log_frame, height=15, width=80)
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
                response = requests.get(f"{self.api_base_url}/health", timeout=5)
                if response.status_code == 200:
                    self.api_status_label.config(text="Bağlı", foreground="green")
                else:
                    self.api_status_label.config(text="Hata", foreground="red")
            except requests.exceptions.RequestException:
                self.api_status_label.config(text="Bağlantı Yok", foreground="red")
            
            time.sleep(10)  # Check every 10 seconds
    
    def listen_for_requests(self):
        """Listen for incoming scraper requests"""
        self.log_message("İstek dinleme başlatıldı")
        
        while self.is_running:
            try:
                # Wait for real requests from web panel
                # No more automatic test data generation
                time.sleep(2)
                    
            except Exception as e:
                self.log_message(f"İstek dinleme hatası: {str(e)}", "ERROR")
                time.sleep(5)
    
    def simulate_request(self):
        """Simulate an incoming scraper request"""
        suppliers = ["Dinamik", "Başbuğ", "Doğuş"]
        stock_codes = ["ABC123", "DEF456", "GHI789", "JKL012", "MNO345"]
        
        supplier = random.choice(suppliers)
        stock_code = random.choice(stock_codes)
        
        self.process_scraper_request({
            "stok_kodu": stock_code,
            "supplier": supplier,
            "product_id": random.randint(1, 100)
        })
    
    def process_scraper_request(self, request_data: Dict[str, Any]):
        """Process a scraper request"""
        start_time = time.time()
        
        stok_kodu = request_data.get("stok_kodu")
        supplier = request_data.get("supplier")
        product_id = request_data.get("product_id")
        
        # Update GUI
        self.current_stock_code.config(text=stok_kodu)
        self.current_supplier.config(text=supplier)
        
        self.log_message(f"İstek alındı: {supplier} - {stok_kodu}")
        
        try:
            # Simulate scraping process
            self.log_message(f"{supplier} sitesine bağlanılıyor...")
            time.sleep(random.uniform(1, 3))  # Simulate network delay
            
            # Generate mock data
            mock_price = round(random.uniform(50, 500), 2)
            mock_stock = random.randint(0, 100)
            mock_availability = mock_stock > 0
            
            self.log_message(f"Veri çekildi: Fiyat ₺{mock_price}, Stok {mock_stock}")
            
            # Prepare response data
            response_data = {
                "stok_kodu": stok_kodu,
                "supplier": supplier,
                "price": mock_price,
                "stock": mock_stock,
                "is_available": mock_availability,
                "scraped_at": datetime.now().isoformat(),
                "processing_time": round(time.time() - start_time, 2)
            }
            
            # Send data back to API
            self.send_scraped_data(response_data)
            
            processing_time = round(time.time() - start_time, 2)
            self.processing_time.config(text=f"{processing_time}s")
            
            self.log_message(f"İstek tamamlandı ({processing_time}s)", "SUCCESS")
            
        except Exception as e:
            self.log_message(f"Scraping hatası: {str(e)}", "ERROR")
        finally:
            # Clear current request info after a delay
            self.root.after(3000, self.clear_current_request)
    
    def send_scraped_data(self, data: Dict[str, Any]):
        """Send scraped data back to the API"""
        try:
            # In a real implementation, this would send data to a webhook or API endpoint
            self.log_message(f"Veri gönderiliyor: {data['supplier']} - ₺{data['price']}")
            
            # Simulate API call
            time.sleep(0.5)
            
            self.log_message("Veri başarıyla gönderildi", "SUCCESS")
            
        except Exception as e:
            self.log_message(f"Veri gönderme hatası: {str(e)}", "ERROR")
    
    def clear_current_request(self):
        """Clear current request information"""
        self.current_stock_code.config(text="-")
        self.current_supplier.config(text="-")
        self.processing_time.config(text="-")
    
    def send_test_request(self):
        """Send a test request"""
        if not self.is_running:
            messagebox.showwarning("Uyarı", "Önce bot'u başlatın!")
            return
        
        test_data = {
            "stok_kodu": "TEST123",
            "supplier": "Dinamik",
            "product_id": 999
        }
        
        self.log_message("Test isteği gönderiliyor...", "INFO")
        threading.Thread(target=self.process_scraper_request, args=(test_data,), daemon=True).start()
    
    def run(self):
        """Run the application"""
        self.log_message("Scraper Bot başlatıldı")
        self.log_message("API Bağlantısı kontrol ediliyor...")
        
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