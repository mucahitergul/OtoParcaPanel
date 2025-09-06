#!/usr/bin/env python3
# dinamik_scraper.py - Dinamik Otoparca Scraper Bot

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

class DinamikScraperBot:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Dinamik Scraper Bot")
        self.root.geometry("900x700")
        self.root.resizable(True, True)
        
        # Load configuration
        self.config = self.load_config()
        
        # API Configuration
        self.port = 5001  # Dinamik için port 5001
        self.is_running = False
        self.current_request = None
        self.last_request = None
        self.request_history = []
        
        # Selenium Configuration
        self.driver = None
        self.wait = None
        self.is_logged_in = False
        self.login_credentials = {
            'customercode': 'DA063599',
            'username': 'cihan2',
            'password': 'asus06'
        }
        
        # CAPTCHA Configuration
        self.captcha_detected = False
        self.captcha_waiting = False
        self.captcha_solved = False
        self.captcha_code = ""
        self.captcha_image_url = ""
        self.captcha_window = None
        
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
    
    def login_to_dinamik(self):
        """Login to Dinamik website"""
        if not self.driver:
            self.log_message("Tarayıcı başlatılmamış", "ERROR")
            return False
            
        try:
            self.log_message("Dinamik sitesine giriş yapılıyor...")
            
            # Navigate to login page
            self.driver.get("https://bayi.adaoto.com.tr/web/login")
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
            
            # Check for login errors
            try:
                WebDriverWait(self.driver, 5).until(
                    EC.visibility_of_element_located((By.CSS_SELECTOR, "div.swal-text"))
                )
                self.log_message("Giriş başarısız! Manuel giriş gerekiyor.", "ERROR")
                self.is_logged_in = False
                return False
            except TimeoutException:
                self.log_message("Dinamik sitesine başarıyla giriş yapıldı")
                self.is_logged_in = True
                return True
                
        except Exception as e:
            self.log_message(f"Giriş hatası: {str(e)}", "ERROR")
            self.is_logged_in = False
            return False
    
    def check_for_captcha(self):
        """Check if CAPTCHA modal is present"""
        try:
            # Check for CAPTCHA modal based on bot.txt structure
            captcha_modal = self.driver.find_elements(
                By.CSS_SELECTOR, "div.ant-modal[role='document']"
            )
            
            if captcha_modal:
                # Check for security verification title
                title_elements = self.driver.find_elements(
                    By.XPATH, "//div[contains(text(), '🔐 Güvenlik Doğrulaması')]"
                )
                
                if title_elements:
                    self.log_message("CAPTCHA algılandı! Güvenlik doğrulaması gerekiyor.", "WARNING")
                    
                    # Get CAPTCHA image URL
                    try:
                        captcha_img = self.driver.find_element(
                            By.CSS_SELECTOR, "app-recaptcha-content img"
                        )
                        self.captcha_image_url = captcha_img.get_attribute("src")
                        self.log_message(f"CAPTCHA resmi bulundu: {self.captcha_image_url}", "DEBUG")
                    except:
                        self.log_message("CAPTCHA resmi bulunamadı", "WARNING")
                    
                    self.captcha_detected = True
                    return True
            
            return False
            
        except Exception as e:
            self.log_message(f"CAPTCHA kontrol hatası: {str(e)}", "ERROR")
            return False
    
    def wait_for_captcha_solution(self):
        """Wait for user to solve CAPTCHA"""
        self.captcha_waiting = True
        self.captcha_solved = False
        
        # Show CAPTCHA window
        self.root.after(0, self.show_captcha_window)
        
        # Wait for solution
        while self.captcha_waiting and not self.captcha_solved:
            time.sleep(0.5)
        
        if self.captcha_solved:
            self.log_message("CAPTCHA çözüldü, işlem devam ediyor...", "INFO")
            return True
        else:
            self.log_message("CAPTCHA çözülemedi veya iptal edildi", "ERROR")
            return False
    
    def solve_captcha(self, captcha_code):
        """Submit CAPTCHA solution"""
        try:
            # Find CAPTCHA input field
            captcha_input = self.driver.find_element(
                By.CSS_SELECTOR, "app-recaptcha-content input.form-control"
            )
            
            # Clear and enter CAPTCHA code
            captcha_input.clear()
            captcha_input.send_keys(captcha_code)
            
            # Find and click submit button
            submit_button = self.driver.find_element(
                By.CSS_SELECTOR, "app-recaptcha-content button.btn-primary"
            )
            submit_button.click()
            
            # Wait for modal to disappear
            time.sleep(2)
            
            # Check if CAPTCHA modal is gone
            if not self.check_for_captcha():
                self.captcha_detected = False
                self.captcha_solved = True
                self.log_message("CAPTCHA başarıyla çözüldü!", "INFO")
                return True
            else:
                self.log_message("CAPTCHA kodu yanlış, tekrar deneyin", "WARNING")
                return False
                
        except Exception as e:
            self.log_message(f"CAPTCHA çözme hatası: {str(e)}", "ERROR")
            return False
    
    def search_product(self, stock_code):
        """Search for a product by stock code"""
        if not self.driver or not self.is_logged_in:
            self.log_message("Tarayıcı veya giriş hazır değil", "ERROR")
            return False
            
        try:
            self.log_message(f"Ürün aranıyor: {stock_code}")
            
            # Check for CAPTCHA before searching
            if self.check_for_captcha():
                if not self.wait_for_captcha_solution():
                    return False
            
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
            
            # Wait for results and check for CAPTCHA again
            time.sleep(3)
            
            # Check for CAPTCHA after search
            if self.check_for_captcha():
                if not self.wait_for_captcha_solution():
                    return False
            
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
            
            # Check for CAPTCHA before extracting data
            if self.check_for_captcha():
                if not self.wait_for_captcha_solution():
                    return {
                        'success': False,
                        'stockCode': stock_code,
                        'supplier': 'dinamik',
                        'error': 'CAPTCHA çözülemedi',
                        'requiresManualIntervention': True,
                        'timestamp': datetime.now().isoformat(),
                        'source': 'Dinamik Real Scraper'
                    }
            
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
                    'success': True,
                    'stockCode': stock_code,
                    'supplier': 'dinamik',
                    'price': 0,
                    'stock': 0,
                    'isAvailable': False,
                    'foundAtSupplier': False,
                    'timestamp': datetime.now().isoformat(),
                    'source': 'Dinamik Real Scraper'
                }
            
            # Get first row data
            first_row = rows[0]
            cells = first_row.find_elements(By.CSS_SELECTOR, "datatable-body-cell")
            
            # Extract stock code from first cell
            found_stock_code = cells[0].text.strip()
            
            # Extract product name from 3rd cell (index 2)
            product_name = cells[2].text.strip()
            
            # Extract price from KDV'li Maliyet column (index 15)
            price_text = cells[15].text.strip().replace("₺", "").replace(".", "").replace(",", ".")
            try:
                price = float(price_text) if price_text else 0.0
            except ValueError:
                price = 0.0
            
            # Extract stock from warehouse columns (indices 5-10: 06 ADM, 38, 42, Kaporta, Fırsat, Tedarik)
            total_stock = 0
            warehouse_columns = [5, 6, 7, 8, 9, 10]  # 06 ADM, 38, 42, Kaporta, Fırsat, Tedarik
            
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
                'supplier': 'dinamik',
                'price': round(price, 2),
                'stock': total_stock,
                'isAvailable': is_available,
                'foundAtSupplier': True,
                'timestamp': datetime.now().isoformat(),
                'source': 'Dinamik Real Scraper'
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
            return self.generate_demo_data(stock_code, 'dinamik')
            
        try:
            # Check if browser is ready
            if not self.driver or not self.is_logged_in:
                if not self.setup_browser():
                    raise Exception("Tarayıcı başlatılamadı")
                
                if not self.login_to_dinamik():
                    raise Exception("Giriş yapılamadı")
            
            # Search for product
            if not self.search_product(stock_code):
                raise Exception("Ürün araması başarısız")
            
            # Extract product data
            result = self.extract_product_data(stock_code)
            
            return result
            
        except Exception as e:
            self.log_message(f"Scraping hatası: {str(e)}", "ERROR")
            return {
                'success': False,
                'stockCode': stock_code,
                'supplier': 'dogus',
                'error': str(e),
                'timestamp': datetime.now().isoformat(),
                'source': 'Doğuş Real Scraper'
            }
    
    def generate_demo_data(self, stock_code, supplier):
        """Generate demo data for testing when Selenium is not available"""
        # Simulate processing time
        time.sleep(random.uniform(0.5, 2.0))
        
        # Generate realistic demo data for Dinamik
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
            'source': 'Dinamik Demo Scraper (Selenium Yok)'
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
                self.log_message(f"Dinamik için istek alındı: {supplier} - {stock_code}")
                
                # Log the response data being sent to web panel
                if result.get('success'):
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
                'message': 'Dinamik Scraper Bot is running',
                'timestamp': datetime.now().isoformat(),
                'supplier': 'Dinamik',
                'port': self.port,
                'browser_ready': self.driver is not None,
                'logged_in': self.is_logged_in,
                'selenium_available': SELENIUM_AVAILABLE
            })
            response.headers['Content-Type'] = 'application/json'
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response
    
    def show_captcha_window(self):
        """Show CAPTCHA solving window"""
        if self.captcha_window:
            self.captcha_window.destroy()
        
        self.captcha_window = tk.Toplevel(self.root)
        self.captcha_window.title("🔐 CAPTCHA Doğrulaması")
        self.captcha_window.geometry("500x400")
        self.captcha_window.resizable(False, False)
        self.captcha_window.grab_set()  # Modal window
        
        # Center the window
        self.captcha_window.transient(self.root)
        
        # Main frame
        main_frame = ttk.Frame(self.captcha_window, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Title
        title_label = ttk.Label(main_frame, text="🔐 Güvenlik Doğrulaması Gerekli", 
                               font=('Arial', 14, 'bold'), foreground="red")
        title_label.pack(pady=(0, 20))
        
        # Info text
        info_text = "Dinamik web sitesi bot koruması algıladı.\nLütfen tarayıcıda CAPTCHA kodunu girin ve devam edin."
        info_label = ttk.Label(main_frame, text=info_text, justify=tk.CENTER)
        info_label.pack(pady=(0, 20))
        
        # CAPTCHA image info
        if self.captcha_image_url:
            url_label = ttk.Label(main_frame, text=f"CAPTCHA Resmi: {self.captcha_image_url[:50]}...", 
                                 font=('Arial', 8))
            url_label.pack(pady=(0, 10))
        
        # Instructions
        instructions = "1. Tarayıcıda CAPTCHA kodunu girin\n2. 'Onayla' butonuna tıklayın\n3. Aşağıdaki 'Devam Et' butonuna tıklayın"
        instructions_label = ttk.Label(main_frame, text=instructions, justify=tk.LEFT)
        instructions_label.pack(pady=(0, 20))
        
        # CAPTCHA code entry (optional manual entry)
        code_frame = ttk.LabelFrame(main_frame, text="Manuel Kod Girişi (Opsiyonel)", padding="10")
        code_frame.pack(fill=tk.X, pady=(0, 20))
        
        self.captcha_entry = ttk.Entry(code_frame, font=('Arial', 12))
        self.captcha_entry.pack(fill=tk.X, pady=(0, 10))
        
        manual_submit_btn = ttk.Button(code_frame, text="Manuel Kodu Gönder", 
                                      command=self.submit_manual_captcha)
        manual_submit_btn.pack()
        
        # Buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, pady=(20, 0))
        
        continue_btn = ttk.Button(button_frame, text="✅ Devam Et (CAPTCHA Çözüldü)", 
                                 command=self.continue_after_captcha, style="Accent.TButton")
        continue_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        cancel_btn = ttk.Button(button_frame, text="❌ İptal Et", 
                               command=self.cancel_captcha)
        cancel_btn.pack(side=tk.RIGHT)
        
        # Status label
        self.captcha_status_label = ttk.Label(main_frame, text="CAPTCHA bekleniyor...", 
                                             foreground="orange")
        self.captcha_status_label.pack(pady=(10, 0))
        
        # Focus on entry
        self.captcha_entry.focus()
    
    def submit_manual_captcha(self):
        """Submit manually entered CAPTCHA code"""
        captcha_code = self.captcha_entry.get().strip()
        if not captcha_code:
            self.captcha_status_label.config(text="Lütfen CAPTCHA kodunu girin!", foreground="red")
            return
        
        self.captcha_status_label.config(text="CAPTCHA kodu gönderiliyor...", foreground="blue")
        
        # Submit CAPTCHA in separate thread
        def submit_thread():
            success = self.solve_captcha(captcha_code)
            if success:
                self.root.after(0, lambda: self.captcha_status_label.config(
                    text="✅ CAPTCHA başarıyla çözüldü!", foreground="green"))
                self.continue_after_captcha()
            else:
                self.root.after(0, lambda: self.captcha_status_label.config(
                    text="❌ CAPTCHA kodu yanlış, tekrar deneyin", foreground="red"))
        
        threading.Thread(target=submit_thread, daemon=True).start()
    
    def continue_after_captcha(self):
        """Continue after CAPTCHA is solved"""
        self.captcha_solved = True
        self.captcha_waiting = False
        if self.captcha_window:
            self.captcha_window.destroy()
            self.captcha_window = None
        self.log_message("Kullanıcı CAPTCHA çözümünü onayladı, işlem devam ediyor...", "INFO")
        
        # Reset CAPTCHA status after a delay
        def reset_captcha():
            time.sleep(5)
            self.captcha_detected = False
            self.captcha_solved = False
            self.root.after(0, self._update_captcha_status)
        
        threading.Thread(target=reset_captcha, daemon=True).start()
    
    def cancel_captcha(self):
        """Cancel CAPTCHA solving"""
        self.captcha_solved = False
        self.captcha_waiting = False
        if self.captcha_window:
            self.captcha_window.destroy()
            self.captcha_window = None
        self.log_message("CAPTCHA çözümü iptal edildi", "WARNING")
    
    def setup_gui(self):
        """Setup the GUI interface"""
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Title
        title_label = ttk.Label(main_frame, text="Dinamik Scraper Bot", font=('Arial', 16, 'bold'))
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
        
        self.requests_label = ttk.Label(status_frame, text="Toplam İstek: 0")
        self.requests_label.grid(row=5, column=0, sticky=tk.W)
        
        # CAPTCHA status
        self.captcha_status_main = ttk.Label(status_frame, text="CAPTCHA: Hazır", foreground="green")
        self.captcha_status_main.grid(row=6, column=0, sticky=tk.W)
        
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
        self.log_message("Dinamik Scraper Bot başlatıldı")
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
            if self.login_to_dinamik():
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
        
        self.log_message(f"Dinamik Scraper Bot {self.port} portunda çalışmaya başladı")
    
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
        self.log_message("Dinamik Scraper Bot durduruldu")
        
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
        
        # Update CAPTCHA status
        if "captcha" in message.lower():
            self.root.after(0, self._update_captcha_status)
    
    def _update_log(self, log_entry):
        """Update log text widget"""
        self.log_text.insert(tk.END, log_entry)
        self.log_text.see(tk.END)
    
    def _update_request_counter(self):
        """Update request counter"""
        count = len(self.request_history)
        self.requests_label.config(text=f"Toplam İstek: {count}")
    
    def _update_captcha_status(self):
        """Update CAPTCHA status in main GUI"""
        if self.captcha_detected and self.captcha_waiting:
            self.captcha_status_main.config(text="CAPTCHA: Bekleniyor ⚠️", foreground="orange")
        elif self.captcha_detected and not self.captcha_waiting:
            self.captcha_status_main.config(text="CAPTCHA: Çözülüyor 🔄", foreground="blue")
        elif self.captcha_solved:
            self.captcha_status_main.config(text="CAPTCHA: Çözüldü ✅", foreground="green")
        else:
            self.captcha_status_main.config(text="CAPTCHA: Hazır", foreground="green")
    
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
    app = DinamikScraperBot()
    app.run()