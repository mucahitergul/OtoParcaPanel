#!/usr/bin/env python3
# dogus_excel_scraper.py  v5.9.7  (2025‑05‑05)

import os
import re
import sys
import gc
import base64
import shutil
import sqlite3
import tempfile
import unicodedata
from time import sleep
from logging import config as logging_config, getLogger

import pandas as pd
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    text = re.sub(r"\s+", "-", text)
    return re.sub(r"[^a-z0-9-]", "", text)


def read_key() -> str:
    try:
        import msvcrt
        while True:
            k = msvcrt.getch()
            if k in (b"\r", b"\n"):
                return "enter"
            if k == b"\x1b":
                return "esc"
    except ImportError:
        return "esc" if input().strip().lower() == "esc" else "enter"


def ask_int(prompt: str, default: int | None = None) -> int:
    while True:
        v = input(prompt).strip()
        if not v and default is not None:
            return default
        if v.isdigit():
            return int(v)
        print("Lütfen sayı girin.")


class CategoryDB:
    def __init__(self, path: str = "dogus.db") -> None:
        self.con = sqlite3.connect(path)
        self.con.row_factory = sqlite3.Row
        self.cur = self.con.cursor()

    def regex_rows(self):
        self.cur.execute("SELECT regex, name FROM categories")
        return self.cur.fetchall()

    def close(self) -> None:
        self.con.close()


