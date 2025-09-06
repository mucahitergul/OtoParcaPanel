#!/usr/bin/env python3
# dogus_scraper.py - Doğuş Otoparca Scraper Bot

import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import json
import threading
import time
import random
import re
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
try:
    import undetected_chromedriver as uc
    from selenium.webdriver.common.by import By
    from selenium.webdriver.common.keys import Keys
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    print("Selenium kütüphaneleri bulunamadı. Demo mod aktif.")

class DogusScraperBot:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Doğuş Scraper Bot")
        self.root.geometry("900x700")
        self.root.resizable(True, True)
        
        # Load configuration
        self.config = self.load_config()
        
        # API Configuration
        self.port = 5003  # Doğuş için port 5003
        self.is_running = False
        self.current_request = None
        self.last_request = None
        self.request_history = []
        
        # CAPTCHA Configuration - Manuel mod
        self.captcha_enabled = True
        self.captcha_waiting = False
        self.captcha_resolved = False
        
        # Selenium Configuration
        self.driver = None
        self.wait = None
        self.is_logged_in = False
        self.login_credentials = {
            'customercode': '120.06.02.011.00',
            'username': 'cihan',
            'password': 'cihan06'
        }
        
        # Flask app for receiving requests
        self.flask_app = Flask(__name__)
        CORS(self.flask_app)  # Enable CORS for all routes
        self.setup_flask_routes()
        
        # Setup GUI
        self.setup_gui()
        
        # Start listening for requests
        self.start_listening()
        
    def load_config(self):
        """Load configuration from config.json"""
        try:
            config_path = os.path.join(os.path.dirname(__file__), 'config.json')
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            # Default configuration
            return {
                "development": {
                    "api_base_url": "http://localhost:3001/api",
                    "scraper_port": 5003
                },
                "production": {
                    "api_base_url": "http://otoparca.isletmemdijitalde.com/api",
                    "scraper_port": 5003
                }
            }
    
    def setup_browser(self):
        """Setup Chrome browser with undetected-chromedriver"""
        if not SELENIUM_AVAILABLE:
            self.log_message("Selenium kütüphaneleri yüklü değil. Demo mod aktif.", "WARNING")
            return False
            
        try:
            self.log_message("Tarayıcı başlatılıyor...")
            
            options = uc.ChromeOptions()
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--ignore-certificate-errors")
            options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            options.add_argument("--start-maximized")
            options.add_argument("--disable-extensions")
            
            self.driver = uc.Chrome(options=options)
            screen_width = 1920 * 0.75
            screen_height = 1080 * 0.75
            self.driver.set_window_size(int(screen_width), int(screen_height))
            self.wait = WebDriverWait(self.driver, 10)
            
            self.driver.execute_script("document.body.style.zoom='75%'")
            self.log_message("Tarayıcı başarıyla başlatıldı")
            
            return True
        except Exception as e:
            self.log_message(f"Tarayıcı başlatma hatası: {str(e)}", "ERROR")
            return False
    
    def login_to_dogus(self):
        """Login to Doğuş website"""
        if not self.driver:
            self.log_message("Tarayıcı başlatılmamış", "ERROR")
            return False
            
        try:
            self.log_message("Doğuş sitesine giriş yapılıyor...")
            
            # Navigate to login page
            self.driver.get("https://online.dogusotoparcalari.com/web/login")
            time.sleep(2)
            
            # Fill login form
            customer_code_input = self.wait.until(
                EC.element_to_be_clickable((By.NAME, "customercode"))
            )
            customer_code_input.send_keys(self.login_credentials['customercode'])
            
            username_input = self.driver.find_element(By.NAME, "username")
            username_input.send_keys(self.login_credentials['username'])
            
            password_input = self.driver.find_element(By.NAME, "password")
            password_input.send_keys(self.login_credentials['password'])
            
            # Submit login form
            login_button = self.driver.find_element(By.CSS_SELECTOR, "button.loginBtn[type=submit]")
            login_button.click()
            
            # CAPTCHA kontrolü
            if not self.handle_captcha_modal():
                self.log_message("CAPTCHA çözülemedi, giriş başarısız", "ERROR")
                self.is_logged_in = False
                return False
            
            # Check for login errors
            try:
                WebDriverWait(self.driver, 5).until(
                    EC.visibility_of_element_located((By.CSS_SELECTOR, "div.swal-text"))
                )
                self.log_message("Giriş başarısız! Manuel giriş gerekiyor.", "ERROR")
                self.is_logged_in = False
                return False
            except TimeoutException:
                self.log_message("Doğuş sitesine başarıyla giriş yapıldı")
                self.is_logged_in = True
                return True
                
        except Exception as e:
            self.log_message(f"Giriş hatası: {str(e)}", "ERROR")
            self.is_logged_in = False
            return False
    
    def search_product(self, stock_code):
        """Search for a product by stock code"""
        if not self.driver or not self.is_logged_in:
            self.log_message("Tarayıcı veya giriş hazır değil", "ERROR")
            return False
            
        try:
            self.log_message(f"Ürün aranıyor: {stock_code}")
            
            # Find search input
            search_input = self.wait.until(
                EC.element_to_be_clickable((By.ID, "searchInput"))
            )
            self.log_message("Arama kutusu bulundu", "DEBUG")
            
            # Clear and enter stock code
            search_input.clear()
            search_input.send_keys(stock_code)
            self.log_message(f"Ürün kodu girildi: {stock_code}", "DEBUG")
            
            # Click search button
            search_button = self.driver.find_element(
                By.CSS_SELECTOR, "img[src='assets/icon/SearchBar1.png']"
            )
            search_button.click()
            self.log_message("Arama butonu tıklandı", "DEBUG")
            
            # CAPTCHA kontrolü
            if not self.handle_captcha_modal():
                self.log_message("CAPTCHA çözülemedi, arama başarısız", "ERROR")
                return False
            
            # Wait for results
            time.sleep(3)
            self.log_message("Arama sonuçları bekleniyor", "DEBUG")
            
            return True
            
        except Exception as e:
            self.log_message(f"Arama hatası: {str(e)}", "ERROR")
            return False
    
    def extract_product_data(self, stock_code):
        """Extract product data from the table"""
        if not self.driver:
            self.log_message("Tarayıcı hazır değil", "ERROR")
            return None
            
        try:
            self.log_message(f"Veri çıkarma başlıyor: {stock_code}", "DEBUG")
            
            # Wait for table to load - try multiple selectors
            table = None
            try:
                table = self.wait.until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "datatable-body"))
                )
                self.log_message("Tablo bulundu (datatable-body)", "DEBUG")
            except:
                try:
                    table = self.wait.until(
                        EC.presence_of_element_located((By.TAG_NAME, "table"))
                    )
                    self.log_message("Tablo bulundu (table)", "DEBUG")
                except:
                    try:
                        table = self.wait.until(
                            EC.presence_of_element_located((By.CSS_SELECTOR, "tbody"))
                        )
                        self.log_message("Tablo bulundu (tbody)", "DEBUG")
                    except:
                        # Try to find any container with rows
                        table = self.driver
                        self.log_message("Tablo bulunamadı, driver kullanılıyor", "DEBUG")
            
            # Find product rows - try multiple selectors
            rows = table.find_elements(By.CSS_SELECTOR, "datatable-body-row")
            if not rows:
                # Try alternative selector
                rows = table.find_elements(By.CSS_SELECTOR, "tr")
            if not rows:
                # Try even more general selector
                rows = table.find_elements(By.TAG_NAME, "tr")
            
            self.log_message(f"Bulunan satır sayısı: {len(rows)}", "DEBUG")
            
            # Use all rows - don't filter by noStockText as it may contain valid products
            valid_rows = rows
            
            self.log_message(f"Geçerli satır sayısı: {len(valid_rows)}", "DEBUG")
            rows = valid_rows
            
            if not rows:
                self.log_message(f"Ürün bulunamadı: {stock_code}")
                return {
                    'success': False,
                    'stockCode': stock_code,
                    'supplier': 'dogus',
                    'price': 0,
                    'stock': 0,
                    'isAvailable': False,
                    'foundAtSupplier': False,
                    'message': 'Bu Tedarikçide Yok',
                    'timestamp': datetime.now().isoformat(),
                    'source': 'Doğuş Real Scraper'
                }
            
            # Get first row data
            first_row = rows[0]
            cells = first_row.find_elements(By.CSS_SELECTOR, "datatable-body-cell")
            
            # Extract stock code from first cell
            found_stock_code = cells[0].text.strip()
            
            # Extract product name from 4th cell (index 3)
            product_name = cells[3].text.strip()
            
            # Extract price from KDV'li Maliyet column (index 12)
            price_text = cells[12].text.strip().replace("₺", "").replace(".", "").replace(",", ".")
            try:
                price = float(price_text) if price_text else 0.0
            except ValueError:
                price = 0.0
            
            # Extract stock from warehouse columns (indices 5-8: Merkez, 34, 22-1, 22-2)
            total_stock = 0
            warehouse_columns = [5, 6, 7, 8]  # Merkez, 34, 22-1, 22-2
            
            for col_index in warehouse_columns:
                try:
                    warehouse_cell = cells[col_index]
                    
                    # Check for direct stock number
                    stock_amount_divs = warehouse_cell.find_elements(
                        By.CSS_SELECTOR, "div.warehouseAmount, div.warehouseAmountGreen"
                    )
                    
                    if stock_amount_divs:
                        stock_text = stock_amount_divs[0].text.strip()
                        if stock_text.isdigit():
                            total_stock += int(stock_text)
                    else:
                        # Single method for icon detection based on example table structure
                        warehouse_stock = 0
                        
                        # Find all images in warehouse cell
                        all_imgs = warehouse_cell.find_elements(By.TAG_NAME, "img")
                        
                        for img in all_imgs:
                            try:
                                src = img.get_attribute("src") or ""
                                self.log_message(f"Depo {col_index} - İkon kontrolü: src='{src}'", "DEBUG")
                                
                                # Check for NotAvailable.png first (exact match from example table)
                                if "NotAvailable.png" in src:
                                    warehouse_stock = 0
                                    self.log_message(f"Depo {col_index} - NotAvailable ikon bulundu: {src} -> 0 stok", "DEBUG")
                                    break
                                    
                                # Check for Available.png (but not NotAvailable.png)
                                elif "Available.png" in src and "NotAvailable.png" not in src:
                                    warehouse_stock = 1
                                    self.log_message(f"Depo {col_index} - Available ikon bulundu: {src} -> 1 stok", "DEBUG")
                                    break
                                    
                            except Exception as img_error:
                                self.log_message(f"İmaj okuma hatası: {str(img_error)}", "WARNING")
                                continue
                        
                        # If no icon found, default to 0 stock
                        if warehouse_stock == 0 and all_imgs:
                            self.log_message(f"Depo {col_index} - İkon algılanamadı, varsayılan: 0 stok", "DEBUG")
                        
                        total_stock += warehouse_stock
                            
                except Exception as e:
                    self.log_message(f"Stok sütunu okuma hatası (sütun {col_index}): {str(e)}", "WARNING")
                    continue
            
            # Ürün tabloda bulundu, fiyat varsa mevcut sayılır (stok 0 olsa bile)
            is_available = price > 0
            
            result = {
                'success': True,
                'stockCode': stock_code,
                'foundStockCode': found_stock_code,
                'productName': product_name,
                'supplier': 'dogus',
                'price': round(price, 2),
                'stock': total_stock,
                'isAvailable': is_available,
                'foundAtSupplier': True,
                'timestamp': datetime.now().isoformat(),
                'source': 'Doğuş Real Scraper'
            }
            
            self.log_message(f"Ürün bulundu - Stok: {found_stock_code}, Fiyat: {price}₺, Stok: {total_stock}")
            return result
            
        except Exception as e:
            self.log_message(f"Veri çıkarma hatası: {str(e)}", "ERROR")
            return {
                'success': False,
                'stockCode': stock_code,
                'supplier': 'dogus',
                'error': str(e),
                'timestamp': datetime.now().isoformat(),
                'source': 'Doğuş Real Scraper'
            }
    
    def scrape_product(self, stock_code):
        """Main scraping function"""
        if not SELENIUM_AVAILABLE:
            return self.generate_demo_data(stock_code, 'dogus')
            
        try:
            # Check if browser is ready
            if not self.driver or not self.is_logged_in:
                if not self.setup_browser():
                    raise Exception("Tarayıcı başlatılamadı")
                
                if not self.login_to_dogus():
                    raise Exception("Giriş yapılamadı")
            
            # Search for product
            if not self.search_product(stock_code):
                raise Exception("Ürün araması başarısız")
            
            # Extract product data
            result = self.extract_product_data(stock_code)
            
            return result
            
        except Exception as e:
            error_message = str(e)
            self.log_message(f"Scraping hatası: {error_message}", "ERROR")
            
            # CAPTCHA durumunu özel olarak handle et
            if "CAPTCHA çözülemedi" in error_message or "arama başarısız" in error_message:
                return {
                    'success': False,
                    'stockCode': stock_code,
                    'supplier': 'dogus',
                    'error': error_message,
                    'requiresManualIntervention': True,
                    'message': 'CAPTCHA doğrulaması gerekiyor',
                    'timestamp': datetime.now().isoformat(),
                    'source': 'Doğuş Real Scraper'
                }
            
            return {
                'success': False,
                'stockCode': stock_code,
                'supplier': 'dogus',
                'error': error_message,
                'timestamp': datetime.now().isoformat(),
                'source': 'Doğuş Real Scraper'
            }
    
    def generate_demo_data(self, stock_code, supplier):
        """Generate demo data for testing when Selenium is not available"""
        # Simulate processing time
        time.sleep(random.uniform(0.5, 2.0))
        
        # Generate realistic demo data for Doğuş
        base_price = random.uniform(75, 750)
        stock_amount = random.randint(0, 150)
        
        # Sometimes simulate out of stock or unavailable
        is_available = random.choice([True, True, True, False])  # 75% available
        if not is_available:
            stock_amount = 0
            base_price = 0
        
        result = {
            'success': True,
            'stockCode': stock_code,
            'supplier': supplier,
            'price': round(base_price, 2),
            'stock': stock_amount,
            'isAvailable': is_available,
            'foundAtSupplier': is_available,
            'timestamp': datetime.now().isoformat(),
            'source': 'Doğuş Demo Scraper (Selenium Yok)'
        }
        
        return result
    
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
                
                # Process the request with real scraping
                result = self.scrape_product(stock_code)
                
                # Log the request
                self.log_message(f"Doğuş için istek alındı: {supplier} - {stock_code}")
                
                # Log the response data being sent to web panel
                self.log_message(f"Webpanele gönderilen veri - Stok Kodu: {stock_code}, Fiyat: {result.get('price', 0)}, Stok: {result.get('stock', 0)}, Mevcut: {result.get('isAvailable', False)}")
                
                # Store in history
                self.request_history.append({
                    'timestamp': datetime.now().isoformat(),
                    'stock_code': stock_code,
                    'supplier': supplier,
                    'result': result
                })
                
                # Keep only last 100 requests
                if len(self.request_history) > 100:
                    self.request_history = self.request_history[-100:]
                
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
            response = jsonify({
                'success': True,
                'message': 'Doğuş Scraper Bot is running',
                'timestamp': datetime.now().isoformat(),
                'supplier': 'Doğuş',
                'port': self.port,
                'browser_ready': self.driver is not None,
                'logged_in': self.is_logged_in,
                'selenium_available': SELENIUM_AVAILABLE,
                'captcha_waiting': self.captcha_waiting,
                'captcha_resolved': self.captcha_resolved
            })
            response.headers['Content-Type'] = 'application/json'
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response
        
        @self.flask_app.route('/captcha-status', methods=['GET'])
        def captcha_status():
            """CAPTCHA durumunu döndür"""
            response = jsonify({
                'captcha_waiting': self.captcha_waiting,
                'captcha_resolved': self.captcha_resolved,
                'captcha_enabled': self.captcha_enabled,
                'timestamp': datetime.now().isoformat()
            })
            response.headers['Content-Type'] = 'application/json'
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response
        
        @self.flask_app.route('/continue-captcha', methods=['POST'])
        def continue_captcha():
            """CAPTCHA çözüldü olarak işaretle"""
            try:
                self.continue_after_captcha()
                response = jsonify({
                    'success': True,
                    'message': 'CAPTCHA marked as resolved',
                    'captcha_waiting': self.captcha_waiting,
                    'captcha_resolved': self.captcha_resolved
                })
                response.headers['Content-Type'] = 'application/json'
                response.headers['Access-Control-Allow-Origin'] = '*'
                return response
            except Exception as e:
                response = jsonify({
                    'success': False,
                    'error': str(e)
                })
                response.headers['Content-Type'] = 'application/json'
                response.headers['Access-Control-Allow-Origin'] = '*'
                return response, 500
    
    def setup_gui(self):
        """Setup the GUI interface"""
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Title
        title_label = ttk.Label(main_frame, text="Doğuş Scraper Bot", font=('Arial', 16, 'bold'))
        title_label.grid(row=0, column=0, columnspan=4, pady=(0, 20))
        
        # Status frame
        status_frame = ttk.LabelFrame(main_frame, text="Durum", padding="10")
        status_frame.grid(row=1, column=0, columnspan=4, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # Status labels
        self.status_label = ttk.Label(status_frame, text="Durduruluyor...", foreground="red")
        self.status_label.grid(row=0, column=0, sticky=tk.W)
        
        self.port_label = ttk.Label(status_frame, text=f"Port: {self.port}")
        self.port_label.grid(row=1, column=0, sticky=tk.W)
        
        self.selenium_label = ttk.Label(status_frame, 
                                       text=f"Selenium: {'Mevcut' if SELENIUM_AVAILABLE else 'Yok (Demo Mod)'}", 
                                       foreground="green" if SELENIUM_AVAILABLE else "orange")
        self.selenium_label.grid(row=2, column=0, sticky=tk.W)
        
        self.browser_label = ttk.Label(status_frame, text="Tarayıcı: Hazır Değil", foreground="red")
        self.browser_label.grid(row=3, column=0, sticky=tk.W)
        
        self.login_label = ttk.Label(status_frame, text="Giriş: Yapılmadı", foreground="red")
        self.login_label.grid(row=4, column=0, sticky=tk.W)
        
        self.captcha_status_label = ttk.Label(status_frame, text="🟢 CAPTCHA Hazır", foreground="green")
        self.captcha_status_label.grid(row=5, column=0, sticky=tk.W)
        
        self.requests_label = ttk.Label(status_frame, text="Toplam İstek: 0")
        self.requests_label.grid(row=6, column=0, sticky=tk.W)
        
        # Control buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=2, column=0, columnspan=4, pady=(0, 10))
        
        self.start_button = ttk.Button(button_frame, text="Başlat", command=self.start_server)
        self.start_button.grid(row=0, column=0, padx=(0, 5))
        
        self.stop_button = ttk.Button(button_frame, text="Durdur", command=self.stop_server, state="disabled")
        self.stop_button.grid(row=0, column=1, padx=(5, 0))
        
        if SELENIUM_AVAILABLE:
            self.browser_button = ttk.Button(button_frame, text="Tarayıcı Başlat", command=self.start_browser)
            self.browser_button.grid(row=0, column=2, padx=(5, 0))
            
            self.login_button = ttk.Button(button_frame, text="Giriş Yap", command=self.manual_login, state="disabled")
            self.login_button.grid(row=0, column=3, padx=(5, 0))
            
            self.captcha_continue_btn = ttk.Button(button_frame, text="CAPTCHA Devam", command=self.continue_after_captcha, state="disabled")
            self.captcha_continue_btn.grid(row=0, column=4, padx=(5, 0))
        
        # Log area
        log_frame = ttk.LabelFrame(main_frame, text="Loglar", padding="10")
        log_frame.grid(row=3, column=0, columnspan=4, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(10, 0))
        
        self.log_text = scrolledtext.ScrolledText(log_frame, height=25, width=100)
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)
        main_frame.rowconfigure(3, weight=1)
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        
        # Initial log message
        self.log_message("Doğuş Scraper Bot başlatıldı")
        self.log_message(f"Port: {self.port}")
        if not SELENIUM_AVAILABLE:
            self.log_message("Selenium kütüphaneleri bulunamadı. Demo mod aktif.", "WARNING")
            self.log_message("Gerçek scraping için: pip install undetected-chromedriver selenium", "INFO")
    
    def start_browser(self):
        """Start browser button handler"""
        if not SELENIUM_AVAILABLE:
            messagebox.showwarning("Uyarı", "Selenium kütüphaneleri yüklü değil!")
            return
            
        def browser_thread():
            if self.setup_browser():
                self.root.after(0, self.update_browser_status)
        
        threading.Thread(target=browser_thread, daemon=True).start()
    
    def manual_login(self):
        """Manual login button handler"""
        if not self.driver:
            messagebox.showwarning("Uyarı", "Önce tarayıcıyı başlatın!")
            return
            
        def login_thread():
            if self.login_to_dogus():
                self.root.after(0, self.update_login_status)
        
        threading.Thread(target=login_thread, daemon=True).start()
    
    def update_browser_status(self):
        """Update browser status in GUI"""
        if self.driver:
            self.browser_label.config(text="Tarayıcı: Hazır", foreground="green")
            if hasattr(self, 'login_button'):
                self.login_button.config(state="normal")
        else:
            self.browser_label.config(text="Tarayıcı: Hazır Değil", foreground="red")
            if hasattr(self, 'login_button'):
                self.login_button.config(state="disabled")
    
    def update_login_status(self):
        """Update login status in GUI"""
        if self.is_logged_in:
            self.login_label.config(text="Giriş: Başarılı", foreground="green")
        else:
            self.login_label.config(text="Giriş: Başarısız", foreground="red")
    
    def continue_after_captcha(self):
        """CAPTCHA çözüldükten sonra devam et"""
        if self.captcha_waiting:
            self.captcha_resolved = True
            self.captcha_waiting = False
            self.log_message("CAPTCHA çözüldü olarak işaretlendi, işleme devam ediliyor", "INFO")
            self.update_captcha_status()
    
    def update_captcha_status(self):
        """Update CAPTCHA status in GUI"""
        if hasattr(self, 'captcha_status_label'):
            if self.captcha_waiting:
                self.captcha_status_label.config(text="🔴 CAPTCHA Bekleniyor", foreground="red")
                if hasattr(self, 'captcha_continue_btn'):
                    self.captcha_continue_btn.config(state="normal")
            else:
                self.captcha_status_label.config(text="🟢 CAPTCHA Hazır", foreground="green")
                if hasattr(self, 'captcha_continue_btn'):
                    self.captcha_continue_btn.config(state="disabled")
    
    def handle_captcha_modal(self):
        """Handle CAPTCHA modal - Manuel mod"""
        try:
            # CAPTCHA modalı tespit et
            captcha_modal = WebDriverWait(self.driver, 3).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".ant-modal"))
            )
            self.log_message("CAPTCHA modalı tespit edildi - Manuel çözüm bekleniyor...", "WARNING")
            
            # CAPTCHA bekleme durumuna geç
            self.captcha_waiting = True
            self.captcha_resolved = False
            
            # GUI'de CAPTCHA durumunu güncelle
            if hasattr(self, 'root'):
                self.root.after(0, self.update_captcha_status)
            
            # Manuel çözüm bekle
            while self.captcha_waiting and not self.captcha_resolved:
                time.sleep(1)
                
                # CAPTCHA modalının kaybolup kaybolmadığını kontrol et
                try:
                    self.driver.find_element(By.CSS_SELECTOR, ".ant-modal")
                except NoSuchElementException:
                    # Modal kayboldu, CAPTCHA çözüldü
                    self.captcha_waiting = False
                    self.captcha_resolved = True
                    self.log_message("CAPTCHA manuel olarak çözüldü", "SUCCESS")
                    if hasattr(self, 'root'):
                        self.root.after(0, self.update_captcha_status)
                    return True
            
            if self.captcha_resolved:
                self.log_message("CAPTCHA çözüldü, işleme devam ediliyor", "SUCCESS")
                return True
            else:
                self.log_message("CAPTCHA çözülemedi", "ERROR")
                return False
                
        except TimeoutException:
            # CAPTCHA modalı yok
            return True
        except Exception as e:
            self.log_message(f"CAPTCHA işleme hatası: {str(e)}", "ERROR")
            return False
    
    def start_listening(self):
        """Start the Flask server in a separate thread"""
        def run_server():
            try:
                self.flask_app.run(host='0.0.0.0', port=self.port, debug=False, use_reloader=False)
            except Exception as e:
                self.log_message(f"Server başlatma hatası: {str(e)}", "ERROR")
        
        self.server_thread = threading.Thread(target=run_server, daemon=True)
        self.server_thread.start()
        self.is_running = True
        
        # Update GUI
        self.status_label.config(text="Çalışıyor", foreground="green")
        self.start_button.config(state="disabled")
        self.stop_button.config(state="normal")
        
        self.log_message(f"Doğuş Scraper Bot {self.port} portunda çalışmaya başladı")
    
    def start_server(self):
        """Start server button handler"""
        if not self.is_running:
            self.start_listening()
    
    def stop_server(self):
        """Stop server button handler"""
        self.is_running = False
        self.status_label.config(text="Durduruluyor...", foreground="red")
        self.start_button.config(state="normal")
        self.stop_button.config(state="disabled")
        self.log_message("Doğuş Scraper Bot durduruldu")
        
        # Close browser if open
        if self.driver:
            try:
                self.driver.quit()
                self.driver = None
                self.is_logged_in = False
                self.update_browser_status()
                self.update_login_status()
                self.log_message("Tarayıcı kapatıldı")
            except Exception as e:
                self.log_message(f"Tarayıcı kapatma hatası: {str(e)}", "ERROR")
    
    def log_message(self, message, level="INFO"):
        """Add a message to the log"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{level}] {message}\n"
        
        # Update GUI in main thread
        self.root.after(0, lambda: self._update_log(log_entry))
        
        # Update request counter
        if "istek alındı" in message.lower():
            self.root.after(0, self._update_request_counter)
    
    def _update_log(self, log_entry):
        """Update log text widget"""
        self.log_text.insert(tk.END, log_entry)
        self.log_text.see(tk.END)
    
    def _update_request_counter(self):
        """Update request counter"""
        count = len(self.request_history)
        self.requests_label.config(text=f"Toplam İstek: {count}")
    
    def run(self):
        """Start the GUI application"""
        try:
            self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
            self.root.mainloop()
        except KeyboardInterrupt:
            self.log_message("Uygulama kapatılıyor...")
            self.is_running = False
    
    def on_closing(self):
        """Handle application closing"""
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass
        self.root.destroy()

if __name__ == "__main__":
    app = DogusScraperBot()
    app.run()