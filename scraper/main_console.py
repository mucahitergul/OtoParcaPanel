#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Oto Parça Panel - Python Scraper Bot (Console Version)
Console-based tedarikçi fiyat ve stok bilgisi toplama botu
"""

import requests
import json
import threading
import time
import random
from datetime import datetime
from typing import Dict, Any, Optional
from flask import Flask, request, jsonify
from flask_cors import CORS
import signal
import sys

class ConsoleScraperBot:
    def __init__(self):
        print("Oto Parça Panel - Console Scraper Bot")
        print("=====================================")
        
        # API Configuration
        self.api_base_url = "http://localhost:3001/api/scraper"
        self.is_running = False
        
        # Flask app for receiving requests
        self.flask_app = Flask(__name__)
        CORS(self.flask_app)  # Enable CORS for all routes
        self.setup_flask_routes()
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
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
        
        self.log_message(f"Demo veri üretildi: {supplier} - {stock_code} | Fiyat: ₺{price}, Stok: {stock}")
        
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
        
    def log_message(self, message: str, level: str = "INFO"):
        """Add a message to the console log"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def start_flask_server(self):
        """Start Flask server in a separate thread"""
        def run_flask():
            try:
                self.flask_app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
            except Exception as e:
                self.log_message(f"Flask server hatası: {str(e)}", "ERROR")
                
        flask_thread = threading.Thread(target=run_flask, daemon=True)
        flask_thread.start()
        self.log_message("Flask server başlatıldı (Port: 5000)", "SUCCESS")
    
    def start_bot(self):
        """Start the scraper bot"""
        self.is_running = True
        self.log_message("Scraper bot başlatıldı", "SUCCESS")
        
        # Start Flask server
        self.start_flask_server()
        
        # Start API connection check
        threading.Thread(target=self.check_api_connection, daemon=True).start()
        
    def stop_bot(self):
        """Stop the scraper bot"""
        self.is_running = False
        self.log_message("Scraper bot durduruldu", "WARNING")
    
    def check_api_connection(self):
        """Check API connection status"""
        while self.is_running:
            try:
                response = requests.get(f"{self.api_base_url}/health", timeout=5)
                if response.status_code == 200:
                    # Only log once when connection is established
                    pass
                else:
                    self.log_message("Backend API bağlantı hatası", "WARNING")
            except requests.exceptions.RequestException:
                # Only log connection issues occasionally
                pass
            
            time.sleep(30)  # Check every 30 seconds
    
    def signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        self.log_message("Kapatma sinyali alındı, bot durduruluyor...", "WARNING")
        self.stop_bot()
        sys.exit(0)
        
    def run(self):
        """Run the console application"""
        self.log_message("Console Scraper Bot başlatıldı")
        self.start_bot()
        
        try:
            # Keep the main thread alive
            while True:
                time.sleep(1)
                
        except KeyboardInterrupt:
            self.log_message("Ctrl+C ile durduruldu", "WARNING")
            self.stop_bot()
        except Exception as e:
            self.log_message(f"Uygulama hatası: {str(e)}", "ERROR")
            self.stop_bot()

if __name__ == "__main__":
    # Create and run the console scraper bot
    bot = ConsoleScraperBot()
    bot.run()