class DogusBot:
    IMAGE_WAIT = 5
    OVERLAY_ID = "scrape-lock"

    def __init__(self) -> None:
        logging_config.dictConfig({
            "version": 1,
            "formatters": {"f": {"format": "[%(levelname)s] %(name)s: %(message)s"}},
            "handlers": {"h": {"class": "logging.StreamHandler", "formatter": "f"}},
            "root": {"handlers": ["h"], "level": "INFO"}
        })
        self.log = getLogger("Dogus")

        self.catdb = CategoryDB()
        self.regex_rows = self.catdb.regex_rows()

        os.makedirs("images", exist_ok=True)
        self.excel_path = "images/products.xlsx"
        self.processed_codes: set[str] = set()

        self._browser()

    def _browser(self) -> None:
        opt = uc.ChromeOptions()
        for a in ("--no-sandbox", "--disable-dev-shm-usage", "--ignore-certificate-errors"):
            opt.add_argument(a)
        opt.add_argument("--user-agent=Mozilla/5.0")
        opt.add_argument("--start-maximized")
        opt.add_argument("--disable-extensions")
        opt.add_argument("--disable-resizable")

        self.d = uc.Chrome(options=opt)
        screen_width = 1920 * 0.75
        screen_height = 1080 * 0.75
        self.d.set_window_size(screen_width, screen_height)
        self.wt = WebDriverWait(self.d, 10)

        self.d.execute_script("document.body.style.zoom='75%'")
        self.log.info("Chrome started")

    def _js_click(self, el) -> None:
        self.d.execute_script("arguments[0].click();", el)

    def _js_dblclick(self, el) -> None:
        self.d.execute_script(
            "arguments[0].dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));", el
        )

    def _block_user(self) -> None:
        self.d.execute_script(f"""
        if(!document.getElementById('{self.OVERLAY_ID}')){{
           let d=document.createElement('div');
           d.id='{self.OVERLAY_ID}';
           d.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;\
background:rgba(128,128,128,.35);z-index:2147483647;cursor:wait;';
           document.body.appendChild(d);
        }}""")

    def _unblock_user(self) -> None:
        self.d.execute_script(
            f"let e=document.getElementById('{self.OVERLAY_ID}'); if(e) e.remove();"
        )

    def login(self, code: str, user: str, pwd: str) -> None:
        self.d.get("https://online.dogusotoparcalari.com/web/login")
        sleep(2)
        self.wt.until(EC.element_to_be_clickable((By.NAME, "customercode"))).send_keys(code)
        self.d.find_element(By.NAME, "username").send_keys(user)
        self.d.find_element(By.NAME, "password").send_keys(pwd)
        self.d.find_element(By.CSS_SELECTOR, "button.loginBtn[type=submit]").click()

        try:
            WebDriverWait(self.d, 5).until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, "div.swal-text"))
            )
            print("\n⚠ Login yapılamadı. Manuel moda geçildi.")
            print("Tarayıcıda giriş yaptıktan sonra ENTER tuşuna basınız.")
            while read_key() != "enter":
                pass
            self.log.info("Manuel mod → Kullanıcı giriş yaptı ve devam etti.")
        except TimeoutException:
            self.log.info("Login başarılı.")

    def categories_for(self, name: str):
        hits = [r["name"] for r in self.regex_rows
                if r["regex"] and re.search(r["regex"], name, re.I)]
        hits += [None] * (3 - len(hits))
        return tuple(hits[:3])

    def capture_image(self, row, stock: str) -> str:
        try:
            self._js_click(row.find_element(By.CSS_SELECTOR, "img[id^='img-']"))
        except Exception:
            return ""
        sleep(self.IMAGE_WAIT)

        filename = ""
        try:
            src = self.d.find_element(By.CSS_SELECTOR, ".ant-modal-body img").get_attribute("src")
            if src.startswith("data:image"):
                ext = ".jpg" if "/jpeg" in src else ".png"
                filename = f"{slugify(stock)}{ext}"
                with open(os.path.join("images", filename), "wb") as f:
                    f.write(base64.b64decode(src.split(",", 1)[1]))
        finally:
            try:
                self._js_click(self.d.find_elements(By.CSS_SELECTOR, "button.ant-modal-close")[-1])
            except Exception:
                pass
            sleep(0.3)
        return f"images/{filename}" if filename else ""

    def scrape(self, total: int, start_row: int) -> None:
        table = self.wt.until(EC.presence_of_element_located((By.CSS_SELECTOR, "datatable-body")))
        self.d.execute_script("arguments[0].scrollTop = 0;", table)
        sleep(1)

        row_counter = -1
        collected_total = 0
        seen_rows = set()
        no_progress_count = 0

        try:
            while collected_total < total:
                rows = table.find_elements(By.CSS_SELECTOR, "datatable-body-row:not(.noStockText)")
                if not rows:
                    table.send_keys(Keys.PAGE_DOWN)
                    sleep(0.3)
                    continue

                new_seen = set(r.id for r in rows)
                if new_seen == seen_rows:
                    no_progress_count += 1
                    if no_progress_count > 3:
                        print(f"\n⚠ Tablodaki veriler bitti. {collected_total} veri çekildi.")
                        break
                else:
                    seen_rows = new_seen
                    no_progress_count = 0

                for r in rows:
                    if r.get_attribute("data-counted"):
                        continue
                    self.d.execute_script("arguments[0].setAttribute('data-counted','1');", r)

                    row_counter += 1
                    try:
                        stock = r.find_element(By.CSS_SELECTOR, "datatable-body-cell").text.strip()
                    except Exception:
                        continue

                    if row_counter < start_row or stock in self.processed_codes:
                        continue

                    cells = r.find_elements(By.CSS_SELECTOR, "datatable-body-cell")
                    price_raw = cells[12].text.strip().replace("₺", "").replace(".", "").replace(",", ".")
                    price = float(price_raw) if price_raw else 0.0
                    name = re.sub("Kampanyalı", "", cells[3].text, flags=re.I).strip()
                    brand = stock.split("-")[0].strip()

                    try:
                        self._js_dblclick(r.find_element(By.CSS_SELECTOR, ".product-name"))
                        oem_txt = self.wt.until(
                            EC.visibility_of_element_located((By.ID, "desc"))
                        ).text
                        oem = re.sub(r"OEM|:", "", oem_txt, flags=re.I).strip().replace("\n", " ")
                    except Exception:
                        oem = ""
                    finally:
                        try:
                            self._js_click(
                                self.d.find_element(
                                    By.CSS_SELECTOR,
                                    "button.cancel-btn,button[aria-label='Close']"
                                )
                            )
                        except Exception:
                            pass

                    img = self.capture_image(r, stock)
                    c1, c2, c3 = self.categories_for(name)

                    row_data = {
                        "Toptancı Adı": "dogus", "Toptancı Kodu": stock, "stockCode": stock,
                        "label": name, "brand": brand, "barcode": stock,
                        "mainCategory": "Tüm Markalar", "category": "Tüm Markalar",
                        "subCategory": c1,
                        "lowestCategory(Birden fazla olduğunda virgül ile ayırınız)":
                            ",".join(filter(None, (c1, c2, c3))),
                        "price1": price, "tax": 20, "currencyAbbr": None,
                        "stockAmount": 5, "stockType": "Adet", "picture1Path": img,
                        "desi": 5, "details": f"{name}<br>OEM<br>{oem}"
                    }

                    self.to_excel([row_data])
                    self.processed_codes.add(stock)
                    collected_total += 1

                    print(f"\rÜrün çekiliyor: {collected_total}", end="")

                    if collected_total >= total:
                        break

                table.send_keys(Keys.PAGE_DOWN)
                sleep(0.25)
        finally:
            gc.collect()
            print(f"\nToplam {collected_total} ürün kaydedildi.")

    def to_excel(self, rows: list[dict]) -> None:
        new_df = pd.DataFrame(rows)
        if os.path.exists(self.excel_path):
            while True:
                try:
                    old_df = pd.read_excel(self.excel_path)
                    break
                except PermissionError:
                    input("\n⚠ Excel açık → kapatıp ENTER…")
            df = pd.concat([old_df, new_df], ignore_index=True)\
                   .drop_duplicates(subset="Toptancı Kodu", keep="last")
        else:
            df = new_df

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx").name
        df.to_excel(tmp, index=False, engine="xlsxwriter")
        shutil.move(tmp, self.excel_path)

    def interactive_loop(self) -> None:
        while True:
            print("\nScraping için ENTER | Çıkış için ESC")
            if read_key() == "esc":
                self.log.info("Çıkış seçildi.")
                break

            total = ask_int("Kaç ürün toplansın?: ")
            start = ask_int("Kaçıncı satırdan başlansın? [1]: ", 1) - 1

            self._block_user()
            try:
                self.d.find_element(By.ID, "searchInput").send_keys(Keys.RETURN)
                self.scrape(total, start)
                print("\n✓ Parti tamam – ENTER ile yeni parti başlatabilirsiniz.")
            finally:
                self._unblock_user()

    def close(self) -> None:
        self._unblock_user()
        self.catdb.close()
        self.log.info("Kaynaklar serbest bırakıldı (Chrome açık).")


if __name__ == "__main__":
    bot = DogusBot()
    try:
        bot.login("120.06.02.011.00", "cihan", "Asus06")
        bot.interactive_loop()
    finally:
        bot.close()
